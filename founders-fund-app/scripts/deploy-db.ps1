param(
  [Parameter(Mandatory=$true)] [string]$User,
  [Parameter(Mandatory=$true)] [string]$Pass,
  [Parameter(Mandatory=$true)] [string]$Host,
  [Parameter(Mandatory=$true)] [string]$Db
)

# URL-encode user and password to handle special characters
$encUser = [uri]::EscapeDataString($User)
$encPass = [uri]::EscapeDataString($Pass)

# Construct the DATABASE_URL with proper encoding
$env:DATABASE_URL = "postgresql://$encUser`:$encPass@$Host:5432/$Db?sslmode=require"

Write-Host "DATABASE_URL set to: $($env:DATABASE_URL -replace $encPass,'***')"
Write-Host ""

Write-Host "Deploying migration..."
npx prisma migrate deploy

Write-Host ""
Write-Host "Checking migration status..."
npx prisma migrate status