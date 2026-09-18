# PHASE 05B — STORAGE & ASSET MANAGEMENT REPORT

**Scope:** Cloud Storage Provider, Asset Schema, Bucket Configuration & IAM  
**Date:** September 14, 2026  
**Status:** VALIDATED (Release Candidate Ready)  

---

## 1. Cloud Storage Architecture & Bucket Setup

```
+-------------------------------------------------------------------------------+
|                            CLIENT / WORKSPACE                                 |
|  Image Studio / Multimodal Lab / Campaign Workspace                           |
+-------------------------------------------------------------------------------+
                                      |
                       POST /api/assets (Multipart/Base64)
                                      v
+-------------------------------------------------------------------------------+
|                    NEXT.JS SERVER (GOOGLE CLOUD RUN)                          |
|                                                                               |
|  1. Auth & RBAC Check: authenticateServerRequest() -> content:create / ai     |
|  2. Filename Sanitization: Path traversal removal (../ stripped)              |
|  3. MIME Validation: Strict whitelist (JPEG, PNG, WebP, SVG, PDF, Audio)     |
|  4. Size Guardrail: Enforced max 25MB buffer size                            |
|  5. GoogleCloudStorageProvider: Streams binary to GCS bucket                  |
+-------------------------------------------------------------------------------+
                                      |
                                      +------------------------+
                                      |                        |
                                      v                        v
+-------------------------------------------+  +--------------------------------+
|       GOOGLE CLOUD STORAGE (GCS)          |  |     FIRESTORE METADATA         |
|                                           |  |                                |
| Bucket: ecomshop-marketing-assets         |  | Collection: assets/{assetId}   |
| Region: europe-west1                      |  | - storagePath                  |
| Path: workspaces/{id}/assets/{assetId}_...|  | - filename, size, mimeType     |
| IAM: Uniform bucket-level access          |  | - campaignId, productId        |
+-------------------------------------------+  +--------------------------------+
```

---

## 2. Security & Path Traversal Neutralization

- **Filename Sanitization:** Evaluated and tested against `../../../etc/passwd` injection attempts. The server strictly converts all non-alphanumeric characters to `_` and strips relative directory indicators.
- **MIME Spoofing Prevention:** Files claiming false extensions are cross-checked against strict allowed MIME types.
- **Zero Base64 in Firestore:** Binaries are stored exclusively in Cloud Storage; Firestore records only light metadata and storage references, protecting document size limits.
