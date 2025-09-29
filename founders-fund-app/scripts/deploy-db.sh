#!/usr/bin/env bash
set -euo pipefail

# Check if all required parameters are provided
if [ $# -ne 4 ]; then
    echo "Usage: $0 <USER> <PASS> <HOST> <DB>"
    echo "Example: $0 myuser 'my!pass@word' host.neon.tech mydb"
    exit 1
fi

USER="$1"
PASS="$2"
HOST="$3"
DB="$4"

# URL-encode user and password using Python
encUser=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$USER'))")
encPass=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PASS'))")

# Construct the DATABASE_URL with proper encoding
export DATABASE_URL="postgresql://${encUser}:${encPass}@${HOST}:5432/${DB}?sslmode=require"

echo "DATABASE_URL set to: ${DATABASE_URL/${encPass}/***}"
echo ""

echo "Deploying migration..."
npx prisma migrate deploy

echo ""
echo "Checking migration status..."
npx prisma migrate status