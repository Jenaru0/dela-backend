# Script para ejecutar Hadolint en Windows - Backend API
# Uso: .\hadolint-check.ps1

Write-Host "Ejecutando Hadolint para validar Dockerfile del Backend..." -ForegroundColor Cyan

# Verificar si Docker esta ejecutandose
try {
    docker version | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker no esta ejecutandose"
    }
} catch {
    Write-Host "Error: Docker no esta disponible o no esta ejecutandose" -ForegroundColor Red
    Write-Host "Por favor, inicia Docker Desktop e intenta nuevamente" -ForegroundColor Yellow
    exit 1
}

# Ejecutar Hadolint
Write-Host "Analizando Dockerfile del Backend (API)..." -ForegroundColor Yellow

$dockerfilePath = "../Dockerfile"
$configPath = "../.hadolint.yaml"

# Verificar que el Dockerfile existe
if (-not (Test-Path $dockerfilePath)) {
    Write-Host "Error: No se encontro el Dockerfile en $dockerfilePath" -ForegroundColor Red
    exit 1
}

if (Test-Path $configPath) {
    Write-Host "Usando configuracion personalizada: .hadolint.yaml" -ForegroundColor Green
    docker run --rm -i -v "${PWD}/..:/workspace" hadolint/hadolint hadolint --config /workspace/.hadolint.yaml /workspace/Dockerfile
} else {
    Write-Host "Usando configuracion por defecto" -ForegroundColor Yellow
    Get-Content $dockerfilePath | docker run --rm -i hadolint/hadolint
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dockerfile del Backend validado correctamente!" -ForegroundColor Green
    Write-Host "Tu API esta lista para ser dockerizada de forma segura" -ForegroundColor Cyan
} else {
    Write-Host "Se encontraron problemas en el Dockerfile del Backend" -ForegroundColor Red
    Write-Host "Revisa las sugerencias arriba para mejorar tu Dockerfile" -ForegroundColor Yellow
    Write-Host "Las mejoras comunes incluyen:" -ForegroundColor Yellow
    Write-Host "   - Usar imagenes base especificas (ej: node:18-alpine)" -ForegroundColor Yellow
    Write-Host "   - Ejecutar como usuario no-root" -ForegroundColor Yellow
    Write-Host "   - Optimizar capas del Docker" -ForegroundColor Yellow
}
