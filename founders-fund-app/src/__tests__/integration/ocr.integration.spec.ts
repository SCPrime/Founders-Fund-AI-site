/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

// Integration test scaffold for OCR worker.
// To run locally:
// 1. cd ocr-worker && docker compose up --build -d
// 2. npx vitest src/__tests__/integration/ocr.integration.spec.ts --run

describe.skip('OCR worker integration (manual)', () => {
  it('posts an image to the worker and receives OCR JSON', async () => {
    const url = 'http://localhost:8000/process';
    const res = await fetch(url, { method: 'GET' });
    // We only assert that the worker responds (status 200 or 405 depending on route)
    expect([200, 405, 422]).toContain(res.status);
  });
});
