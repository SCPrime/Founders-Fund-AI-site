/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from 'next/server';

// This route accepts multipart/form-data with a single file field named `file`.
// It will attempt to call Google Cloud Vision if the environment is configured.

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    // Parse the multipart body using the built-in body() to get raw arrayBuffer.
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded (field name: file)' }, { status: 400 });
    }

    // If Google Cloud Vision is available, use it. Otherwise return helpful message.
    // If an external OCR worker is configured, forward the upload to it for robust preprocessing.
    if (process.env.OCR_WORKER_URL) {
      try {
        const workerUrl = process.env.OCR_WORKER_URL;
        const form = new FormData();
        form.append('file', file);

        const res = await fetch(workerUrl.endsWith('/process') ? workerUrl : `${workerUrl.replace(/\/$/, '')}/process`, {
          method: 'POST',
          body: form,
        });
        const json = await res.json();
        return NextResponse.json(json, { status: res.status });
      } catch (workerErr) {
        console.error('OCR worker proxy failed', workerErr);
        return NextResponse.json({ error: 'OCR worker proxy failed', detail: String(workerErr) }, { status: 502 });
      }
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_VISION_KEY_JSON) {
      try {
        // Dynamically import so local dev doesn't require the package unless used in prod
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const vision = await import('@google-cloud/vision');

        let client: any;
        if (process.env.GOOGLE_VISION_KEY_JSON) {
          // If the JSON key is provided directly, parse it and pass as credentials.
          try {
            const creds = JSON.parse(process.env.GOOGLE_VISION_KEY_JSON as string);
            client = new vision.ImageAnnotatorClient({ credentials: creds });
          } catch (parseErr) {
            console.error('Failed to parse GOOGLE_VISION_KEY_JSON', parseErr);
            return NextResponse.json({ error: 'Invalid GOOGLE_VISION_KEY_JSON' }, { status: 500 });
          }
        } else {
          // Default behavior: rely on GOOGLE_APPLICATION_CREDENTIALS env var pointing to a file on disk.
          client = new vision.ImageAnnotatorClient();
        }

        const arrayBuffer = await file.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);

        // Attempt server-side preprocessing with sharp if available
        try {
          const sharp = await import('sharp');
          // Convert to grayscale, normalize contrast, trim borders, and resize for better OCR
          buffer = await sharp.default(buffer)
            .grayscale()
            .normalize()
            .sharpen()
            .trim()
            .resize({ width: 2400, withoutEnlargement: true })
            .threshold(180)
            .toFormat('png')
            .toBuffer();
        } catch (sharpErr) {
          // If sharp is not installed or preprocessing fails, fall back to raw buffer
          console.warn('Sharp preprocessing not available or failed:', sharpErr?.message || sharpErr);
        }

        const [result] = await client.textDetection({ image: { content: buffer } });
        const detections = result.textAnnotations || [];
        const text = detections.length > 0 ? detections[0].description : '';

        return NextResponse.json({ text });
      } catch (err: any) {
        console.error('Vision call failed:', (err as any)?.message || err);
        return NextResponse.json({ error: 'Vision service failed', detail: (err as any)?.message || String(err) }, { status: 502 });
      }
    }

    return NextResponse.json(
      {
        error:
          'No OCR provider configured. To enable server-side OCR, set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_VISION_KEY_JSON with your service account, and install @google-cloud/vision on the server.',
      },
      { status: 501 },
    );
    } catch (err: any) {
      console.error('OCR route error', (err as any)?.message || err);
      return NextResponse.json({ error: 'Server error', detail: (err as any)?.message || String(err) }, { status: 500 });
    }
}
