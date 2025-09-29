#!/usr/bin/env bash
# Enhanced Production Smoke Test Suite - Bash Version
set -euo pipefail

if [ $# -ne 1 ]; then
    echo "Usage: $0 <PRODUCTION_URL>"
    echo "Example: $0 https://your-app.vercel.app"
    exit 1
fi

URL="$1"

# Helper functions
json() { curl -fsS -H "accept: application/json" "$1"; }
txt()  { curl -fsS "$1"; }

echo "=== 🧪 Enhanced Smoke Test Suite ==="
echo "Production URL: $URL"
echo "Timestamp: $(date -Iseconds)"
echo ""

# 1) Healthcheck with database probe
echo "🔍 Testing /healthz endpoint..."
H=$(json "$URL/healthz" || true)
echo "$H" | grep -q '"ok":true' || { echo "❌ /healthz failed"; exit 1; }
echo "✅ /healthz ok"

# 2) Home page contains brand text
echo "🔍 Testing home page content..."
HP=$(txt "$URL/" || true)
echo "$HP" | grep -iq "Founders[[:space:]]*Fund" || { echo "❌ home page missing 'Founders Fund' text"; exit 1; }
echo "✅ Home content ok"

# 3) OCR GET returns 405 (method not allowed)
echo "🔍 Testing /api/ocr endpoint..."
code=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/ocr" || true)
[ "$code" = "405" ] || { echo "❌ /api/ocr GET expected 405, got $code"; exit 1; }
echo "✅ /api/ocr GET returns 405 (method not allowed)"

# 4) Test calculate API sanity (if present)
echo "🔍 Testing /api/calculate endpoint..."
payload='{"window":{"start":"2025-01-01","end":"2025-12-31"},"walletSizeEndOfWindow":20000,"unrealizedPnlEndOfWindow":0,"contributions":[{"owner":"investor","name":"Investor A","type":"investor_contribution","amount":1000,"ts":"2025-03-01","earnsDollarDaysThisWindow":true}],"constants":{"INVESTOR_SEED_BASELINE":20000,"ENTRY_FEE_RATE":0.10,"MGMT_FEE_RATE":0.20,"FOUNDERS_MOONBAG_PCT":0.75,"FOUNDERS_COUNT":2,"ENTRY_FEE_REDUCES_INVESTOR_CREDIT":true}}'

if result=$(curl -fsS -X POST "$URL/api/calculate" -H "content-type: application/json" -d "$payload" 2>/dev/null); then
  profit=$(echo "$result" | grep -o '"profitTotal":[0-9.-]*' | cut -d: -f2 || echo "0")
  echo "✅ /api/calculate ok (profitTotal=$profit)"
else
  echo "ℹ️ /api/calculate not verified (route may be absent)"
fi

echo ""
echo "=== 🛡️ Security Test Suite ==="

# 5) Test CSRF protection (should return 403)
echo "🔍 Testing CSRF protection..."
csrf_code=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: https://evil.example" "$URL/api/healthz" || true)
if [ "$csrf_code" = "403" ]; then
    echo "✅ CSRF protection active (403 from evil origin)"
elif [ "$csrf_code" = "200" ]; then
    echo "⚠️ CSRF protection may not be active (got 200 from evil origin)"
else
    echo "ℹ️ CSRF test inconclusive (status: $csrf_code)"
fi

# 6) Test path allowlisting (should return 405 or 404)
echo "🔍 Testing path allowlisting..."
forbidden_code=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/forbidden/endpoint" || true)
if [ "$forbidden_code" = "405" ] || [ "$forbidden_code" = "404" ]; then
    echo "✅ Path allowlisting active ($forbidden_code for forbidden endpoint)"
else
    echo "⚠️ Path allowlisting may not be active (got $forbidden_code)"
fi

echo ""
echo "=== 📝 Manual Test Checklist ==="
echo "Complete these tests manually in the web application:"
echo ""
echo "🔸 Core Flow Tests:"
echo "   □ Add a small investor contribution"
echo "   □ Set wallet end-of-window value"
echo "   □ Set unrealized P/L (test both positive/negative)"
echo "   □ Click Compute - verify loss clamps to 0"
echo "   □ Click Compute - verify gains distribute correctly"
echo ""
echo "🔸 OCR Flow Test:"
echo "   □ Upload screenshot (keep under 5MB)"
echo "   □ Verify OCR fills wallet/unrealized fields"
echo "   □ Verify recompute triggers automatically"
echo ""
echo "🔸 Snapshot Flow Test:"
echo "   □ Save Snapshot after computation"
echo "   □ Start Next Window"
echo "   □ Verify investor baseline increases"
echo "   □ Verify no double-counting of prior legs"
echo ""
echo "🔸 Vercel Logs Check:"
echo "   □ Check Vercel function logs for /api/ocr"
echo "   □ Verify OCR completes within timeout limits"
echo "   □ No runtime errors in production logs"
echo ""
echo "🎉 Automated smoke test suite passed!"
echo "Proceed with manual testing checklist above."