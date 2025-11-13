# 🚀 DEPLOY NOW - Quick Start Guide

## ⚡ Fast Deployment (5 Minutes)

### Step 1: Database Migration (2 min)
```powershell
cd founders-fund-app
.\scripts\deploy-db-secure.ps1 -User "your_user" -Host "ep-xxx.neon.tech" -Db "your_db"
```

### Step 2: Set Environment Variables in Vercel (1 min)
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add:
- `DATABASE_URL` (Production)
- `OPENAI_API_KEY` (Production)
- `NEXTAUTH_SECRET` (Production)
- `NEXTAUTH_URL` (Production - your Vercel domain)

### Step 3: Deploy (2 min)
```bash
cd founders-fund-app
npx vercel link
npx vercel pull --yes --environment=production
npm run build
npx vercel deploy --prebuilt --prod
```

### Step 4: Verify (1 min)
```bash
# Health check
curl https://your-domain.vercel.app/api/healthz

# Should return: {"ok":true,"db":true}
```

## ✅ That's It!

Your production deployment is live. See `DEPLOYMENT_SUMMARY.md` for detailed monitoring and troubleshooting.

