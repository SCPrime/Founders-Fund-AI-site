# Deploying OCR Worker

Two common deploy options are Cloud Run (recommended) or Docker registry + your cloud provider.

1) Build and push image (GitHub Actions will also build on push to main/vercelwork):

Local build & push (example using gcloud):

```powershell
cd ocr-worker
docker build -t gcr.io/YOUR_PROJECT/ocr-worker:latest .
docker push gcr.io/YOUR_PROJECT/ocr-worker:latest
```

2) Deploy to Cloud Run:

```powershell
gcloud run deploy ocr-worker --image gcr.io/YOUR_PROJECT/ocr-worker:latest --platform managed --region us-central1 --allow-unauthenticated
```

3) Set `OCR_WORKER_URL` in Next.js (Vercel):
- Go to Vercel project settings -> Environment Variables
- Add `OCR_WORKER_URL` with the worker's endpoint, e.g. `https://ocr-worker-xxxxx-uc.a.run.app/process`

4) Ensure credentials are provided to the worker (if it will call Google Vision):
- Add `GOOGLE_VISION_KEY_JSON` or configure `GOOGLE_APPLICATION_CREDENTIALS` in the worker's environment (Cloud Run supports mounting secrets).
