#!/usr/bin/env bash
# Interactive Bash setup - no hardcoded values
# Run inside: founders-fund-app/

set -euo pipefail

echo "=== Interactive Database Setup ==="
echo ""

# Prompt for database connection details
read -p "DB user: " USER
read -p "DB host (e.g., ep-xyz.aws.neon.tech): " HOST
read -p "DB name: " DB

echo ""
read -p "Are you using Supabase? (y/N): " SUPABASE_CHOICE
USE_SUPABASE=false
if [[ "$SUPABASE_CHOICE" =~ ^[yY] ]]; then
    USE_SUPABASE=true
fi

echo ""
read -s -p "DB password: " PASS
echo ""

# URL-encode user and password using Python
encUser=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$USER'))")
encPass=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PASS'))")

# Build DATABASE_URL
export DATABASE_URL="postgresql://${encUser}:${encPass}@${HOST}:5432/${DB}?sslmode=require"

# Add Supabase pooling if selected
if [ "$USE_SUPABASE" = true ]; then
    export DATABASE_URL="${DATABASE_URL}&pgbouncer=true&connection_limit=1"
    echo "Added Supabase pooling configuration"
fi

# Sanity print (password masked)
echo ""
echo "DATABASE_URL configured: ${DATABASE_URL/${encPass}/***}"
echo ""

echo "Ready to deploy migration. Commands to run next:"
echo "  npx prisma migrate deploy"
echo "  npx prisma migrate status"
echo ""
echo "Save this DATABASE_URL for Vercel environment variables!"
read -p "Press Enter to continue with migration deployment..."

# Deploy migration
npx prisma migrate deploy
npx prisma migrate status

# Clear sensitive data
unset DATABASE_URL PASS