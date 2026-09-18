# PHASE 04B — FIRESTORE INTEGRATION REPORT

## 1. Connected Collections & Repository Mapping

| Collection Name | Associated Repository | Operation Types | Security Rules |
| :--- | :--- | :--- | :--- |
| `users` | Server Auth Service | Create, Read, Update Profile | Restricted to `@ecomspain.com` users & Admins |
| `campaigns` | `CampaignRepository` | Create, List, Filter by Workspace | Read: Auth users; Write: Managers/Admins |
| `contents` | `ContentRepository` | Create, List, Versioning | Read: Auth users; Write: Content/Managers |
| `contents/.../variants` | `ContentRepository` | Derivative channel bodies | Read: Auth users; Write: Content/Managers |
| `usage_records` | `FinOpsRepository` | Append-only token ledger | Read: Managers; Write: Server SDK only |
| `audit_logs` | `AuditRepository` | Immutable event trail | Read: Admins; Write: Server SDK only |
| `sources` | `SourceRepository` | Verified technical whitepapers | Read: Auth users; Write: Managers |

---

## 2. Active Rules & Compound Indexes

- **Security Rules File:** `firestore.rules` (Bound in `firebase.json`).
- **Compound Indexes File:** `firestore.indexes.json` (Pre-configured for efficient sorting on `workspaceId + status + updatedAt`, `campaignId + timestamp`, and `entity + entityId + timestamp`).
- **Data Protection:** Direct client-side write access to `usage_records` and `audit_logs` is strictly blocked (`allow write: if false;`), ensuring only server-side services with Firebase Admin credentials can record financial and audit records.
