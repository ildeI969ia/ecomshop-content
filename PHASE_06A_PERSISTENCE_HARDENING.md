# PHASE 06A — PERSISTENCE HARDENING (F0 + F1 + F2)

> Estado: **F0, F1 y F2 ejecutados y verificados.** F3 (pipeline de generación),
> F4 (lectura/UI), F5 (migración legacy) y F6 (blindaje) quedan pendientes de revisión.
> Este documento es el cierre técnico de la auditoría de persistencia de activos.

---

## 1. Alcance ejecutado

| Fase | Objetivo | Estado |
| --- | --- | --- |
| **F0** | Diagnóstico reproducible del flujo real (Firestore + GCS + galería) | ✅ Hecho |
| **F1** | Infraestructura: bucket real, IAM del runtime, variables de entorno, índices compuestos | ✅ Hecho |
| **F2** | `StorageProvider` honesto (nunca fabrica URLs) + test que certifica el contrato real | ✅ Hecho |

**NO se han tocado** (por decisión explícita del responsable):
`src/app/api/images/generate/route.ts`, `src/app/api/assets/route.ts`, `src/app/page.tsx`,
`src/lib/image-db.ts`, `src/server/repositories/index.ts`, `src/server/domain/types.ts`.

Consecuencia esperada: los **nuevos** assets ya se subirán a GCS con URL verificada, pero
la galería seguirá mostrando 0 activos legacy hasta F4/F5 (esos 12 documentos no tienen URL).
El endpoint `/api/health/persistence` informa de este estado en lugar de ocultarlo.

---

## 2. Cambios de infraestructura (F1)

Ejecutado contra el proyecto `ecomshop-marketing-prod`:

```bash
# 1) Bucket de binarios (no existía: era la causa raíz de la pérdida de activos)
gcloud storage buckets create gs://ecomshop-marketing-assets \
  --project=ecomshop-marketing-prod --location=europe-west1 \
  --uniform-bucket-level-access --default-storage-class=standard

# 2) Permisos: el service account de Cloud Run debe poder escribir/leer/borrar objetos
gcloud storage buckets add-iam-policy-binding gs://ecomshop-marketing-assets \
  --member="serviceAccount:314549039420-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# 3) Lectura pública de objetos (ver decisión en §5.1)
gcloud storage buckets add-iam-policy-binding gs://ecomshop-marketing-assets \
  --member="allUsers" --role="roles/storage.objectViewer"
```

**Índices compuestos**: `firestore.indexes.json` declaraba los índices pero **ninguno estaba
desplegado** (la query principal daba `FAILED_PRECONDITION` y caía siempre al fallback silencioso).
Se han creado los 7 declarados (assets, contents ×2, campaigns, usage_records ×2, audit_logs)
con `gcloud firestore indexes composite create --async`.

**Variables de entorno**: `GCS_BUCKET_NAME=ecomshop-marketing-assets` añadida a
`cloudbuild.yaml` (`--update-env-vars`) y a `.env.example` / `.env.local` para desarrollo.

---

## 3. Cambios de código (F0 + F2)

| Archivo | Cambio |
| --- | --- |
| `src/server/services/storage-provider.ts` | **Reescrito.** `uploadFile()` ahora lanza `StorageProviderError` si el bucket no existe, si la subida falla o si la verificación no cuadra. Verifica `exists()` + tamaño remoto antes de devolver `publicUrl`. `getBucket()` lanza en vez de devolver `null`. `deleteFile()` idempotente y sin silencios. `getSignedUrl()` verifica existencia. Nuevos: `classifyStorageError()`, `normalizeObjectPath()`, `checkStorageHealth()` (sonda superficial/profunda). |
| `src/server/services/persistence-diagnostics.ts` | **Nuevo.** Motor de diagnóstico compartido: clasificación pura de assets (`classifyAssetUrl`, `summarizeAssetHealth`), query con índice vs fallback, conteo total, sonda de Storage, sondas HTTP de URLs, checks con severidad, diagnóstico en lenguaje natural y deuda pendiente. |
| `src/app/api/health/persistence/route.ts` | **Nuevo.** `GET /api/health/persistence?deep=1&verifyUrls=1` → informe JSON; `200` sin hallazgos CRITICAL, `503` si el pipeline está roto. Requiere sesión corporativa. |
| `scripts/diagnose-assets.ts` | **Nuevo.** CLI del diagnóstico (`--deep`, `--json`, `--workspace=`, `--no-verify-urls`); exit code 1 si hay CRITICAL. |
| `scripts/test-phase-05b-storage.ts` | **Reescrito.** El test anterior certificaba el falso contrato (sólo comprobaba `mimeType`/`storagePath` y pasaba aunque no se subiera nada). Ahora verifica que la subida **rechaza** cuando el bucket no existe y que un roundtrip real queda verificado. |
| `scripts/test-persistence-diagnostics.ts` | **Nuevo.** Tests puros que codifican como regresión la forma exacta de los 12 assets legacy (`publicUrl: ""`, `storagePath: "generated/..."`). |
| `package.json` | Nuevos scripts: `diag:assets`, `diag:assets:deep`, `test:storage`, `test:persistence`. |
| `cloudbuild.yaml` | `GCS_BUCKET_NAME` en las variables del despliegue. |
| `.env.example` | Documentada `GCS_BUCKET_NAME`. |

