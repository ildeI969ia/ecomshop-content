param(
    [string]$Message = "feat: actualizacion de componentes, miniaturas completas y regeneracion de plantillas",
    [switch]$SkipGit = $false,
    [switch]$SkipCloud = $false
)

$ErrorActionPreference = "Stop"
Write-Host "`n=== INICIANDO PIPELINE DE PUBLICACION Y DESPLIEGUE ===`n" -ForegroundColor Cyan

# 1. Pre-flight: Verificacion de TypeScript
Write-Host "[1/3] Verificando compilacion de TypeScript..." -ForegroundColor Yellow
$tscResult = node ./node_modules/typescript/bin/tsc --project tsconfig.json --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la compilacion en TypeScript. Corrige los tipos antes de publicar." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] TypeScript verificado sin errores (0 errores).`n" -ForegroundColor Green

# 2. Git Commit & Push a GitHub
if (-not $SkipGit) {
    Write-Host "[2/3] Subiendo cambios a GitHub..." -ForegroundColor Yellow
    
    $status = git status --porcelain
    if ($status) {
        Write-Host "  -> Agregando archivos a staging..." -ForegroundColor Gray
        git add .
        
        Write-Host "  -> Creando commit: '$Message'..." -ForegroundColor Gray
        git commit -m "$Message"
    } else {
        Write-Host "  -> No hay cambios pendientes en working tree." -ForegroundColor Gray
    }

    Write-Host "  -> Ejecutando git push origin main..." -ForegroundColor Gray
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Cambios subidos correctamente a GitHub (origin/main).`n" -ForegroundColor Green
    } else {
        Write-Host "WARN: Hubo un problema al hacer push a GitHub." -ForegroundColor Yellow
    }
} else {
    Write-Host "[2/3] Paso de GitHub omitido (-SkipGit activado).`n" -ForegroundColor DarkGray
}

# 3. Google Cloud Build & Cloud Run Deploy
if (-not $SkipCloud) {
    Write-Host "[3/3] Desplegando en Google Cloud (Cloud Build + Cloud Run)..." -ForegroundColor Yellow
    Write-Host "  -> Proyecto: ecomshop-marketing-prod" -ForegroundColor Gray
    Write-Host "  -> Region: europe-west1" -ForegroundColor Gray
    Write-Host "  -> Servicio: ecomshop-content" -ForegroundColor Gray
    Write-Host "  -> Enviando build a Cloud Build..." -ForegroundColor Gray

    gcloud builds submit --config=cloudbuild.yaml --project=ecomshop-marketing-prod
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nDESPLIEGUE COMPLETADO CON EXITO EN GOOGLE CLOUD RUN!" -ForegroundColor Green
        Write-Host "URL de Produccion: https://ecomshop-content-314549039420.europe-west1.run.app" -ForegroundColor Cyan
    } else {
        Write-Host "ERROR en Google Cloud Build. Revisa los logs de Cloud Build." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[3/3] Paso de Google Cloud omitido (-SkipCloud activado).`n" -ForegroundColor DarkGray
}

Write-Host "Pipeline finalizado con exito.`n" -ForegroundColor Green
