---
name: deploy-and-publish
description: >-
  Automated pipeline to verify TypeScript and quality gates, commit and push changes to GitHub.
  Pushing to main automatically triggers Google Cloud Build and deploys to Cloud Run in europe-west1.
  Use this skill whenever the user asks to publish, deploy, or commit and push changes to GitHub.
---

# Deploy & Publish Skill (GitHub CI/CD -> Google Cloud Run)

Este skill automatiza el ciclo completo de entrega continua para la suite `ecomshop-content`:
1. **Pre-flight**: Verificación estricta de compilación con TypeScript (`tsc --noEmit`) y compuertas de calidad (`test:persistence`, `test:storage`).
2. **Control de Versiones y Despliegue Automático**: Agrupación en staging, creación de commit con mensaje descriptivo y push seguro a `origin/main` en GitHub.
3. **Propagación Cloud**: El push a `main` activa automáticamente el Cloud Build Trigger (`rmgpgab-ecomshop-content-europe-west1-ildeI969ia-ecomshop-coywl`) que compila la imagen Docker inmutable y actualiza el servicio Cloud Run `ecomshop-content` en `europe-west1`.

---

## ⚡ Comandos Rápidos

### 1. Publicación Estándar (Verificación + Push a GitHub -> Auto Cloud Deploy)
Ejecutar desde el directorio del proyecto (`ecomshop-content`):
```powershell
npm run push
```
O con mensaje de commit personalizado:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/deploy.ps1 -SkipCloud -Message "feat: tu descripcion de cambios"
```
> **Nota de Arquitectura**: Al hacer push a `main`, GitHub notifica el webhook de Google Cloud Build que automáticamente ejecuta `cloudbuild.yaml` y despliega la nueva revisión en Cloud Run.

### 2. Despliegue Manual Directo a Google Cloud (Opcional / Bypass de Git)
Si se requiere forzar una compilación en Cloud Build sin crear un commit de Git:
```powershell
npm run deploy:cloud
```
O mediante el script:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/deploy.ps1 -SkipGit
```

---

## 🔍 Detalles del Entorno y Credenciales

- **Repositorio Remoto**: `https://github.com/ildeI969ia/ecomshop-content.git` (rama `main`)
- **Cloud Build Trigger**: `rmgpgab-ecomshop-content-europe-west1-ildeI969ia-ecomshop-coywl` (`push` a `^main$`)
- **Google Cloud Project**: `ecomshop-marketing-prod`
- **Región Cloud Run**: `europe-west1`
- **Servicio Cloud Run**: `ecomshop-content`
- **Dominio Corporativo**: [https://marketing.ecomspain.com](https://marketing.ecomspain.com)
- **URL Directa Cloud Run**: [https://ecomshop-content-314549039420.europe-west1.run.app](https://ecomshop-content-314549039420.europe-west1.run.app)
- **Especificaciones Cloud Run**: 1 CPU, 1 GiB RAM, escalado 0 a 5 instancias, autenticación pública activada.

---

## 🛠️ Procedimiento de Ejecución para el Agente

Cuando el usuario pida desplegar o publicar los cambios:

1. **Paso 1: Validar el estado local**
   ```powershell
   git status --short
   ```
2. **Paso 2: Verificar la compilación y compuertas**
   ```powershell
   npm run typecheck
   npm run test:persistence
   npm run test:storage
   ```
   *Si hay errores, resolverlos antes de continuar.*

3. **Paso 3: Subir a GitHub (dispara el auto-deploy en Cloud Run)**
   ```powershell
   git add .
   git commit -m "<mensaje claro en formato Conventional Commits>"
   git push origin main
   ```

4. **Paso 4: Monitorizar el build y verificar la nueva revisión en Cloud Run**
   ```powershell
   gcloud builds list --limit=1 --project=ecomshop-marketing-prod
   gcloud run services describe ecomshop-content --region=europe-west1 --project=ecomshop-marketing-prod --format="value(status.url,status.latestReadyRevisionName)"
   ```