---

## 4. Verificación (resultados reales, no teóricos)

### 4.1 Tests

```text
npm run test:persistence   → 6 tests, 6 pass, 0 fail
npm run test:storage       → 8 tests, 7 pass, 1 skipped (integración opt-in)
npm run diag:assets:deep   → exit code 1 (correcto: quedan CRITICAL pendientes de F3/F4/F5)
npx tsc --noEmit           → 0 errores
```

El test más importante, `RECHAZA la subida si el bucket no existe (antes devolvía una URL
fabricada)`, ataca la API real de GCS con un bucket inexistente y **falla correctamente**
lanzando `StorageProviderError` (4,4 s de round-trip real). Antes, esa misma llamada devolvía
una `publicUrl` inventada y el test pasaba en verde.

### 4.2 Diagnóstico profundo contra el proyecto real

```text
 Bucket           : gs://ecomshop-marketing-assets (nombre por default → enviado por env en Cloud Run)
 assets totales   : 12 | en workspace: 12
 query con indice : FALLA (codigo 9)   → índice recién creado, en construcción
 salud de activos : OK=0 sinURL=12 rutaFicticia=0 dataURL=0
CLOUD STORAGE
 alcanzable       : si
 escritura        : verificada
 roundtrip        : 366 ms
```

* **GCS ya funciona de verdad**: sonda profunda con subida + verificación por tamaño + borrado.
* **Los 12 assets legacy** siguen clasificados como `MISSING_URL` (publicUrl vacío): la galería los
  descarta en `src/app/page.tsx:716-725`. Es la deuda F5/F4.
* El índice pasa de `FAILED_PRECONDITION` a `OK` cuando Firestore termina de construirlo.

### 4.3 Verificación post-despliegue (producción)

| Comprobación | Resultado real |
| --- | --- |
| Revisión de Cloud Run | `ecomshop-content-00047-f6m` (Lista/Ready) |
| Variables del runtime | `GOOGLE_CLOUD_PROJECT; GCP_PROJECT; GOOGLE_CLOUD_LOCATION; VERTEX_LOCATION; GOOGLE_GENAI_USE_VERTEXAI; GCS_BUCKET_NAME` |
| Índices compuestos | **7/7 en estado READY** |
| `GET /api/health/persistence?deep=1` sin sesión | **HTTP 401** (ruta desplegada y protegida por el middleware) |
| Diagnóstico local (`npm run diag:assets`) | `query con indice: OK`, bucket alcanzable |
| Lectura pública del contrato de URLs | `curl https://storage.googleapis.com/ecomshop-marketing-assets/_health/public-read-probe.txt` → **200**, `Content-Type: text/plain`, contenido correcto (objeto de prueba borrado después) |
| Sonda profunda de Storage | subida + verificación por tamaño + borrado OK (366 ms) |

Estado del diagnóstico tras F1+F2: la única severidad CRITICAL que queda es
`firestore.assets.missingUrl` (12 assets legacy), que es exactamente la deuda F4/F5.


---

## 5. Decisiones y riesgos (revisar)

### 5.1 El bucket es de lectura pública (`allUsers: objectViewer`)

Mantenido a propósito para **no romper el contrato actual**: el código y los metadatos existentes
asumen URLs del tipo `https://storage.googleapis.com/<bucket>/<ruta>` y el navegador las carga
directamente con `<img src>`. Alternativa recomendada para F4: servir con **URLs firmadas**
(`getSignedUrl()` ya está implementado y verificado) o tokens de descarga de Firebase, y revocar
el acceso público con:

```bash
gcloud storage buckets remove-iam-policy-binding gs://ecomshop-marketing-assets \
  --member="allUsers" --role="roles/storage.objectViewer"
```

Las rutas de objeto son impredecibles (`workspaces/<workspaceId>/assets/asset-<ts>-<rand>_generated.<ext>`),
pero **cualquiera con la URL puede leer el objeto**.

### 5.2 Cambio de comportamiento transitorio en `/api/images/generate`

