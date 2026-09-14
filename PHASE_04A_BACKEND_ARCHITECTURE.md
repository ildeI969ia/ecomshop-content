# PHASE 04A — BACKEND ARCHITECTURE & REPOSITORY SPECIFICATION

## 1. System Topology Overview

```
+-------------------------------------------------------------------------------+
|                           CLIENT TIER (BROWSER)                               |
| Next.js Client Components (page.tsx, Command Center, Workspace, Diagnostic)   |
+-------------------------------------------------------------------------------+
                                      |
                           HTTPS / API Requests
                                      v
+-------------------------------------------------------------------------------+
|                    NEXT.JS APPLICATION SERVER (CLOUD RUN)                     |
|                                                                               |
|  [Security & Auth Layer]                                                      |
|  - authenticateServerRequest(): Token validation (@ecomspain.com check)       |
|  - authorizePermission(): Strict RBAC enforcement server-side                |
|  - sanitizeHtml(): DOMPurify anti-XSS stripping on all LLM outputs            |
|                                                                               |
|  [Application Services]                                                       |
|  - PersistenceService: Idempotent migration from localStorage to Firestore    |
|  - AIService / GoogleGenAIProvider: Gemini 2.5 Flash & Pro, Imagen 3         |
|  - HybridKnowledgeProvider: Decoupled corporate datasheets & star products    |
|                                                                               |
|  [Repository Abstraction Tier]                                                |
|  - CampaignRepository, ContentRepository, FinOpsRepository, AuditRepository   |
+-------------------------------------------------------------------------------+
                                      |
                       Firebase Admin SDK / ADC
                                      v
+-------------------------------------------------------------------------------+
|                     GOOGLE CLOUD INFRASTRUCTURE (EUROPE-WEST1)                |
|                                                                               |
|  - Cloud Firestore: ecomshop-marketing-prod                                   |
|  - Secret Manager: GEMINI_API_KEY, FIREBASE_SERVICE_ACCOUNT_KEY               |
|  - Artifact Registry & Cloud Run: ecomshop-content container                  |
+-------------------------------------------------------------------------------+
```

---

## 2. API Endpoints & Request Flow

| Route | Method | Auth Required | Permissions Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/generate` | `POST` | YES | `ai:execute` | Generates B2B multi-channel content using server secrets, sanitizes HTML, records FinOps telemetry. |
| `/api/sync` | `POST` | YES | `content:create` | Ingests client localStorage into Firestore with audit log generation. |
| `/api/images/generate` | `POST` | YES | `ai:execute` | Generates photorealistic telecom imagery via Imagen 3.0. |
| `/api/advisor/multimodal` | `POST` | YES | `ai:execute` | Ingests rack photos/audio dictations for automated engineering diagnostics. |
| `/api/strategy/angles` | `POST` | YES | `ai:execute` | Produces 3 differentiated B2B strategic angles (ROI, Performance, Operations). |
| `/api/notebooklm/status`| `GET/POST` | YES | `campaign:view` | Interfaces with KnowledgeProvider for verified corporate technical sources. |
