# Script para ejecutar Hadolint en ambos proyectos
# Uso: .\hadolint-check-all.ps1

Write-Host "Ejecutando Hadolint para todos los Dockerfiles del proyecto DELA..." -ForegroundColor Cyan

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

Write-Host "`n" + "="*60 -ForegroundColor Blue
Write-Host "ANALIZANDO FRONTEND" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Blue

$frontendDockerfile = "../../dela-platform-frontend/Dockerfile"
$frontendConfig = "../../dela-platform-frontend/.hadolint.yaml"

if (Test-Path $frontendDockerfile) {
    if (Test-Path $frontendConfig) {
        Write-Host "Usando configuracion personalizada para Frontend" -ForegroundColor Green
        docker run --rm -i -v "${PWD}/../../dela-platform-frontend:/workspace" hadolint/hadolint hadolint --config /workspace/.hadolint.yaml /workspace/Dockerfile
    } else {
        Write-Host "Usando configuracion por defecto para Frontend" -ForegroundColor Yellow
        Get-Content $frontendDockerfile | docker run --rm -i hadolint/hadolint
    }
    $frontendResult = $LASTEXITCODE
} else {
    Write-Host "No se encontro Dockerfile del Frontend" -ForegroundColor Red
    $frontendResult = 1
}

Write-Host "`n" + "="*60 -ForegroundColor Blue
Write-Host "ANALIZANDO BACKEND" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Blue

$backendDockerfile = "../Dockerfile"
$backendConfig = "../.hadolint.yaml"

if (Test-Path $backendDockerfile) {
    if (Test-Path $backendConfig) {
        Write-Host "Usando configuracion personalizada para Backend" -ForegroundColor Green
        docker run --rm -i -v "${PWD}/..:/workspace" hadolint/hadolint hadolint --config /workspace/.hadolint.yaml /workspace/Dockerfile
    } else {
        Write-Host "Usando configuracion por defecto para Backend" -ForegroundColor Yellow
        Get-Content $backendDockerfile | docker run --rm -i hadolint/hadolint
    }
    $backendResult = $LASTEXITCODE
} else {
    Write-Host "No se encontro Dockerfile del Backend" -ForegroundColor Red
    $backendResult = 1
}

Write-Host "`n" + "="*60 -ForegroundColor Blue
Write-Host "RESUMEN FINAL" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Blue

if ($frontendResult -eq 0) {
    Write-Host "Frontend: Dockerfile validado correctamente" -ForegroundColor Green
} else {
    Write-Host "Frontend: Se encontraron problemas" -ForegroundColor Red
}

if ($backendResult -eq 0) {
    Write-Host "Backend: Dockerfile validado correctamente" -ForegroundColor Green
} else {
    Write-Host "Backend: Se encontraron problemas" -ForegroundColor Red
}

if ($frontendResult -eq 0 -and $backendResult -eq 0) {
    Write-Host "`nTodos los Dockerfiles estan validados correctamente!" -ForegroundColor Green
    Write-Host "Tu proyecto DELA esta listo para produccion" -ForegroundColor Cyan
} else {
    Write-Host "`nHay problemas que necesitan atencion" -ForegroundColor Yellow
    Write-Host "Revisa las sugerencias arriba para mejorar tus Dockerfiles" -ForegroundColor Yellow
}
