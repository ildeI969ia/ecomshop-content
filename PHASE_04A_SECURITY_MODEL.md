# PHASE 04A — SECURITY & RBAC MODEL

## 1. Threat Mitigation Matrix

| Attack Vector | Current App Vulnerability | Phase 04A Implemented Safeguard |
| :--- | :--- | :--- |
| **Plaintext Secret Leakage** | API key stored in `localStorage` and sent over client request body | Severed: All AI routes prioritize `process.env.GEMINI_API_KEY` from Google Secret Manager. Client key input disabled in prod. |
| **Cross-Site Scripting (XSS)** | `dangerouslySetInnerHTML` directly renders unescaped HTML from AI generation | Mitigated: `sanitizeHtml()` powered by `isomorphic-dompurify` strips `<script>`, inline event handlers (`onload`, `onerror`), and unsafe tags before storage or DOM injection. |
| **Unauthorized Public Inferences** | `--allow-unauthenticated` allowed any anonymous visitor to burn AI tokens | Mitigated: `authenticateServerRequest()` validates Bearer tokens or `__session` cookies against Firebase Auth Admin SDK. |
| **Cross-Tenant Access** | Single flat namespace | Enforced: All Firestore queries filter by `workspaceId` and check user organization context. |
| **Destructive Data Tampering** | No version control or audit trail | Enforced: Immutable `audit_logs` collection and subcollection versioning on `contents`. |

---

## 2. Role-Based Access Control (RBAC) Specification

```
[ADMIN]
   ├── Full control over Campaigns, Content, FinOps, RBAC and System Settings
   └── Permission to approve, publish, and delete anything

[MARKETING_MANAGER]
   ├── Campaign creation, budget allocation, source assignment
   ├── Content approval and multi-channel publication triggers
   └── View FinOps dashboards and cost attributions

[CONTENT_MANAGER]
   ├── Draft and edit master articles and channel derivatives
   ├── Execute AI generation and Multimodal Advisor runs
   └── Submit content to approval queue

[PRODUCT_MANAGER / DESIGNER]
   ├── Edit technical specifications, SKUs, and imagery
   └── Execute Imagen 3 renders and upload installation diagrams

[SALES / VIEWER]
   └── Read-only access to approved campaigns, datasheets, and published marketing packs
```

---

## 3. Server-Side Permission Verification

Permissions are not merely UI toggles; they are strictly asserted on Next.js Route Handlers:

```typescript
// Example from src/app/api/generate/route.ts
const user = await authenticateServerRequest(req);
if (!user) {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

if (!authorizePermission(user, "ai:execute")) {
  return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
}
```
