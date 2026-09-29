#!/bin/bash
# DEPLOYMENT GUIDE - EcomSpain Marketing OS
# Guía completa para desplegar en Google Cloud Run sin dependencias locales de Git

set -e

echo "================================================"
echo "🚀 EcomSpain Marketing OS - Cloud Run Deploy"
echo "================================================"
echo ""

# 1. VERIFICAR AUTENTICACIÓN EN GCP
echo "📋 [PASO 1/6] Verificando autenticación en Google Cloud..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" > /dev/null; then
    echo "❌ No hay autenticación activa en gcloud. Ejecuta:"
    echo "   gcloud auth login"
    exit 1
fi
echo "✅ Autenticación verificada"
echo ""

# 2. CONFIGURAR PROYECTO
echo "📋 [PASO 2/6] Configurando proyecto GCP..."
PROJECT_ID="ecomshop-marketing-prod"
REGION="europe-west1"
SERVICE_NAME="ecomshop-content"

gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"
echo "✅ Proyecto configurado: $PROJECT_ID (región: $REGION)"
echo ""

# 3. ACTIVAR APIS NECESARIAS
echo "📋 [PASO 3/6] Activando APIs necesarias..."
echo "  ⏳ Activando Cloud Run..."
gcloud services enable run.googleapis.com
echo "  ⏳ Activando Cloud Build..."
gcloud services enable cloudbuild.googleapis.com
echo "  ⏳ Activando Artifact Registry..."
gcloud services enable artifactregistry.googleapis.com
echo "  ⏳ Activando Cloud Firestore..."
gcloud services enable firestore.googleapis.com
echo "  ⏳ Activando Cloud Storage..."
gcloud services enable storage.googleapis.com
echo "✅ APIs activadas"
echo ""

# 4. VALIDAR ENTORNO LOCAL
echo "📋 [PASO 4/6] Validando compilación local..."
echo "  ⏳ Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Instálalo desde https://nodejs.org"
    exit 1
fi
echo "    Node version: $(node -v)"

echo "  ⏳ Verificando npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado"
    exit 1
fi
echo "    npm version: $(npm -v)"

echo "  ⏳ Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Instálalo desde https://www.docker.com"
    exit 1
fi
echo "    Docker version: $(docker -v)"

echo "  ⏳ Instalando dependencias..."
npm ci --legacy-peer-deps

echo "  ⏳ Verificando TypeScript..."
npm run typecheck
echo "    ✅ TypeScript: OK"

echo "  ⏳ Compilando proyecto..."
npm run build
echo "    ✅ Build: OK"

echo "✅ Compilación local validada"
echo ""

# 5. CONSTRUIR Y SUBIR IMAGEN DOCKER
echo "📋 [PASO 5/6] Construyendo imagen Docker..."
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"
echo "  ⏳ Imagen: $IMAGE_NAME"

echo "  ⏳ Configurando autenticación Docker con gcloud..."
gcloud auth configure-docker gcr.io

echo "  ⏳ Construyendo imagen (esto puede tardar 5-10 minutos)..."
docker build -t "$IMAGE_NAME" .

echo "  ⏳ Subiendo imagen a Container Registry..."
docker push "$IMAGE_NAME"
echo "✅ Imagen construida y subida correctamente"
echo ""

# 6. DESPLEGAR EN CLOUD RUN
echo "📋 [PASO 6/6] Desplegando en Cloud Run..."
echo "  ⏳ Creando/actualizando servicio: $SERVICE_NAME"

gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE_NAME" \
  --region="$REGION" \
  --platform=managed \
  --no-allow-unauthenticated \
  --min-instances=0 \
  --max-instances=5 \
  --memory=1Gi \
  --cpu=1 \
  --timeout=3600 \
  --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" \
  --service-account="default@${PROJECT_ID}.iam.gserviceaccount.com"

DEPLOY_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')

echo "✅ Despliegue completado"
echo ""
echo "================================================"
echo "🎉 DESPLIEGUE EXITOSO"
echo "================================================"
echo ""
echo "📍 URL de la aplicación:"
echo "   $DEPLOY_URL"
echo ""
echo "📊 Ver logs en tiempo real:"
echo "   gcloud run logs read $SERVICE_NAME --region=$REGION --limit=50"
echo ""
echo "🔄 Ver historial de despliegues:"
echo "   gcloud run revisions list --service=$SERVICE_NAME --region=$REGION"
echo ""
echo "❌ Para detener el servicio:"
echo "   gcloud run services delete $SERVICE_NAME --region=$REGION"
echo ""
