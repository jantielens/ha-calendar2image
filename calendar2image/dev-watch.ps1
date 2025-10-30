# Template Development Launcher
# Simplified script to start template development environment

param(
    [Parameter(Mandatory=$true, Position=0)]
    [int]$ConfigIndex,
    
    [Parameter(Position=1)]
    [string]$TemplateFile = ""
)

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host " Template Development Environment" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker container is running
Write-Host "Checking Docker container..." -ForegroundColor Yellow
$containerRunning = docker ps --filter "name=calendar2image" --format "{{.Names}}" 2>$null

if (-not $containerRunning) {
    Write-Host "❌ Docker container not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the container first (in another terminal):" -ForegroundColor Yellow
    Write-Host "  docker compose up" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: Don't use 'npm run test:ci' - it stops after testing!" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Docker container is running" -ForegroundColor Green
Write-Host ""

# Test container health
Write-Host "Testing container API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Container is healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ Container not responding!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting template watcher..." -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

# Start the watcher
if ($TemplateFile) {
    node watch-template.js $ConfigIndex $TemplateFile
} else {
    node watch-template.js $ConfigIndex
}
