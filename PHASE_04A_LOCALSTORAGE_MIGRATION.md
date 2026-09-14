# PHASE 04A — LOCALSTORAGE TO FIRESTORE MIGRATION STRATEGY

## 1. LocalStorage Inventory & Destination Mapping

| Key | Purpose / Contents | Risk / Limitations | Firestore Destination | Migration Adaptor Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `ecomshop_gemini_key` | User's plaintext Gemini API Key | High security hazard; client key exposed in browser and HTTP headers | **DEPRECATED** (Google Secret Manager in Cloud Run) | Automatically read once to bootstrap if missing in dev; removed from client payloads in production. Server uses `process.env.GEMINI_API_KEY`. |
| `ecomshop_article_history` | Array of last 50 generated marketing articles and layouts | Ephemeral; lost on browser cache wipe; not shared with team | `contents/{contentId}` + `contents/{contentId}/variants/{variantId}` | `PersistenceService.syncFromLocalStorage()` automatically scans and ingests into Firestore collection with version 1. |
| `ecomshop_finops_records` | Array of last 100 client usage items and cost estimates | Client-side only; lacks server enforcement, monthly caps, or user attribution | `usage_records/{recordId}` | Synchronized into Firestore `usage_records` collection with `workspaceId`, `userId`, and `currency: EUR`. |
| `ecomshop_generated_images` | Array of last 20 generated image prompt records and data URLs | Massive localStorage bloat due to Base64 image payloads | `assets/{assetId}` | Metadata preserved; Base64 moved to Firebase Storage bucket in Phase 04B, storing persistent public URL. |

---

## 2. Zero-Downtime Migration Architecture

```
+-------------------------------------------------------------------------------+
|                            CLIENT BROWSER (PAGE.TSX)                          |
+-------------------------------------------------------------------------------+
| 1. Read existing localStorage (ecomshop_article_history, finops_records)       |
| 2. Post payload to /api/sync with authenticated corporate session             |
| 3. Maintain fallback to localStorage if offline or unauthenticated            |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                         NEXT.JS APP ROUTER (/API/SYNC)                        |
+-------------------------------------------------------------------------------+
| 1. Verify @ecomspain.com session via authenticateServerRequest()              |
| 2. Pass payload to PersistenceService                                         |
| 3. Sanitize HTML content via isomorphic-dompurify                             |
| 4. Write idempotently to Firestore via Firebase Admin SDK                     |
| 5. Create AuditLog entry in audit_logs collection                             |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                           GOOGLE CLOUD FIRESTORE                              |
+-------------------------------------------------------------------------------+
| contents/{contentId}          -> Master articles & layout                     |
| contents/.../variants/{id}    -> Mailchimp, LinkedIn, WhatsApp derivatives    |
| usage_records/{recordId}      -> Telemetry ledger & hard budget checks        |
| audit_logs/{logId}            -> Immutable traceability record                |
+-------------------------------------------------------------------------------+
```

---

## 3. Rollback & Reversibility Protocol

1. **Dual Read/Write Mode:** During Phase 04A and 04B, the client UI retains local items in localStorage while simultaneously writing to Firestore.
2. **Reversibility Guarantee:** If the Firestore connection fails or is denied by security rules, the application falls back gracefully to localStorage without interrupting the user workflow.
3. **No Destructive Drops:** Existing client keys are not destroyed until the user explicitly disconnects or validates that Firestore synchronization succeeded.
