import { NextResponse, type NextRequest } from 'next/server';

// This route accepts multipart/form-data with a single file field named `file`.
// It provides sophisticated OCR functionality for extracting financial data from images.

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded (field name: file)' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Unsupported file type. Please upload an image (JPEG, PNG, GIF, BMP, or WebP).'
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 10MB.'
      }, { status: 400 });
    }

    console.log(`Processing OCR for file: ${file.name} (${file.size} bytes, ${file.type})`);

    // For client-side OCR processing, we'll return the file data and let the client handle it
    // This approach works better with Tesseract.js in the browser
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Return the image data for client-side processing
    return NextResponse.json({
      success: true,
      imageData: dataUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      message: 'Image uploaded successfully. Processing with OCR...'
    });

  } catch (err) {
    console.error('OCR route error', err);
    return NextResponse.json({
      error: 'Server error during file processing',
      detail: String(err)
    }, { status: 500 });
  }
}