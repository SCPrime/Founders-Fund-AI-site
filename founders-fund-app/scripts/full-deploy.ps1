# Full deployment script - handles DB migration and Vercel deployment
param(
  [Parameter(Mandatory=$true)] [string]$User,
  [Parameter(Mandatory=$true)] [string]$Pass,
  [Parameter(Mandatory=$true)] [string]$Host,
  [Parameter(Mandatory=$true)] [string]$Db,
  [Parameter(Mandatory=$false)] [string]$OpenAIKey = "",
  [Parameter(Mandatory=$false)] [switch]$SkipBuild
)

Write-Host "=== Founders Fund AI Site - Full Production Deployment ===" -ForegroundColor Green
Write-Host ""

# Step 1: Set up database connection
Write-Host "Step 1: Setting up database connection..." -ForegroundColor Yellow
$encUser = [uri]::EscapeDataString($User)
$encPass = [uri]::EscapeDataString($Pass)
$env:DATABASE_URL = "postgresql://$encUser`:$encPass@$Host:5432/$Db?sslmode=require"
Write-Host "DATABASE_URL configured for: $Host/$Db" -ForegroundColor Green

# Step 2: Deploy database migration
Write-Host ""
Write-Host "Step 2: Deploying database migration..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration failed! Check your database connection." -ForegroundColor Red
    exit 1
}

npx prisma migrate status
Write-Host "Migration deployed successfully!" -ForegroundColor Green

# Step 3: Build the application
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "Step 3: Building application..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build completed successfully!" -ForegroundColor Green
}

# Step 4: Deploy to Vercel
Write-Host ""
Write-Host "Step 4: Deploying to Vercel..." -ForegroundColor Yellow
npx vercel deploy --prebuilt --prod
if ($LASTEXITCODE -ne 0) {
    Write-Host "Vercel deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Set environment variables in Vercel dashboard:"
Write-Host "   - DATABASE_URL (same as used here)"
if ($OpenAIKey -ne "") {
    Write-Host "   - OPENAI_API_KEY=$OpenAIKey"
} else {
    Write-Host "   - OPENAI_API_KEY=sk-your-key-here"
}
Write-Host "2. Run smoke tests on your production domain"
Write-Host "3. Check Vercel function logs for any issues"