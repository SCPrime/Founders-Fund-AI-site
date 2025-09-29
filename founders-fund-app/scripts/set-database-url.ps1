# PowerShell script to safely construct DATABASE_URL with special characters
# Usage: Edit the four values below, then run this script

# === EDIT THESE FOUR VALUES ONLY ===
$USER = "db_user"
$PASS = "db_password_with!weird@chars"
$HOST = "your-host.aws.neon.tech"
$DB   = "your_dbname"

# URL-encode only user/pass
$encUser = [uri]::EscapeDataString($USER)
$encPass = [uri]::EscapeDataString($PASS)

$env:DATABASE_URL = "postgresql://$encUser`:$encPass@$HOST:5432/$DB?sslmode=require"

# For Supabase (recommended pooling) - uncomment if using Supabase:
# $env:DATABASE_URL = "$($env:DATABASE_URL)&pgbouncer=true&connection_limit=1"

# Show (sanity check): prints masked host/db, not the password
Write-Host "DATABASE_URL set to: $($env:DATABASE_URL -replace $encPass,'***')"
Write-Host ""
Write-Host "Now you can run:"
Write-Host "  npx prisma migrate deploy"
Write-Host "  npx prisma migrate status"