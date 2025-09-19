import { NextResponse, type NextRequest } from 'next/server';

// This route accepts multipart/form-data with a single file field named `file`.
// It will attempt to call Google Cloud Vision if the environment is configured.

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
        // dynamic import, narrow to minimal local type
        const visionModule = (await import('@google-cloud/vision')) as unknown;
        const Vision = (visionModule as any)?.ImageAnnotatorClient;
        if (!Vision) throw new Error('Vision client not available');

        let client: any;
        if (process.env.GOOGLE_VISION_KEY_JSON) {
          try {
            const creds = JSON.parse(process.env.GOOGLE_VISION_KEY_JSON as string);
            client = new Vision({ credentials: creds } as any);
          } catch (parseErr) {
            console.error('Failed to parse GOOGLE_VISION_KEY_JSON', parseErr);
            return NextResponse.json({ error: 'Invalid GOOGLE_VISION_KEY_JSON' }, { status: 500 });
          }
        } else {
          client = new Vision();
        }

        const arrayBuffer = await file.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer as ArrayBuffer);

        try {
          const sharpModule = (await import('sharp')) as unknown;
          const sharpFn = (sharpModule as any)?.default ?? (sharpModule as any);
          if (typeof sharpFn === 'function') {
            buffer = await sharpFn(buffer)
              .grayscale()
              .normalize()
              .sharpen()
              .trim()
              .resize({ width: 2400, withoutEnlargement: true })
              .threshold(180)
              .toFormat('png')
              .toBuffer();
          }
        } catch (sharpErr) {
          console.warn('Sharp preprocessing not available or failed:', String(sharpErr));
        }

        const [result] = await client.textDetection({ image: { content: buffer } });
        const detections = (result && result.textAnnotations) || [];
        const text = detections.length > 0 ? detections[0].description : '';
        return NextResponse.json({ text });
      } catch (err) {
        console.error('Vision call failed:', err);
        return NextResponse.json({ error: 'Vision service failed', detail: String(err) }, { status: 502 });
      }
    }

    return NextResponse.json(
      {
        error:
          'No OCR provider configured. To enable server-side OCR, set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_VISION_KEY_JSON and install @google-cloud/vision on the server.',
      },
      { status: 501 },
    );
  } catch (err) {
    console.error('OCR route error', err);
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 });
  }
}
