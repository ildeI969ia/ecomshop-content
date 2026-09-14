# PHASE 04A — ARCHITECTURAL DECISION LOG (ADR)

## ADR-01: Firebase Admin SDK & Application Default Credentials (ADC)
- **Status:** APPROVED & IMPLEMENTED
- **Context:** Cloud Run requires persistent database access without manual credential files.
- **Decision:** Use `firebase-admin` with automatic ADC resolution in Cloud Run (`getFirebaseAdminApp()`), with fallback to `FIREBASE_SERVICE_ACCOUNT_KEY` environment secret when developing outside GCP.
- **Consequence:** Zero hardcoded private keys; seamless deployment to Cloud Run `europe-west1`.

## ADR-02: Decoupled KnowledgeProvider vs NotebookLM Direct Scraping
- **Status:** APPROVED & IMPLEMENTED
- **Context:** NotebookLM lacks a public REST API / SDK for programmatic RAG calls.
- **Decision:** Create an abstract `KnowledgeProvider` interface. Implement `HybridKnowledgeProvider` indexing verified local datasheets and product catalogs in memory/Firestore.
- **Consequence:** Avoids brittle scraping hacks, eliminates risk of Google account bans, preserves sub-second retrieval latency, and leaves the door open to Vertex AI Vector Search.

## ADR-03: Server-Side Secret Management & API Route Shielding
- **Status:** APPROVED & IMPLEMENTED
- **Context:** Previous prototype accepted optional `apiKey` in request body and stored user API key in `localStorage`.
- **Decision:** AI generation routes now strictly default to `process.env.GEMINI_API_KEY` bound from Google Secret Manager. Client-side input of API keys is bypassed in production.
- **Consequence:** Eliminates API key leakage risk over client browsers.

## ADR-04: Non-Breaking Dual Persistence Adapter
- **Status:** APPROVED & IMPLEMENTED
- **Context:** Existing frontend in `page.tsx` relies heavily on `localStorage` for history and FinOps.
- **Decision:** Build `/api/sync` and `PersistenceService` to allow non-destructive synchronization from `localStorage` to Firestore while keeping existing UI functions intact.
- **Consequence:** Zero user-facing disruptions; gradual transition to full Firestore persistence.
