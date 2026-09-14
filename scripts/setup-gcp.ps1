# Script PowerShell para inicializar y aprovisionar toda la infraestructura en Google Cloud
param (
    [string]$ProjectId = "TU_PROYECTO_GCP",
    [string]$GeminiApiKey = "TU_GEMINI_API_KEY",
    [string]$Region = "europe-west1"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Configurando Infraestructura Google Cloud & Firebase       " -ForegroundColor Cyan
Write-Host " EcomShop B2B Content Engine & marketing.ecomspain.com      " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Establecer proyecto activo
Write-Host "`n[1/6] Configurando proyecto activo: $ProjectId..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# 2. Habilitar APIs necesarias en Google Cloud
Write-Host "`n[2/6] Habilitando APIs de Google Cloud..." -ForegroundColor Yellow
gcloud services enable `
    run.googleapis.com `
    cloudbuild.googleapis.com `
    artifactregistry.googleapis.com `
    secretmanager.googleapis.com `
    firebase.googleapis.com

# 3. Crear repositorio en Artifact Registry
Write-Host "`n[3/6] Creando repositorio Docker en Artifact Registry..." -ForegroundColor Yellow
gcloud artifacts repositories create ecomshop-repo `
    --repository-format=docker `
    --location=$Region `
    --description="Repositorio Docker para EcomShop Content Engine" `
    2>$null || Write-Host "Repositorio ecomshop-repo ya existente, continuando..." -ForegroundColor Gray

# 4. Crear secreto en Secret Manager
Write-Host "`n[4/6] Guardando GEMINI_API_KEY en Secret Manager..." -ForegroundColor Yellow
$secretExists = gcloud secrets describe GEMINI_API_KEY 2>$null
if (-not $secretExists) {
    gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
}
$GeminiApiKey | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 5. Otorgar permisos a la cuenta de servicio de Cloud Run y Cloud Build
Write-Host "`n[5/6] Asignando permisos a Secret Manager..." -ForegroundColor Yellow
$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$computeServiceAccount = "$projectNumber-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding GEMINI_API_KEY `
    --member="serviceAccount:$computeServiceAccount" `
    --role="roles/secretmanager.secretAccessor"

# 6. Despliegue inicial
Write-Host "`n[6/6] Ejecutando compilacion y primer despliegue con Cloud Build..." -ForegroundColor Yellow
gcloud builds submit --config=cloudbuild.yaml .

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host " Despliegue completado con éxito en Cloud Run!              " -ForegroundColor Green
Write-Host " Siguiente paso: Conectar el dominio marketing.ecomspain.com " -ForegroundColor Green
Write-Host " Consulta DNS_GUIDE.md para los registros CNAME / A.        " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
