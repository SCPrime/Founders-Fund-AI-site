# MOD SQUAD Bootstrap Script
# One-click project launch for Founders Fund AI Site

Write-Host "[INFO] MOD SQUAD TEAM MAX - Starting Founders Fund AI Site" -ForegroundColor Cyan
Write-Host ""

# Check if running from project root
if (-not (Test-Path "mod_squad.config.json")) {
    Write-Host "[FAIL] Must run from project root directory" -ForegroundColor Red
    exit 1
}

# Load configuration
Write-Host "[INFO] Loading MOD SQUAD configuration..." -ForegroundColor Yellow
$config = Get-Content "mod_squad.config.json" | ConvertFrom-Json
Write-Host "[OK] Configuration loaded" -ForegroundColor Green

# Check Node.js
Write-Host "[INFO] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Node.js not found - please install Node.js" -ForegroundColor Red
    exit 1
}

# Check Python
Write-Host "[INFO] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "[OK] $pythonVersion installed" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Python not found - OCR worker will not be available" -ForegroundColor Yellow
}

# Install frontend dependencies
Write-Host ""
Write-Host "[INFO] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location "founders-fund-app"
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Frontend dependency installation failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Run health checks
Write-Host ""
Write-Host "[INFO] Running health checks..." -ForegroundColor Yellow
Pop-Location
try {
    python scripts/health_check.py
} catch {
    Write-Host "[WARN] Health check failed - some services may not be running" -ForegroundColor Yellow
}

# Display project info
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MOD SQUAD TEAM MAX - READY FOR ACTION!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project: $($config.project.name)" -ForegroundColor White
Write-Host "Version: $($config.project.version)" -ForegroundColor White
Write-Host "Owner: $($config.project.owner)" -ForegroundColor White
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
foreach ($service in $config.services.PSObject.Properties) {
    Write-Host "  - $($service.Value.name): $($service.Value.url)" -ForegroundColor White
}
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Check MOD_SQUAD_LIVE_FEED.md for team status" -ForegroundColor White
Write-Host "  2. Start frontend: cd founders-fund-app && npm run dev" -ForegroundColor White
Write-Host "  3. Coordinate with agents via Live Feed" -ForegroundColor White
Write-Host ""
Write-Host "[OK] Bootstrap complete!" -ForegroundColor Green
