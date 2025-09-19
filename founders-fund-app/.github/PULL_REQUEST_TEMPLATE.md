Summary of changes
- Adds tests for Founders/Investors tables and OCR route
- Adds OCR worker docker-compose for local integration testing
- Reworks OCR server route dynamic imports and types

Checklist
- [ ] All tests pass locally
- [ ] Integration test for ocr-worker validated locally (if applicable)
- [ ] Dependencies updated and security audit run

Notes for reviewers
- The OCR route now dynamically imports optional native modules; see `src/app/api/ocr/route.ts`.
- Integration test is marked skipped by default; run the ocr-worker via Docker Compose to enable it.
