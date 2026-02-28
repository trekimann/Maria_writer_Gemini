# Build and push Maria Writer images to private registry
# Usage: .\build-and-push.ps1 [-NoCache]

param(
    [switch]$NoCache
)

$ErrorActionPreference = "Stop"

$Registry = "192.168.0.189:5000"
$FrontendImage = "maria-writer"
$BackendImage = "maria-writer-backend"
$Tag = "latest"

$NoCacheFlag = ""
if ($NoCache) {
    $NoCacheFlag = "--no-cache"
    Write-Host "Building with --no-cache" -ForegroundColor Yellow
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Maria Writer - Build & Push"
Write-Host "  Registry: $Registry"
Write-Host "==========================================" -ForegroundColor Cyan

# Navigate to project root (script directory)
Push-Location $PSScriptRoot

try {
    # 1. Build Frontend
    Write-Host ""
    Write-Host "[1/4] Building frontend image..." -ForegroundColor Green
    docker build $NoCacheFlag -t "${FrontendImage}:${Tag}" ./maria-writer-react
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    docker tag "${FrontendImage}:${Tag}" "${Registry}/${FrontendImage}:${Tag}"

    # 2. Build Backend
    Write-Host ""
    Write-Host "[2/4] Building backend image..." -ForegroundColor Green
    docker build $NoCacheFlag -t "${BackendImage}:${Tag}" ./maria-writer-backend
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
    docker tag "${BackendImage}:${Tag}" "${Registry}/${BackendImage}:${Tag}"

    # 3. Push Frontend
    Write-Host ""
    Write-Host "[3/4] Pushing frontend image..." -ForegroundColor Green
    docker push "${Registry}/${FrontendImage}:${Tag}"
    if ($LASTEXITCODE -ne 0) { throw "Frontend push failed" }

    # 4. Push Backend
    Write-Host ""
    Write-Host "[4/4] Pushing backend image..." -ForegroundColor Green
    docker push "${Registry}/${BackendImage}:${Tag}"
    if ($LASTEXITCODE -ne 0) { throw "Backend push failed" }

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  Done! Images pushed:"
    Write-Host "  - ${Registry}/${FrontendImage}:${Tag}"
    Write-Host "  - ${Registry}/${BackendImage}:${Tag}"
    Write-Host ""
    Write-Host "  MariaDB uses the official image:"
    Write-Host "  - mariadb:11 (pulled directly on Unraid)"
    Write-Host "==========================================" -ForegroundColor Cyan
}
finally {
    Pop-Location
}
