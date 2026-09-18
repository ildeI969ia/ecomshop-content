# PHASE 04B — ROLLBACK & REVERSIBILITY PLAN

## 1. Zero-Risk Reversibility Protocol

In accordance with the principle **"ADD -> CONNECT -> VERIFY -> MIGRATE -> REMOVE"**, the codebase maintains complete backwards compatibility:

1. **Dual Storage Mechanism:** The frontend can run in `DEMO_MODE` / offline local mode without invoking Firestore.
2. **Feature Flagging:** The environment variable `ALLOW_DEV_LOCAL_AUTH=true` allows developers and staging environments to operate without blocking on Firebase Auth tokens.
3. **Database Independence:** If Firestore experiences an outage, `generator.ts` transparently activates the deterministic fallback engine, maintaining uninterrupted content creation.

---

## 2. Rollback Steps in Case of Infrastructure Incident

If an issue occurs in Cloud Run after deployment:
1. Re-deploy the previous container tag via Cloud Run revision traffic splitting (0% new revision / 100% previous revision).
2. The client browser preserves existing articles and FinOps metrics in `localStorage`.
3. No breaking schema changes were applied that would invalidate previous client-side data.
