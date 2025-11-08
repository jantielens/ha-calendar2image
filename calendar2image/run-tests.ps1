# PowerShell script to run tests in Docker without local Node.js installation

Write-Host "Running Calendar2Image Tests in Docker..." -ForegroundColor Green
Write-Host ""

# Build command - using simpler approach to avoid quoting issues
$dockerCommand = "docker run --rm -v `"${PWD}:/app`" -w /app node:22-alpine sh -c `"apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont font-noto-emoji python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev pkgconfig > /dev/null 2>&1 && echo 'Installing dependencies...' && npm ci && echo 'Running tests...' && npm run test:all`""

Write-Host "Setting up Docker test environment..." -ForegroundColor Yellow
Invoke-Expression $dockerCommand

Write-Host ""
Write-Host "Test run complete!" -ForegroundColor Green

# Usage instructions
Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  ./run-tests.ps1                    - Run all tests" 
Write-Host "  ./run-tests.ps1 --coverage         - Run with coverage"
Write-Host "  ./run-tests.ps1 --integration      - Run integration tests"