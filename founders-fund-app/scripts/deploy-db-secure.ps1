# Secure PowerShell script - prompts for password, no secrets stored on disk
param(
  [Parameter(Mandatory=$true)] [string]$User,
  [Parameter(Mandatory=$true)] [string]$Host,
  [Parameter(Mandatory=$true)] [string]$Db,
  [Parameter(Mandatory=$false)] [switch]$Supabase
)

Write-Host "=== Secure Database Migration Deployment ===" -ForegroundColor Green
Write-Host "User: $User"
Write-Host "Host: $Host"
Write-Host "Database: $Db"
Write-Host ""

# Prompt for password securely (won't echo to screen)
$SecurePass = Read-Host "DB password" -AsSecureString
$Ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePass)
$PlainPass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Ptr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Ptr)

# URL-encode user and password to handle special characters
$encUser = [uri]::EscapeDataString($User)
$encPass = [uri]::EscapeDataString($PlainPass)

# Build DATABASE_URL with proper encoding
$env:DATABASE_URL = "postgresql://$encUser`:$encPass@$Host:5432/$Db?sslmode=require"

# Add Supabase pooling if requested
if ($Supabase) {
    $env:DATABASE_URL = "$($env:DATABASE_URL)&pgbouncer=true&connection_limit=1"
    Write-Host "Added Supabase pooling configuration" -ForegroundColor Yellow
}

# Show masked URL for verification
Write-Host ""
Write-Host "DATABASE_URL configured: $($env:DATABASE_URL -replace $encPass,'***')" -ForegroundColor Green
Write-Host ""

# Deploy migration
Write-Host "Deploying migration..." -ForegroundColor Yellow
npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration deployment failed!" -ForegroundColor Red
    $env:DATABASE_URL = $null  # Clear sensitive data
    exit 1
}

Write-Host ""
Write-Host "Checking migration status..." -ForegroundColor Yellow
npx prisma migrate status

Write-Host ""
Write-Host "Migration deployment complete!" -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "1. Set the same DATABASE_URL in Vercel environment variables"
Write-Host "2. Deploy your application to production"
Write-Host "3. Run smoke tests"

# Clear sensitive environment variable
$env:DATABASE_URL = $null