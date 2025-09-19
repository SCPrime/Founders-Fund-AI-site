# OCR Worker

Small FastAPI service that preprocesses images (deskew, auto-crop, denoise, contrast) and returns a processed PNG plus recognized text.

Endpoints
- POST /process — multipart upload field `file` => returns JSON { text, processed_png_base64 }

Local run

```bash
python -m pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Docker (recommended for reproducible builds):

```bash
docker build -t ocr-worker:latest .
docker run -p 8000:8000 ocr-worker:latest
```

Deploy to Cloud Run or similar and set `OCR_WORKER_URL` in the Next.js app to point to the worker's `/process` endpoint.

Notes
- The worker will call Google Vision if the environment has credentials. Otherwise, it will attempt to use Tesseract (`pytesseract`) as a fallback.
- For production accuracy, ensure Google Vision credentials are available to the worker and/or the Next.js backend.
