# Quick Start: API Integration Tests

This script helps you run API integration tests.

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Calendar2Image - API Integration Test" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "Checking if server is running on port 3000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Server is running" -ForegroundColor Green
    $serverRunning = $true
} catch {
    Write-Host "✗ Server is not running" -ForegroundColor Red
    $serverRunning = $false
}

Write-Host ""

if (-not $serverRunning) {
    Write-Host "The server needs to be running for API integration tests." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  1. Start server in another terminal: npm run dev" -ForegroundColor White
    Write-Host "  2. Run Docker tests instead: npm run test:docker" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Start server now in background? (y/n)"
    if ($choice -eq 'y') {
        Write-Host "Starting server in background..." -ForegroundColor Cyan
        $job = Start-Job -ScriptBlock { 
            Set-Location $using:PWD
            npm run dev
        }
        
        # Wait for server to be ready
        Write-Host "Waiting for server to be ready..." -ForegroundColor Yellow
        $attempts = 0
        $maxAttempts = 10
        while ($attempts -lt $maxAttempts) {
            Start-Sleep -Seconds 1
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
                Write-Host "✓ Server is ready" -ForegroundColor Green
                break
            } catch {
                $attempts++
                Write-Host "." -NoNewline
            }
        }
        
        if ($attempts -eq $maxAttempts) {
            Write-Host ""
            Write-Host "Server failed to start!" -ForegroundColor Red
            Stop-Job $job
            Remove-Job $job
            exit 1
        }
        
        Write-Host ""
        Write-Host "Running tests..." -ForegroundColor Cyan
        npm run test:integration
        $testResult = $LASTEXITCODE
        
        Write-Host ""
        Write-Host "Stopping server..." -ForegroundColor Yellow
        Stop-Job $job
        Remove-Job $job
        
        exit $testResult
    } else {
        exit 1
    }
} else {
    Write-Host "Running tests..." -ForegroundColor Cyan
    npm run test:integration
}

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
}
