# Interactive PowerShell setup - no hardcoded values
# Run inside: founders-fund-app\

Write-Host "=== Interactive Database Setup ===" -ForegroundColor Green
Write-Host ""

# Prompt for database connection details
$User = Read-Host "DB user"
$Host = Read-Host "DB host (e.g., ep-xyz.aws.neon.tech)"
$Db = Read-Host "DB name"

Write-Host ""
$SupabaseChoice = Read-Host "Are you using Supabase? (y/N)"
$UseSupabase = $SupabaseChoice -match "^[yY]"

Write-Host ""
# Prompt for password securely (won't echo)
$SecurePass = Read-Host "DB password" -AsSecureString
$Ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePass)
$PlainPass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Ptr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Ptr)

# URL-encode user/pass
$encUser = [uri]::EscapeDataString($User)
$encPass = [uri]::EscapeDataString($PlainPass)

# Build DATABASE_URL
$env:DATABASE_URL = "postgresql://$encUser`:$encPass@$Host:5432/$Db?sslmode=require"

# Add Supabase pooling if selected
if ($UseSupabase) {
    $env:DATABASE_URL = "$($env:DATABASE_URL)&pgbouncer=true&connection_limit=1"
    Write-Host "Added Supabase pooling configuration" -ForegroundColor Yellow
}

# Sanity print (password masked)
Write-Host ""
Write-Host "DATABASE_URL configured: $($env:DATABASE_URL -replace $encPass,'***')" -ForegroundColor Green
Write-Host ""

Write-Host "Ready to deploy migration. Commands to run next:"
Write-Host "  npx prisma migrate deploy" -ForegroundColor Cyan
Write-Host "  npx prisma migrate status" -ForegroundColor Cyan
Write-Host ""
Write-Host "Save this DATABASE_URL for Vercel environment variables!"
Write-Host "Press Enter to continue with migration deployment..."
Read-Host

# Deploy migration
npx prisma migrate deploy
npx prisma migrate status

# Clear sensitive data
$env:DATABASE_URL = $null