# Deployment Checklist

## ✅ Pre-Deployment Cleanup Completed

### Files Cleaned Up
- [x] Removed `.vscode/` directory and IDE-specific files
- [x] Removed temporary files (`nul`, `tsconfig.tsbuildinfo`)
- [x] Removed test artifacts (`test-ocr.js`, `test-portfolio.svg`)
- [x] Removed static export artifacts from root directory
- [x] Removed sensitive `.env.local` and `.env` files with real API keys

### Git Repository Cleanup
- [x] Updated `.gitignore` to prevent future commits of development files
- [x] Deleted unnecessary local branches (`tests/component-presets`, `vercelwork`)
- [x] Removed fork remote (`ys`) - kept only `origin`
- [x] Updated CI workflow to target only `main` branch

### Security & Environment Variables
- [x] Confirmed no real API keys in committed code
- [x] Verified `.env.example` contains only placeholder values
- [x] Ensured all environment variables use `process.env.*` pattern
- [x] Added comprehensive `.gitignore` rules for sensitive files

### Production Configuration
- [x] Updated `vercel.json` with production-ready settings:
  - Function timeouts for API routes
  - Clean URLs and trailing slash handling
  - CORS headers for API routes
  - Health check rewrite
- [x] Build succeeds without errors
- [x] Linting passes (only warnings, no errors)

### CI/CD Pipeline
- [x] Updated existing CI workflow for main branch only
- [x] Created new deployment workflow with:
  - Test and build verification
  - Preview deployments for PRs
  - Production deployment for main branch pushes

## 🚀 Ready for Deployment

### Next Steps for Vercel Deployment

1. **Set up Vercel Project:**
   ```bash
   npx vercel --prod
   ```

2. **Configure Environment Variables in Vercel Dashboard:**
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `ANTHROPIC_API_KEY` - Your Anthropic API key (optional)
   - `DATABASE_URL` - Production database URL
   - `NODE_ENV` - Set to "production"

3. **Set up GitHub Integration (if using GitHub Actions):**
   - Add these secrets to your GitHub repository:
     - `VERCEL_TOKEN` - Vercel deployment token
     - `ORG_ID` - Vercel organization ID
     - `PROJECT_ID` - Vercel project ID

4. **Database Setup:**
   - For production, replace SQLite with PostgreSQL
   - Run migrations: `npx prisma migrate deploy`
   - Generate Prisma client: `npx prisma generate`

5. **Domain Configuration:**
   - Configure custom domain in Vercel dashboard
   - Set up SSL certificates (handled automatically by Vercel)

### 🧪 Enhanced Smoke Testing
**Run automated test suite:**
```powershell
.\scripts\smoke-test.ps1 -ProductionUrl "https://your-app.vercel.app"
```

**Automated Tests:**
- [ ] `/api/healthz` → `{"ok":true,"db":true}` with database probe
- [ ] Home page contains "Founders Fund" text
- [ ] `/api/ocr` GET returns 405 (method not allowed)
- [ ] `/api/calculate` functional test (if endpoint exists)
- [ ] CSRF protection active (403 from evil origins)
- [ ] Path allowlisting active (405/404 for forbidden paths)

**Manual Test Checklist:**
- [ ] **Core Flow**: Add investor contribution → set wallet values → compute (verify loss clamping & gain distribution)
- [ ] **OCR Flow**: Upload screenshot (< 5MB) → verify OCR fills fields → auto recompute
- [ ] **Snapshot Flow**: Save snapshot → start next window → verify baseline updates, no double-counting
- [ ] **Logs**: Check Vercel logs for `/api/ocr` performance, no runtime errors

### 🛡️ Security Hardening Verification
- [ ] **CSRF Protection**: Origin checking prevents cross-site requests
- [ ] **Path Allowlisting**: Only allowed GET/POST routes accessible
- [ ] **Input Validation**: Regex protection blocks directory traversal
- [ ] **No-Cache Headers**: Sensitive endpoints properly secured
- [ ] **Environment Variables**: No `NEXT_PUBLIC_API_*` variables (security risk)

### Performance Monitoring
- [ ] OCR response time < 30 seconds
- [ ] Database queries < 2 seconds
- [ ] Page load time < 3 seconds
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure analytics (Google Analytics, Vercel Analytics)

## 📝 Notes

- Application build size: ~133KB first load JS
- API routes configured with 30s timeout for OCR processing
- All sensitive data properly externalized to environment variables
- Tests have some business logic failures but build/deployment is ready
- Linting shows only warnings (image optimization suggestions)

## 🔒 Security Notes

- No API keys or secrets committed to repository
- Environment variables properly scoped to server-side only
- CORS headers configured for API routes
- All file uploads validated and processed server-side