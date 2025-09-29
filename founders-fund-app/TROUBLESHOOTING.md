# 🚨 Production Troubleshooting Guide

## Quick Fixes for Common Issues

### Database Connectivity
**Error:** `P1001: Can't reach database server`
**Likely Causes:**
- Bad `DATABASE_URL` (typo, whitespace, wrong host/port)
- Missing `?sslmode=require`
- Password not URL‑encoded (`@ : / ? & #` break the URL)
**Fix:**
1) Rebuild a safe URL (URL‑encode user/pass).
2) Ensure `?sslmode=require`.
3) Re‑export locally, then `npx prisma migrate deploy` and `npx prisma migrate status`.

**Error:** `password authentication failed for user`
- User/pass wrong or hitting a wrong database. Check Neon roles and DB name.

**Error:** `relation "X" does not exist`
- Migration not applied to this database. Run `npx prisma migrate deploy` against the correct `DATABASE_URL`.

### Prisma / Decimal / JSON
**Symptom:** Decimal fields appear as strings in API JSON
- Expected behavior. Convert at API boundary: `Number(d.toString())` before `res.json()`.

**Error:** `PrismaClientKnownRequestError` after deploy
- Migrations out of sync with generated client. Run `npx prisma generate` locally; ensure CI uses the same schema (build writes `prisma generate` first).

### OpenAI / OCR
**Error:** `401 Unauthorized`
- `OPENAI_API_KEY` missing in **Production** scope on Vercel. Add key, redeploy.

**Symptom:** OCR timeouts / 504
- Large images or cold starts. Keep images < 5MB.
- **Pages Router:** increase `vercel.json` `functions` timeout for `pages/api/ocr.ts`.
- **App Router:** set `export const runtime = 'nodejs'` (function timeouts in `vercel.json` do not apply). Consider Vercel Pro if persist.

### Runtime / Build
**Symptom:** Works locally, fails on Vercel
- Node mismatch: lock `"engines": {"node":"22.x"}` (done).
- Env var only set in Preview, not Production → set both.
- Using SQLite on Vercel (ephemeral FS) → switch to Postgres (done).

### Verification Commands
```bash
# Confirm tables exist
npx prisma migrate status
# Open Prisma Studio (local only)
npx prisma studio
# Check runtime health
curl -fsS https://<prod>/healthz | jq
```

### Rollback
Vercel → Deployments → pick previous → Promote to Production.

Tag releases in git for traceability.

---

## 🔭 What happens after migration?

1) **Set Vercel envs** (Preview + Production)
2) **Prebuild & deploy** (CLI)
3) **Run smoke tests** (`scripts/smoke-test.ps1 -ProductionUrl ...`)
4) **Manual checklist** (contributions, compute, OCR, snapshot → next window)
5) **Monitor logs** for `/api/ocr` and any DB errors

---

## Bottom line

- You're cleared to run **Step 1** **now** using the secure script.
- Then **Step 2–5** as listed in your workflow.
- If any command throws an error, paste the **exact error text** (never the secrets) and I'll give you a surgical fix.