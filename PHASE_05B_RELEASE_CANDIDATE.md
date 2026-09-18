# PHASE 05B — RELEASE CANDIDATE (RC-1) SPECIFICATION

**Release Identifier:** `ECOMSPAIN-MARKETING-OS-v1.0.0-RC1`  
**Build Environment:** Next.js 16.3.5 (Turbopack) / Node.js 20-alpine  
**Target Cloud Run Service:** `ecomshop-content` (`europe-west1`)  
**Container Base:** Multi-stage standalone output (`output: "standalone"`)  
**Date:** September 14, 2026  
**Status:** **APPROVED FOR PHASE 06 FINAL DEPLOYMENT & DOMAIN TRANSITION**  

---

## 1. Release Inventory & Core Capabilities

- **Total API Routes:** 20 verified endpoints (`auth`, `campaigns`, `contents`, `assets`, `finops`, `sync`, `advisor`, `images`).
- **Security Posture:** 100% server-side RBAC (7 roles), HTTP-Only session cookies (`@ecomspain.com`), zero browser API key exposure, DOMPurify anti-XSS protection, Cloud Storage path traversal sanitization.
- **Data Persistence:** Cloud Firestore native integration (`users`, `campaigns`, `contents`, `variants`, `assets`, `usage_records`, `audit_logs`) with full offline localStorage fallback.
- **Design System:** Strict adherence to Stitch Project `3835074964441777816` (*Technical Editorial Operating System*).
- **FinOps Telemetry:** Automated tracking of token spend against monthly €50 hard cap.

---

## 2. Final Verdict

# **FINAL DECISION: GO — READY FOR PHASE 06**

### Operational Boundary Check:
- DNS changes to `marketing.ecomspain.com` remain paused until Phase 06 execution.
- Release Candidate container artifact is reproducible and fully validated.
