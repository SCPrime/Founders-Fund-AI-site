#!/bin/bash
# Bash script to safely construct DATABASE_URL with special characters
# Usage: Edit the four values below, then run: source ./scripts/set-database-url.sh

# === EDIT THESE FOUR VALUES ONLY ===
USER="db_user"
PASS="db_password_with!weird@chars"
HOST="your-host.aws.neon.tech"
DB="your_dbname"

# URL-encode user/pass using Python
encUser=$(python3 -c "import urllib.parse, os; print(urllib.parse.quote('$USER'))")
encPass=$(python3 -c "import urllib.parse, os; print(urllib.parse.quote('$PASS'))")

export DATABASE_URL="postgresql://${encUser}:${encPass}@${HOST}:5432/${DB}?sslmode=require"

# For Supabase pooling - uncomment if using Supabase:
# export DATABASE_URL="${DATABASE_URL}&pgbouncer=true&connection_limit=1"

# Show (sanity check): prints masked host/db, not the password
echo "DATABASE_URL set to: ${DATABASE_URL/${encPass}/***}"
echo ""
echo "Now you can run:"
echo "  npx prisma migrate deploy"
echo "  npx prisma migrate status"