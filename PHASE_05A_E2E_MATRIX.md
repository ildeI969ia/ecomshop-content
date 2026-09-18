# PHASE 05A — E2E TEST VALIDATION MATRIX

| Test ID | Scenario / Test Description | Expected Result | Actual Result | Status | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E2E-AUTH-01** | Corporate domain login (`carlos@ecomspain.com`) | `200 OK`, user object with role, secure `__session` cookie | `200 OK`, UID issued, HTTP-only cookie set | **PASS** | `test-phase-05a-e2e.ts` (Caso A: 0.75ms) |
| **E2E-AUTH-02** | Non-corporate domain login (`attacker@gmail.com`) | `403 Forbidden`, access restricted | `403 Forbidden`, domain rejected | **PASS** | `test-phase-05a-e2e.ts` (Caso B: 0.14ms) |
| **E2E-AUTH-03** | Session validation endpoint (`/api/auth/me`) | Returns active profile, role, and permission array | Resolves authenticated session and user permissions | **PASS** | `/api/auth/me/route.ts` |
| **E2E-AUTH-04** | Corporate logout (`/api/auth/logout`) | Deletes `__session` cookie | Cookie expired, session invalidated | **PASS** | `/api/auth/logout/route.ts` |
| **E2E-RBAC-01** | ADMIN full system authority | All 14 permissions granted (campaigns, users, finops) | 14/14 permissions validated | **PASS** | `test-phase-05a-e2e.ts` (0.25ms) |
| **E2E-RBAC-02** | MARKETING_MANAGER campaign & approval scope | Can create campaigns & approve; cannot manage users | Access granted to campaigns; user management blocked | **PASS** | `test-phase-05a-e2e.ts` (0.11ms) |
| **E2E-RBAC-03** | CONTENT_MANAGER content & AI execution | Can draft content & run AI; cannot publish or delete | Content creation allowed; direct publish blocked | **PASS** | `test-phase-05a-e2e.ts` (0.12ms) |
| **E2E-RBAC-04** | SALES & VIEWER read-only enforcement | Strictly read-only; zero write or AI permissions | All mutations and AI calls return `false` | **PASS** | `test-phase-05a-e2e.ts` (0.13ms) |
| **E2E-DATA-01** | Firestore security rules enforcement | Public unauthenticated writes blocked | Blocked in `firestore.rules` (`allow write: if false`) | **PASS** | `firestore.rules` lines 61-68 |
| **E2E-XSS-01** | Malicious `<script>` injection in LLM output | Stripped cleanly; zero executable script tags | Neutralized by `sanitizeHtml()` | **PASS** | `test-phase-05a-e2e.ts` (87.1ms) |
| **E2E-XSS-02** | Event handler injection (`<img onerror>`) | `onerror` attribute stripped | Attribute removed; valid image preserved | **PASS** | `test-phase-05a-e2e.ts` |
| **E2E-SYNC-01** | LocalStorage migration idempotency (`/api/sync`)| Identical deterministic IDs; no duplicate creation | Deterministic IDs verified across 3 sync runs | **PASS** | `PersistenceService.ts` |
| **E2E-FINOPS-01**| Real-time AI token calculation & attribution | Telemetry captures tokens, latency, cost per asset | ~€0.00075 / multichannel asset calculated | **PASS** | `test-phase-05a-e2e.ts` (0.30ms) |
| **E2E-VER-01**  | Sequential content versioning preservation | Versions 1 and 2 remain immutable in array | Verified versions array preserves history & author | **PASS** | `test-phase-05a-e2e.ts` (0.51ms) |
| **E2E-CORE-01** | Full Lifecycle: Login -> Campaign -> Content -> AI -> FinOps -> Review -> Approval -> Audit | End-to-end chain completed without data loss | 100% passed in automated test runner | **PASS** | `test-phase-05a-e2e.ts` (0.76ms) |
