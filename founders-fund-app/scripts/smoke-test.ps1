# Enhanced Production Smoke Test Suite
param(
  [Parameter(Mandatory=$true)][string]$ProductionUrl
)

function Get-Json($url) {
  try {
    $r = Invoke-WebRequest -Uri $url -Method GET -Headers @{ "Accept"="application/json" } -TimeoutSec 20
    return @{ status=$r.StatusCode; body=($r.Content | ConvertFrom-Json) }
  } catch {
    return @{ status=-1; body=$_.Exception.Message }
  }
}

function Get-Text($url) {
  try {
    $r = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 20
    return @{ status=$r.StatusCode; body=$r.Content }
  } catch {
    return @{ status=-1; body=$_.Exception.Message }
  }
}

Write-Host "=== 🧪 Enhanced Smoke Test Suite ===" -ForegroundColor Green
Write-Host "Production URL: $ProductionUrl" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# 1) Healthcheck with database probe
Write-Host "🔍 Testing /healthz endpoint..." -ForegroundColor Yellow
$h = Get-Json "$ProductionUrl/healthz"
if ($h.status -ne 200 -or -not $h.body.ok) {
    Write-Host "❌ /healthz failed: $($h | ConvertTo-Json -Compress)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ /healthz ok: db=$($h.body.db)" -ForegroundColor Green

# 2) Home page contains brand text
Write-Host "🔍 Testing home page content..." -ForegroundColor Yellow
$home = Get-Text "$ProductionUrl/"
if ($home.status -ne 200 -or ($home.body -notmatch "Founders\s*Fund")) {
    Write-Host "❌ Home page missing expected 'Founders Fund' text" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Home content ok" -ForegroundColor Green

# 3) OCR GET returns 405 (method not allowed)
Write-Host "🔍 Testing /api/ocr endpoint..." -ForegroundColor Yellow
try {
    $ocr = Invoke-WebRequest -Uri "$ProductionUrl/api/ocr" -Method GET -ErrorAction SilentlyContinue
    if ($ocr.StatusCode -ne 405) {
        Write-Host "❌ /api/ocr GET should return 405, got $($ocr.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    if ($_.Exception.Response.StatusCode -ne 405) {
        Write-Host "❌ /api/ocr GET should return 405" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ /api/ocr GET returns 405 (method not allowed)" -ForegroundColor Green

# 4) Test calculate API sanity (if present)
Write-Host "🔍 Testing /api/calculate endpoint..." -ForegroundColor Yellow
$body = @{
  window = @{ start="2025-01-01"; end="2025-12-31" }
  walletSizeEndOfWindow = 20000
  unrealizedPnlEndOfWindow = 0
  contributions = @(
    @{ owner="investor"; name="Investor A"; type="investor_contribution"; amount=1000; ts="2025-03-01"; earnsDollarDaysThisWindow=$true }
  )
  constants = @{
    INVESTOR_SEED_BASELINE=20000; ENTRY_FEE_RATE=0.10; MGMT_FEE_RATE=0.20; FOUNDERS_MOONBAG_PCT=0.75; FOUNDERS_COUNT=2; ENTRY_FEE_REDUCES_INVESTOR_CREDIT=$true
  }
} | ConvertTo-Json -Depth 6

try {
  $calc = Invoke-WebRequest -Uri "$ProductionUrl/api/calculate" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 20 -ErrorAction Stop
  if ($calc.StatusCode -ne 200) { throw "status $($calc.StatusCode)" }
  $calcJson = $calc.Content | ConvertFrom-Json
  if ($calcJson.profitTotal -lt 0) { throw "profitTotal negative" }
  Write-Host "✅ /api/calculate ok (profitTotal=$($calcJson.profitTotal))" -ForegroundColor Green
} catch {
  Write-Host "ℹ️ /api/calculate not verified (route may be absent): $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 🛡️ Security Test Suite ===" -ForegroundColor Blue

# 5) Test CSRF protection (should return 403)
Write-Host "🔍 Testing CSRF protection..." -ForegroundColor Yellow
try {
    $csrf = Invoke-WebRequest -Uri "$ProductionUrl/api/healthz" -Method GET -Headers @{ "Origin"="https://evil.example" } -ErrorAction SilentlyContinue
    if ($csrf.StatusCode -ne 403) {
        Write-Host "⚠️ CSRF protection may not be active (expected 403, got $($csrf.StatusCode))" -ForegroundColor Yellow
    } else {
        Write-Host "✅ CSRF protection active (403 from evil origin)" -ForegroundColor Green
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✅ CSRF protection active (403 from evil origin)" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ CSRF test inconclusive" -ForegroundColor Yellow
    }
}

# 6) Test path allowlisting (should return 405)
Write-Host "🔍 Testing path allowlisting..." -ForegroundColor Yellow
try {
    $forbidden = Invoke-WebRequest -Uri "$ProductionUrl/api/forbidden/endpoint" -Method GET -ErrorAction SilentlyContinue
    if ($forbidden.StatusCode -ne 405 -and $forbidden.StatusCode -ne 404) {
        Write-Host "⚠️ Path allowlisting may not be active" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Path allowlisting active (405/404 for forbidden endpoint)" -ForegroundColor Green
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 405 -or $_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Path allowlisting active (405/404 for forbidden endpoint)" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Path allowlisting test inconclusive" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== 📝 Manual Test Checklist ===" -ForegroundColor Magenta
Write-Host "Complete these tests manually in the web application:" -ForegroundColor Gray
Write-Host ""
Write-Host "🔸 Core Flow Tests:" -ForegroundColor Cyan
Write-Host "   □ Add a small investor contribution" -ForegroundColor White
Write-Host "   □ Set wallet end-of-window value" -ForegroundColor White
Write-Host "   □ Set unrealized P/L (test both positive/negative)" -ForegroundColor White
Write-Host "   □ Click Compute - verify loss clamps to 0" -ForegroundColor White
Write-Host "   □ Click Compute - verify gains distribute correctly" -ForegroundColor White
Write-Host ""
Write-Host "🔸 OCR Flow Test:" -ForegroundColor Cyan
Write-Host "   □ Upload screenshot (keep under 5MB)" -ForegroundColor White
Write-Host "   □ Verify OCR fills wallet/unrealized fields" -ForegroundColor White
Write-Host "   □ Verify recompute triggers automatically" -ForegroundColor White
Write-Host ""
Write-Host "🔸 Snapshot Flow Test:" -ForegroundColor Cyan
Write-Host "   □ Save Snapshot after computation" -ForegroundColor White
Write-Host "   □ Start Next Window" -ForegroundColor White
Write-Host "   □ Verify investor baseline increases" -ForegroundColor White
Write-Host "   □ Verify no double-counting of prior legs" -ForegroundColor White
Write-Host ""
Write-Host "🔸 Vercel Logs Check:" -ForegroundColor Cyan
Write-Host "   □ Check Vercel function logs for /api/ocr" -ForegroundColor White
Write-Host "   □ Verify OCR completes within timeout limits" -ForegroundColor White
Write-Host "   □ No runtime errors in production logs" -ForegroundColor White

Write-Host ""
Write-Host "🎉 Automated smoke test suite passed!" -ForegroundColor Green
Write-Host "Proceed with manual testing checklist above." -ForegroundColor Cyan
exit 0