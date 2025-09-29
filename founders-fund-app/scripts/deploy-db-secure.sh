#!/usr/bin/env bash
# Secure Bash script - prompts for password, no secrets stored on disk
set -euo pipefail

# Check for required parameters
if [ $# -lt 3 ]; then
    echo "Usage: $0 <USER> <HOST> <DB> [--supabase]"
    echo "Example: $0 myuser host.neon.tech mydb"
    echo "         $0 myuser host.supabase.co mydb --supabase"
    exit 1
fi

USER="$1"
HOST="$2"
DB="$3"
SUPABASE_POOLING=false

# Check for Supabase flag
if [ $# -ge 4 ] && [ "$4" = "--supabase" ]; then
    SUPABASE_POOLING=true
fi

echo "=== Secure Database Migration Deployment ==="
echo "User: $USER"
echo "Host: $HOST"
echo "Database: $DB"
echo ""

# Prompt for password securely (won't echo to screen)
read -s -p "DB password: " PASS
echo ""

# URL-encode user and password using Python
encUser=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$USER'))")
encPass=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PASS'))")

# Build DATABASE_URL with proper encoding
export DATABASE_URL="postgresql://${encUser}:${encPass}@${HOST}:5432/${DB}?sslmode=require"

# Add Supabase pooling if requested
if [ "$SUPABASE_POOLING" = true ]; then
    export DATABASE_URL="${DATABASE_URL}&pgbouncer=true&connection_limit=1"
    echo "Added Supabase pooling configuration"
fi

# Show masked URL for verification
echo ""
echo "DATABASE_URL configured: ${DATABASE_URL/${encPass}/***}"
echo ""

# Deploy migration
echo "Deploying migration..."
npx prisma migrate deploy

echo ""
echo "Checking migration status..."
npx prisma migrate status

echo ""
echo "Migration deployment complete!"
echo "Next steps:"
echo "1. Set the same DATABASE_URL in Vercel environment variables"
echo "2. Deploy your application to production"
echo "3. Run smoke tests"

# Clear sensitive data
unset DATABASE_URL PASS