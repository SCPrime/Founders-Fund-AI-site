from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
import cv2
from PIL import Image
import io
import base64
import os

try:
    from google.cloud import vision
    VISION_AVAILABLE = True
except Exception:
    VISION_AVAILABLE = False

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except Exception:
    TESSERACT_AVAILABLE = False

app = FastAPI(title="OCR Worker")


def read_imagefile(file) -> np.ndarray:
    image = Image.open(io.BytesIO(file))
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)


def preprocess_image_cv(img: np.ndarray) -> bytes:
    # Convert to gray
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Use bilateral filter to denoise while keeping edges
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)

    # Adaptive threshold to binarize
    thresh = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # Find largest contour and perform perspective transform (auto-crop)
    contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        for c in contours[:5]:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                pts = approx.reshape(4, 2)
                # order pts tl, tr, br, bl
                rect = np.zeros((4, 2), dtype='float32')
                s = pts.sum(axis=1)
                rect[0] = pts[np.argmin(s)]
                rect[2] = pts[np.argmax(s)]
                diff = np.diff(pts, axis=1)
                rect[1] = pts[np.argmin(diff)]
                rect[3] = pts[np.argmax(diff)]

                (tl, tr, br, bl) = rect
                widthA = np.linalg.norm(br - bl)
                widthB = np.linalg.norm(tr - tl)
                maxWidth = max(int(widthA), int(widthB))

                heightA = np.linalg.norm(tr - br)
                heightB = np.linalg.norm(tl - bl)
                maxHeight = max(int(heightA), int(heightB))

                dst = np.array([
                    [0, 0],
                    [maxWidth - 1, 0],
                    [maxWidth - 1, maxHeight - 1],
                    [0, maxHeight - 1],
                ], dtype='float32')

                M = cv2.getPerspectiveTransform(rect, dst)
                warped = cv2.warpPerspective(gray, M, (maxWidth, maxHeight))
                gray = warped
                break

    # CLAHE for contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Final adaptive threshold
    final = cv2.adaptiveThreshold(
        enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # encode to PNG bytes
    success, encoded = cv2.imencode('.png', final)
    if not success:
        raise RuntimeError('Failed to encode processed image')
    return encoded.tobytes()


@app.post('/process')
async def process_image(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        img = read_imagefile(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Invalid image: {e}')

    processed_bytes = preprocess_image_cv(img)

    # If Vision is available and credentials present, call it
    text = ''
    if VISION_AVAILABLE and os.getenv('GOOGLE_VISION_KEY_JSON') or os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
        try:
            client = vision.ImageAnnotatorClient()
            response = client.text_detection({'image': {'content': processed_bytes}})
            annotations = response.text_annotations
            if annotations:
                text = annotations[0].description
        except Exception as e:
            # log and fallback
            print('Vision call failed:', e)

    if not text and TESSERACT_AVAILABLE:
        try:
            pil = Image.open(io.BytesIO(processed_bytes))
            text = pytesseract.image_to_string(pil)
        except Exception as e:
            print('Tesseract failed:', e)

    result = {'text': text or '', 'processed_png_base64': base64.b64encode(processed_bytes).decode('ascii')}
    return JSONResponse(content=result)
