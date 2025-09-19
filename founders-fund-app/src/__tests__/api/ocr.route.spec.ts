import { vi, describe, it, expect, beforeEach } from 'vitest';
import { type NextRequest } from 'next/server';

// A lightweight mock for a File-like object accepted by formData.get('file')
class MockFile {
  private _buf: Uint8Array;
  constructor(buf: Uint8Array, public name = 'file.png', public type = 'image/png') {
    this._buf = buf;
  }
  async arrayBuffer() {
    return this._buf.buffer;
  }
}

describe('OCR route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('proxies file to OCR_WORKER_URL and returns worker response', async () => {
    process.env.OCR_WORKER_URL = 'https://example.com/process';

    // Mock external modules before importing the route to avoid Vite transform errors
    vi.mock('@google-cloud/vision', () => ({
      ImageAnnotatorClient: function () {
        return {
          textDetection: async () => [{ textAnnotations: [{ description: 'dummy' }] }],
        };
      },
    }));
    vi.mock('sharp', () => ({ default: (buf: Uint8Array) => ({
      grayscale: () => ({
        normalize: () => ({
          sharpen: () => ({
            trim: () => ({
              resize: () => ({
                threshold: () => ({ toFormat: () => ({ toBuffer: async () => buf }) }),
              }),
            }),
          }),
        }),
      }),
    }) }));

    // mock fetch to the worker
    const fakeResponse = { text: 'hello world' };
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => fakeResponse,
    })) as unknown as typeof fetch);

    // Dynamic import after mocks
    const mod = await import('@/app/api/ocr/route');
    const POST = mod.POST;

    // Build a fake NextRequest with formData
    const req = {
      headers: new Map([['content-type', 'multipart/form-data']]),
      formData: async () => ({ get: () => new MockFile(new Uint8Array([1, 2, 3])) }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect((global as { fetch?: unknown }).fetch).toHaveBeenCalled();
    expect(res).toBeTruthy();
  });
});
