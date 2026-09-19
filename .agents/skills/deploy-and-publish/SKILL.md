---
name: deploy-and-publish
description: >-
  Automated pipeline to verify TypeScript, commit and push changes to GitHub,
  and build and deploy the EcomShop Content platform to Google Cloud Run via Google Cloud Build.
  Use this skill whenever the user asks to publish, deploy to Google Cloud,
  or commit and push changes to GitHub.
---

# Deploy & Publish Skill (GitHub + Google Cloud Run)

Este skill automatiza el ciclo completo de entrega continua para la suite `ecomshop-content`:
1. **Pre-flight**: Verificación estricta de compilación con TypeScript (`tsc --noEmit`).
2. **Control de Versiones**: Agrupación en staging, creación de commit con mensaje descriptivo y push seguro a `origin/main` en GitHub.
3. **Despliegue Cloud**: Envío del build a Google Cloud Build y despliegue del contenedor gestionado en Cloud Run (`europe-west1`).

---

## ⚡ Comandos Rápidos

### 1. Despliegue Completo (GitHub + Google Cloud)
Ejecutar desde el directorio del proyecto (`ecomshop-content`):
```powershell
npm run ship
```
O con mensaje de commit personalizado:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/deploy.ps1 -Message "feat: tu descripcion de cambios"
```

### 2. Solo Subir a GitHub (Sin desplegar en Google Cloud)
```powershell
npm run push
```
O mediante el script:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/deploy.ps1 -SkipCloud -Message "fix: correccion en frontend"
```

### 3. Solo Desplegar en Google Cloud (Sin tocar Git)
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
- **Google Cloud Project**: `ecomshop-marketing-prod`
- **Región Cloud Run**: `europe-west1`
- **Servicio Cloud Run**: `ecomshop-content`
- **URL de Producción**: [https://ecomshop-content-314549039420.europe-west1.run.app](https://ecomshop-content-314549039420.europe-west1.run.app)
- **Especificaciones Cloud Run**: 1 CPU, 1 GiB RAM, escalado 0 a 5 instancias, autenticación pública activada.

---

## 🛠️ Procedimiento de Ejecución para el Agente

Cuando el usuario pida desplegar o publicar los cambios:

1. **Paso 1: Validar el estado local**
   ```powershell
   git status --short
   ```
2. **Paso 2: Verificar la compilación**
   ```powershell
   node ./node_modules/typescript/bin/tsc --project tsconfig.json --noEmit
   ```
   *Si hay errores de compilación, resolverlos antes de continuar.*

3. **Paso 3: Ejecutar el pipeline de publicación**
   ```powershell
   powershell -ExecutionPolicy Bypass -File ./scripts/deploy.ps1 -Message "<mensaje claro en formato Conventional Commits>"
   ```

4. **Paso 4: Verificar el servicio en Cloud Run**
   ```powershell
   gcloud run services describe ecomshop-content --region=europe-west1 --project=ecomshop-marketing-prod --format="value(status.url,status.conditions[0].status)"
   ```