Al ser honesto, `uploadFile()` ahora sí lanza. Como `generate/route.ts` todavía tiene su
`catch (storageErr)` (F3 aún no ejecutada), un fallo de GCS hará que el asset caiga al data URL
y su escritura en Firestore sea rechazada por tamaño (>1 MiB) — y ese error se traga el
`catch (dbErr)`, devolviendo 200. Es decir: **con GCS operativo esto no debería ocurrir**; si el
bucket se cayera, la UI seguiría mintiendo hasta F3. Verificación: `npm run diag:assets:deep`.

### 5.3 Pendientes de seguridad ya detectados (F6)

`SESSION_SECRET` y `CORPORATE_ACCESS_PASSWORD` no existen en el contenedor (`--update-env-vars`
sólo inyecta las 5 variables `GOOGLE_*`/`VERTEX_*`/`GCS_BUCKET_NAME`), por lo que producción usa
los **valores por defecto del repositorio** → cookies forjables y contraseña corporativa conocida.
`src/middleware.ts:11` (`pathname.includes(".")` → `next()`) sigue siendo un bypass. No se ha
tocado nada de esto en esta fase.

---

## 6. Cómo verificar en producción

```bash
# 1) El bucket existe y responde (lectura anónima del contrato actual)
curl -I https://storage.googleapis.com/ecomshop-marketing-assets/_health/persistence-probe.txt

# 2) El runtime tiene la variable y la revisión está sana
gcloud run services describe ecomshop-content --region=europe-west1 \
  --project=ecomshop-marketing-prod \
  --format="value(status.latestReadyRevisionName,spec.template.spec.containers[0].env)"

# 3) Índices compuestos (deben pasar de CREATING a READY)
gcloud firestore indexes composite list --project=ecomshop-marketing-prod \
  --format="table(name,state,fields.fieldPath)"

# 4) Diagnóstico desde la aplicación (con sesión corporativa iniciada en el navegador)
#    GET /api/health/persistence?deep=1&verifyUrls=1   → 200 si no hay CRITICAL, 503 si el pipeline está roto
# 5) Diagnóstico desde la máquina del desarrollador (requiere ADC: gcloud auth application-default login)
npm run diag:assets:deep
npm run diag:assets:deep -- --json     # salida para CI
```

Sin sesión, `/api/health/persistence` responde **401** (el middleware protege `/api/*`): es la señal
de que la ruta está desplegada y protegida.

---

## 7. Rollback

* **Código**: `git revert` de este commit + `npm run deploy:cloud`.
* **Variable de entorno**: `gcloud run services update ecomshop-content --region=europe-west1 --remove-env-vars GCS_BUCKET_NAME`.
* **Bucket**: vaciar y borrar con
  `gcloud storage rm -r gs://ecomshop-marketing-assets/**` y `gcloud storage buckets delete gs://ecomshop-marketing-assets`.
* **Índices**: `gcloud firestore indexes composite delete <INDEX_ID> --project=ecomshop-marketing-prod`.
  Volver a un estado sin índices degrada silenciosamente a fallback sin orden (nunca borrar los
  índices de `contents`/`campaigns` sin medir el impacto).
* Los objetos subidos durante la verificación están sólo en `_health/` y se autoborran en la sonda.

---

## 8. Siguiente fase (no ejecutada)

| Fase | Contenido | Archivo clave |
| --- | --- | --- |
| **F3** | Optimizar el binario (≤ ~1600 px / q0.85), subir a GCS, escribir metadatos con `publicUrl` verificado + `storageStatus`/`sha256`, propagar errores (sin `catch` mudos), eliminar el fallback de data URL | `src/app/api/images/generate/route.ts`, `src/app/api/assets/route.ts` |
| **F4** | `/api/assets` sin auto-recuperación lateral y sin `200 {assets: []}`; galería que no descarte activos sin URL y muestre `syncState`/estado real; botón "Recargar BBDD" con error visible | `src/app/api/assets/route.ts`, `src/app/page.tsx:709-761` |
| **F5** | Migración de los 12 assets legacy (`publicUrl` vacío + `storagePath: generated/...`): marcar `BROKEN_SOURCE` o recuperar el binario; **nunca** inventar URLs | nuevo `scripts/repair-legacy-assets.ts` |
| **F6** | `SESSION_SECRET`/`CORPORATE_ACCESS_PASSWORD` en Secret Manager, arreglar `src/middleware.ts:11`, reglas de lint contra `catch {}` vacíos y CI gate (`tsc` + `test:storage` + `test:persistence` + `diag:assets --json`) antes de `deploy:cloud` | `cloudbuild.yaml`, `eslint.config.mjs`, `scripts/deploy.ps1` |


