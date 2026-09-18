# PHASE 04B — ARCHITECTURAL DECISION LOG (ADR)

## ADR-05: Server-Side Corporate Authentication & HTTP-Only Sessions
- **Status:** APPROVED & IMPLEMENTED
- **Context:** Previous prototype lacked identity, allowing unrestricted token consumption.
- **Decision:** Restrict login to `@ecomspain.com` corporate accounts. Issue secure HTTP-Only `__session` cookies verified via Firebase Admin Auth on every sensitive route handler.
- **Consequence:** Rejects unauthorized external requests while providing a seamless user experience.

## ADR-06: Incremental UI Extraction (CommandCenter & CampaignWorkspace)
- **Status:** APPROVED & IMPLEMENTED
- **Context:** Prohibición estricta de "Big Bang Rewrite" sobre `src/app/page.tsx`.
- **Decision:** Extract modular, typed UI components conforming to Stitch design specifications (`CommandCenter.tsx`, `CampaignWorkspace.tsx`, `CorporateSignIn.tsx`) as independent components under `src/components/os/` and `src/components/auth/`.
- **Consequence:** Zero disruption to existing features while incrementally elevating the platform to the *Technical Editorial Operating System* standard.

## ADR-07: Telemetry-Driven FinOps Ledger in Firestore
- **Status:** APPROVED & IMPLEMENTED
- **Context:** FinOps costs were previously computed solely on the client using a static JavaScript helper.
- **Decision:** Automatically append each generation transaction to the Firestore `usage_records` collection via `FinOpsRepository`, associating token metrics with campaign and user IDs.
- **Consequence:** Enables true corporate budget governance and prevents client-side tampering with spend limits.
