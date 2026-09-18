# PHASE 04B — CORPORATE AUTHENTICATION REPORT

## 1. Authentication Architecture

```
+-------------------------------------------------------------------------------+
|                             CLIENT BROWSER                                    |
|  CorporateSignIn Component (Plus Jakarta Sans + JetBrains Mono)               |
+-------------------------------------------------------------------------------+
                                      |
                         POST /api/auth/login
                      { email: "user@ecomspain.com" }
                                      v
+-------------------------------------------------------------------------------+
|                       NEXT.JS ROUTE HANDLER (SERVER)                          |
|                                                                               |
| 1. Domain Validation: isEcomSpainCorporateEmail() rejects non-@ecomspain.com   |
| 2. Identity & Role Resolution: Queries users/{uid} in Firestore               |
| 3. Session Issuance: Sets HTTP-Only, Secure, SameSite=Lax "__session" cookie   |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                         PROTECTED API ENDPOINTS                               |
|                                                                               |
| authenticateServerRequest(req) extracts cookie, decodes token, enforces RBAC   |
+-------------------------------------------------------------------------------+
```

---

## 2. Granular Role Matrix & Permissions

| Role | Target Department | Key Permissions |
| :--- | :--- | :--- |
| **ADMIN** | Executive & IT Direction | Full authority: campaigns, contents, approvals, users, finops, and audit. |
| **MARKETING_MANAGER** | Growth & Content Strategy | Campaign creation, content approval, channel distribution, FinOps view. |
| **CONTENT_MANAGER** | Technical Copywriters | Content drafting, editing, AI execution, submit for review. |
| **PRODUCT_MANAGER** | EnGenius Brand Specialists | Technical specs maintenance, SKU validation, AI generation. |
| **DESIGNER** | Visual Merchandisers | Creative Studio, Imagen 3 renders, diagrams, and asset management. |
| **SALES** | Account Executives | Read-only view of approved marketing packs, prices, and datasheets. |
| **VIEWER** | External Integrators (Restricted)| Read-only view of published whitepapers. |
