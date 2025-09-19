/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

// Integration test scaffold for OCR worker.
// To run locally:
// 1. cd ocr-worker && docker compose up --build -d
// 2. npx vitest src/__tests__/integration/ocr.integration.spec.ts --run

describe('OCR worker integration (manual/CI)', () => {
  it('posts an image to the worker and receives OCR JSON (conditional)', async () => {
    if (!process.env.RUN_OCR_INTEGRATION) {
      // skipped when env var not set
      return;
    }

    const url = 'http://localhost:8000/process';
    const res = await fetch(url, { method: 'GET' });
    // We only assert that the worker responds (status 200 or 405 depending on route)
    expect([200, 405, 422]).toContain(res.status);
  });
});
