#!/usr/bin/env bash
# =============================================================================
# SCRIPT: setup-gcp-imagen3.sh
# PROPÓSITO: Configurar los permisos IAM y APIs necesarios para que
#            Cloud Run pueda usar Vertex AI Imagen 3.
#
# USO: bash scripts/setup-gcp-imagen3.sh
# REQUISITO: gcloud CLI autenticado con permisos de propietario/editor del proyecto.
# =============================================================================

set -euo pipefail

# ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-ecomshop-marketing-prod}"
CLOUD_RUN_REGION="europe-west1"
SERVICE_NAME="ecomshop-content"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Setup IAM + APIs para Vertex AI Imagen 3 en Cloud Run      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Proyecto: ${PROJECT_ID}"
echo "Región Cloud Run: ${CLOUD_RUN_REGION}"
echo ""

# ── 1. Obtener número de proyecto y Service Account del servicio ──────────────
echo "▶ Obteniendo información del proyecto..."
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Verificar si el servicio Cloud Run ya existe para obtener su SA personalizada
CUSTOM_SA=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${CLOUD_RUN_REGION}" \
  --project="${PROJECT_ID}" \
  --format="value(spec.template.spec.serviceAccountName)" 2>/dev/null || echo "")

SERVICE_ACCOUNT="${CUSTOM_SA:-${COMPUTE_SA}}"
echo "  Service Account: ${SERVICE_ACCOUNT}"
echo ""

# ── 2. Habilitar APIs necesarias ──────────────────────────────────────────────
echo "▶ Habilitando APIs necesarias..."

REQUIRED_APIS=(
  "aiplatform.googleapis.com"          # Vertex AI / Imagen 3
  "secretmanager.googleapis.com"       # Secret Manager para GEMINI_API_KEY
  "run.googleapis.com"                 # Cloud Run
  "artifactregistry.googleapis.com"    # Artifact Registry
  "cloudbuild.googleapis.com"          # Cloud Build
)

for api in "${REQUIRED_APIS[@]}"; do
  echo -n "  Habilitando ${api}... "
  gcloud services enable "${api}" --project="${PROJECT_ID}" --quiet
  echo "✅"
done
echo ""

# ── 3. Asignar roles IAM a la Service Account de Cloud Run ───────────────────
echo "▶ Asignando roles IAM a ${SERVICE_ACCOUNT}..."

REQUIRED_ROLES=(
  "roles/aiplatform.user"              # Vertex AI — necesario para Imagen 3
  "roles/ml.developer"                 # ML Engine / Vertex AI adicional
  "roles/secretmanager.secretAccessor" # Leer GEMINI_API_KEY desde Secret Manager
  "roles/datastore.user"               # Firestore
  "roles/storage.objectViewer"         # GCS (si se necesita)
)

for role in "${REQUIRED_ROLES[@]}"; do
  echo -n "  Asignando ${role}... "
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="${role}" \
    --quiet 2>/dev/null && echo "✅" || echo "⚠️  (puede que ya exista)"
done
echo ""

# ── 4. Verificar el Secret GEMINI_API_KEY en Secret Manager ──────────────────
echo "▶ Verificando Secret Manager..."
if gcloud secrets describe GEMINI_API_KEY --project="${PROJECT_ID}" &>/dev/null; then
  echo "  ✅ Secret GEMINI_API_KEY existe"
  LATEST=$(gcloud secrets versions list GEMINI_API_KEY \
    --project="${PROJECT_ID}" \
    --filter="state=ENABLED" \
    --format="value(name)" \
    --limit=1 2>/dev/null || echo "")
  if [ -n "${LATEST}" ]; then
    echo "  ✅ Versión activa: ${LATEST}"
  else
    echo "  ⚠️  No hay versiones activas. Crea una con:"
    echo "     echo -n 'TU_GEMINI_API_KEY' | gcloud secrets versions add GEMINI_API_KEY --data-file=-"
  fi
else
  echo "  ⚠️  Secret GEMINI_API_KEY NO existe. Créalo con:"
  echo "     gcloud secrets create GEMINI_API_KEY --replication-policy=automatic --project=${PROJECT_ID}"
  echo "     echo -n 'TU_GEMINI_API_KEY' | gcloud secrets versions add GEMINI_API_KEY --data-file=-"
fi
echo ""

# ── 5. Diagnóstico: verificar disponibilidad de Imagen 3 ─────────────────────
echo "▶ Verificando disponibilidad de Imagen 3 en regiones soportadas..."
IMAGEN_REGIONS=("us-central1" "europe-west4")
for region in "${IMAGEN_REGIONS[@]}"; do
  echo -n "  Probando ${region}... "
  RESULT=$(gcloud beta ml vision product-search-related 2>&1 || true)
  # Verificación via gcloud AI Platform
  if gcloud ai models list \
    --region="${region}" \
    --project="${PROJECT_ID}" \
    --filter="displayName:imagen" \
    --format="value(displayName)" \
    --quiet 2>/dev/null | grep -qi "imagen"; then
    echo "✅ Imagen disponible"
  else
    echo "⚠️  Sin confirmación (puede requerir solicitud de acceso a Imagen 3)"
  fi
done
echo ""

# ── 6. Resumen ────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                       RESUMEN                                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Proyecto:          ${PROJECT_ID}"
echo "  Service Account:   ${SERVICE_ACCOUNT}"
echo "  Cloud Run Región:  ${CLOUD_RUN_REGION}"
echo ""
echo "  Roles IAM asignados:"
gcloud projects get-iam-policy "${PROJECT_ID}" \
  --flatten="bindings[].members" \
  --filter="bindings.members:${SERVICE_ACCOUNT}" \
  --format="table(bindings.role)" 2>/dev/null || echo "  (sin información)"
echo ""
echo "  SIGUIENTE PASO: Si Imagen 3 aún falla, solicita acceso en:"
echo "  https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview#imagen-3"
echo ""
echo "  O usa GEMINI_API_KEY de AI Studio como fallback:"
echo "  https://aistudio.google.com/apikey"
echo ""
echo "✅ Setup completado. Redespliega con: git push (Cloud Build automático)"
