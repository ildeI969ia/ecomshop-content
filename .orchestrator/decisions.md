# ARCHITECTURE DECISION — F6 SECURITY & HARDENING

**Fase:** F6 Post-Audit Consolidation  
**Estado:** PENDING HUMAN APPROVAL  
**Fecha:** 2026-09-23  

---

## 1. Resumen de Hallazgos Consolidados (F6-A a F6-H)

Tras completar en paralelo la auditoría read-only de los 8 dominios, se consolidaron los siguientes riesgos:

1. **Riesgo Crítico (Autenticación & Secretos):**  
   - Fallbacks de contraseñas maestras y sesión hardcodeadas en código fuente (`EcomSpain2026!`, `AdminEcom2026!`, `ecomspain-default-secret-change-in-prod-2026`).  
   - Bypass de middleware en `src/middleware.ts:11` mediante `pathname.includes(".")`.  
   - Secret Manager no se encuentra enlazado en `cloudbuild.yaml` para inyectar estos secretos de forma segura en Cloud Run.

2. **Riesgo Alto (Aislamiento Multi-Tenant & Silenciado de Errores):**  
   - Fallback en `src/app/api/assets/route.ts` que consulta activos sin filtro de `workspaceId` si el workspace actual está vacío.  
   - Bloques try/catch con fallbacks silenciosos durante generación de imágenes.

3. **Riesgo Medio (Calidad CI & Acoplamiento):**  
   - `scripts/deploy.ps1` sólo valida `typecheck`, omitiendo pruebas de regresión críticas (`test:persistence`, `test:storage`).

---

## 2. Grafo de Tareas de Implementación (DAG Propuesto)

```text
[F6-AUDITS COMPLETADAS]
          │
          ▼
 [F6-ARCH-DECISION] (Aprobación humana requerida)
          │
    ┌─────┴─────────────────────────┐
    ▼                               ▼
[F6-SEC-001] Secret Manager     [F6-FS-001] Aislamiento Multi-Tenant
    │                               │
    ▼                               ▼
[F6-SEC-002] Remove Hardcoded   [F6-CI-001] Quality Gates en Deploy
    │                               │
    └──────────────┬────────────────┘
                   ▼
           [F6-INTEGRATION] (Merge secuencial y verificación)
                   │
                   ▼
             [F6-QA-GATE] (Tests completos, build y typecheck)
                   │
                   ▼
        [HUMAN APPROVAL GATE PARA DEPLOY F6]
```

---

## 3. Matriz de Propiedad de Archivos y Mitigación de Conflictos

| Tarea ID | Agente | Archivos Permitidos | Archivos Prohibidos | Nivel Riesgo |
|---|---|---|---|---|
| **F6-SEC-001** | Infra/Security | `cloudbuild.yaml`, scripts de secrets | Código frontend, catálogo | ALTO (Requiere aprobación IAM) |
| **F6-SEC-002** | Security | `src/lib/auth/session.ts`, `src/app/api/auth/login/route.ts`, `src/middleware.ts` | Frontend UI, catálogos | ALTO |
| **F6-FS-001** | Backend | `src/app/api/assets/route.ts`, `src/server/repositories/index.ts` | Auth, middleware, infra | MEDIO |
| **F6-CI-001** | QA | `scripts/deploy.ps1`, `package.json` | Rutas de negocio, auth | BAJO |

---

## 4. Compuertas de Aprobación Humana Obligatorias

No se ejecutará ninguna modificación en Cloud Run, Secret Manager ni IAM sin la previa confirmación explícita del usuario.
