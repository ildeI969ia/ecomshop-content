# PHASE 04A — CURRENT STATE AUDIT

**Target:** `https://marketing.ecomspain.com`  
**Current Deployed App:** `https://ecomshop-content-314549039420.europe-west1.run.app`  
**Working Directory:** `c:\imf\eniquecer blog\ecomshop-content`  
**Date:** September 14, 2026  
**Auditor:** Antigravity / Senior Product Engineer  

---

## 1. Classification Methodology

To ensure total transparency before altering backend architecture, every finding is strictly categorized under:
- **[OBSERVED]:** Directly inspected in code, configuration, or environment.
- **[DOCUMENTED]:** Stated in Phase 01/02/03 architectural documents.
- **[INFERRED]:** Logical deduction from code behavior and deployment setup.
- **[PROPOSED]:** Architecture recommended for Phase 04A foundation.

---

## 2. Codebase & Runtime Inventory

### 2.1 Dependencies & Versions
- **[OBSERVED] Next.js:** `16.3.5` (Canary/Turbopack enabled)
- **[OBSERVED] React / React-DOM:** `19.2.8`
- **[OBSERVED] AI SDK:** `@google/genai` `^2.22.0` (Official Google GenAI SDK)
- **[OBSERVED] Styling & Icons:** `tailwindcss` `^4.0`, `@tailwindcss/postcss` `^4`, `lucide-react` `^1.45.0`, `framer-motion` `^13.2.0`
- **[OBSERVED] Validation:** `zod` `^4.6.5`
- **[OBSERVED] Node.js Runtime:** Local environment runs `v24.14.0`, Dockerfile runs `node:20-alpine`, package.json devDependencies targets `@types/node ^20`.
- **[OBSERVED] Missing Packages:** Firebase SDK (`firebase` or `firebase-admin`) is **NOT** installed in `package.json`. DOMPurify (`isomorphic-dompurify`) is **NOT** installed in `package.json`.

### 2.2 Project Structure
```text
c:\imf\eniquecer blog\ecomshop-content\
├── .firebaserc                     [OBSERVED] Project: 'ecomshop-marketing-prod'
├── firebase.json                   [OBSERVED] Rewrites to Cloud Run 'ecomshop-content' (europe-west1)
├── cloudbuild.yaml                 [OBSERVED] Docker build + Artifact Registry + gcloud run deploy
├── Dockerfile                      [OBSERVED] Multi-stage Node 20-alpine standalone build
├── next.config.ts                  [OBSERVED] output: "standalone"
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── advisor/multimodal/route.ts  [OBSERVED] POST: Gemini 2.5 Pro Vision/Audio
│   │   │   ├── generate/route.ts            [OBSERVED] POST: Gemini 2.5 Flash B2B Multichannel
│   │   │   ├── images/generate/route.ts     [OBSERVED] POST: Imagen 3.0 image generation
│   │   │   ├── notebooklm/status/route.ts   [OBSERVED] GET/POST: In-memory mock
│   │   │   ├── strategy/angles/route.ts     [OBSERVED] POST: Strategic angles generator
│   │   │   └── validate-key/route.ts        [OBSERVED] POST: Gemini API key check
│   │   ├── globals.css                      [OBSERVED] Tailwind v4 import
│   │   ├── layout.tsx                       [OBSERVED] Root layout
│   │   └── page.tsx                         [OBSERVED] Monolithic client page (1,818 lines)
│   ├── components/
│   │   └── MultimodalAdvisor.tsx            [OBSERVED] 512 lines client component
│   └── lib/
│       ├── finops.ts                        [OBSERVED] Local pricing calculator & usage types
│       ├── gemini-agent.ts                  [OBSERVED] Strategic angle generation prompts
│       ├── generator.ts                     [OBSERVED] Gemini 2.5 Flash prompt & deterministic fallback
│       ├── image-generator.ts               [OBSERVED] Imagen 3 SDK call & Unsplash fallbacks
│       ├── knowledge.ts                     [OBSERVED] In-memory catalog (EnGenius, Wi-Fi 7, switches)
│       ├── multimodal-advisor.ts            [OBSERVED] Gemini 2.5 Pro Multimodal prompt
│       ├── notebooklm.ts                    [OBSERVED] Static mock state & source interfaces
│       └── schema.ts                        [OBSERVED] Zod schemas for ContentOutput & GenerateRequest
```

---

## 3. Storage & State Assessment

### 3.1 LocalStorage Audit
- **[OBSERVED] `ecomshop_gemini_key`:**
  - *Purpose:* Stores user's personal Google Gemini API key.
  - *Risk:* High security hazard. API keys entered in the UI are persisted in plaintext in browser localStorage and sent over HTTP payload in POST requests (`body.apiKey`).
- **[OBSERVED] `ecomshop_article_history`:**
  - *Purpose:* Stores last 50 generated content items in JSON format.
  - *Limitation:* Cleared upon clearing browser data; not synchronized across devices or team members.
