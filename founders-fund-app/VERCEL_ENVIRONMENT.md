# 🚀 Vercel Environment Variables Configuration

## Required Environment Variables

### Production & Preview Environments

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**:

#### Database Configuration
```bash
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"
```
- **Scope**: Production + Preview
- **Note**: Use separate databases for Production vs Preview
- **For Supabase**: Add `&pgbouncer=true&connection_limit=1`

#### AI/OCR Configuration
```bash
OPENAI_API_KEY="sk-proj-..."
```
- **Scope**: Production + Preview
- **Required for**: OCR text extraction and AI analysis

### Optional Environment Variables

#### Debug & Development
```bash
NEXT_PUBLIC_SHOW_DEBUG="0"
RUN_OCR_INTEGRATION="0"
```
- **Scope**: All environments
- **Purpose**: Disable debug features in production

#### Authentication (if using NextAuth)
```bash
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="https://your-domain.vercel.app"
```

#### Custom Domain Configuration
```bash
PUBLIC_SITE_ORIGIN="https://your-custom-domain.com"
```

## Security Hardening Environment Variables

### Server-Side Only Variables
These should **NOT** have `NEXT_PUBLIC_` prefix:

```bash
# Backend API configuration
BACKEND_API_BASE_URL="https://your-render-app.onrender.com"
API_TOKEN="your-secure-api-token"
```

### Remove These (Security Risk)
❌ **Delete these if they exist**:
```bash
NEXT_PUBLIC_API_BASE_URL="..."     # Exposes backend URL
NEXT_PUBLIC_API_TOKEN="..."        # Exposes API token
```

## Environment-Specific Setup

### Production Database
- Use production PostgreSQL database (Neon, Supabase, etc.)
- Ensure connection pooling is enabled
- Set appropriate connection limits

### Preview Database
- Use separate database for Preview deployments
- Prevents test data contaminating Production
- Can use same provider with different database name

### Local Development
Create `.env.local`:
```bash
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-proj-..."
NEXT_PUBLIC_SHOW_DEBUG="1"
RUN_OCR_INTEGRATION="1"
```

## Verification Commands

### Check Environment Variables via CLI
```bash
# List all environment variables for production
npx vercel env ls

# Add new environment variable
npx vercel env add DATABASE_URL production
```

### Test via Healthcheck Endpoint
```bash
curl https://your-app.vercel.app/api/healthz
# Should return: {"ok":true,"db":true,"ts":"..."}
```

## Common Issues & Fixes

### Database Connection Issues
```bash
# Error: P1001 Can't reach database
# Fix: Ensure DATABASE_URL includes ?sslmode=require and is URL-encoded
```

### Missing API Key
```bash
# Error: OpenAI 401 Unauthorized
# Fix: Set OPENAI_API_KEY in Vercel Dashboard for Production scope
```

### Environment Variable Not Loading
```bash
# Issue: Variable shows as undefined in production
# Fix: Ensure variable is set for correct environment scope
# Redeploy after adding environment variables
```

## Security Checklist

- ✅ Database credentials are URL-encoded
- ✅ No sensitive data in `NEXT_PUBLIC_` variables
- ✅ API tokens are server-side only
- ✅ Separate databases for Production/Preview
- ✅ Environment variables scoped correctly
- ✅ No credentials committed to git

## Deployment Flow

1. **Set environment variables** in Vercel Dashboard
2. **Link project**: `npx vercel link`
3. **Pull configuration**: `npx vercel pull --yes --environment=production`
4. **Build locally**: `npm run build`
5. **Deploy prebuilt**: `npx vercel deploy --prebuilt --prod`

This ensures the exact build artifact is deployed without surprise rebuilds.