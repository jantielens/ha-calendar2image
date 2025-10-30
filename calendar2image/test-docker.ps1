# Quick Start: Docker Integration Tests

This script helps you quickly run Docker integration tests.

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Calendar2Image - Docker Integration Test" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not installed or not accessible!" -ForegroundColor Red
    exit 1
}

# Check if port 13000 is available
Write-Host "Checking port availability..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 13000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "WARNING: Port 13000 is in use" -ForegroundColor Yellow
    Write-Host "The test may fail. Please free up the port or stop the conflicting service." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        exit 1
    }
} else {
    Write-Host "✓ Port 13000 is available" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting Docker integration tests..." -ForegroundColor Cyan
Write-Host "This will:" -ForegroundColor White
Write-Host "  1. Build a Docker image" -ForegroundColor White
Write-Host "  2. Start a container" -ForegroundColor White
Write-Host "  3. Run tests against the container" -ForegroundColor White
Write-Host "  4. Clean up" -ForegroundColor White
Write-Host ""
Write-Host "Expected duration: ~2 minutes" -ForegroundColor Yellow
Write-Host ""

# Run the tests
npm run test:docker

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  All tests passed! ✓" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  Tests failed!" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the output above for details." -ForegroundColor Yellow
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Docker not running" -ForegroundColor White
    Write-Host "  - Port 13000 in use" -ForegroundColor White
    Write-Host "  - Build failures (check Dockerfile)" -ForegroundColor White
}