- **[OBSERVED] `ecomshop_finops_records`:**
  - *Purpose:* Stores last 100 usage records and calculated EUR spend.
  - *Limitation:* Client-side only. Cannot aggregate corporate spend or enforce hard server-side quotas.
- **[OBSERVED] `ecomshop_generated_images`:**
  - *Purpose:* Stores last 20 generated image URLs (data URIs or remote URLs).
  - *Limitation:* Bloats localStorage when storing Base64 image strings.

### 3.2 In-Memory Volatile State
- **[OBSERVED] `src/app/api/notebooklm/status/route.ts`:**
  - Uses `let currentNotebookState = { ...OFFICIAL_NOTEBOOK };`.
  - In Cloud Run, container instances scale to 0 (`--min-instances=0`) and state is completely reset on cold starts or between parallel instances.

---

## 4. Security & Compliance Analysis

### 4.1 Secrets & API Keys
- **[OBSERVED] Server Secret:** `cloudbuild.yaml` injects `GEMINI_API_KEY=GEMINI_API_KEY:latest` from Google Secret Manager directly into Cloud Run.
- **[OBSERVED] Hybrid Exposure:** All API routes (`generate`, `images/generate`, `strategy/angles`, `advisor/multimodal`) accept an optional `apiKey` in the request body from client-side `localStorage`. If absent, they fall back to `process.env.GEMINI_API_KEY`.
- **[PROPOSED]:** Sever all client-provided API key flows. Cloud Run server must solely resolve credentials from environment/Secret Manager.

### 4.2 XSS & Content Sanitization
- **[OBSERVED] `page.tsx`:**
  - Lines 973 & 1164: `dangerouslySetInnerHTML={{ __html: content.blog.htmlContent }}` and `dangerouslySetInnerHTML={{ __html: content.mailchimp.newsletterHtml }}`.
  - HTML returned by LLM or deterministic fallback is rendered directly to the DOM without DOMPurify sanitization.
- **[PROPOSED]:** Install `isomorphic-dompurify` and wrap all HTML renders before injection.

### 4.3 Authentication & RBAC
- **[OBSERVED]:** Currently **ZERO authentication**. The application is publicly accessible (`--allow-unauthenticated` in `cloudbuild.yaml`).
- **[OBSERVED]:** Any visitor can trigger Gemini and Imagen 3 generation requests, burning Cloud Run and AI API credits.
- **[PROPOSED]:** Integrate Firebase Authentication (restricted to `@ecomspain.com`), session verification cookies on API routes, and Firestore RBAC.

---

## 5. Discrepancies Between Documentation & Reality

| Domain | Documented in FASE 02 / 03 | Observed in Codebase | Status |
| :--- | :--- | :--- | :--- |
| **Persistence** | Firestore collections (`contents`, `campaigns`, `finops`, `audit_logs`) | Pure `localStorage` + in-memory mocks | **Unimplemented** |
| **Authentication** | Google Workspace / Firebase Auth (`@ecomspain.com`) | None (`--allow-unauthenticated`) | **Unimplemented** |
| **RBAC** | Roles: Admin, Marketing Manager, Content Manager, etc. | None (Universal single-tenant client) | **Unimplemented** |
| **NotebookLM** | Live B2B RAG Vector Pipeline | Static hardcoded array (`OFFICIAL_NOTEBOOK`) + mock route | **Mocked / No Public API** |
| **FinOps Ledger** | Server-side Firestore audit trail with prompt cache telemetry | Client-side formula in `finops.ts` saving 100 items to browser | **Client Only** |
| **Multi-Tenancy** | Workspaces & Organization hierarchy | Flat local state | **Unimplemented** |

---

## 6. Cloud Run Infrastructure Status

- **[OBSERVED] Service Name:** `ecomshop-content`
- **[OBSERVED] Region:** `europe-west1` (Belgium)
- **[OBSERVED] Memory / CPU:** 1GiB RAM, 1 vCPU
- **[OBSERVED] Scaling:** Min 0, Max 5 instances
- **[OBSERVED] Secrets:** `GEMINI_API_KEY` bound from Secret Manager
- **[OBSERVED] Firebase Hosting Rewrite:** `.firebaserc` targets `ecomshop-marketing-prod`. `firebase.json` routes `/**` to Cloud Run `ecomshop-content`.
- **[INFERRED]:** The Cloud Run deployment pipeline is operational and stable, but lacks custom domain mapping to `marketing.ecomspain.com`.

---

## 7. Conclusions for Phase 04A Execution

1. The current application functions as a high-fidelity standalone demo with mock persistence.
2. Migration must be **additive and non-breaking**: existing UI in `page.tsx` must continue operating while backend services, Firestore schemas, and authentication are built.
3. NotebookLM cannot be consumed as a direct RAG database via supported REST APIs; an abstract `KnowledgeProvider` must be architected.
