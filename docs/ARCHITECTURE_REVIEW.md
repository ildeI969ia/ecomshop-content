# EcomSpain Marketing OS — Architecture Review

## Scope

This review is based on the current `main` branch and focuses on the production content-generation workflow. The objective is to improve architecture, scalability and maintainability without intentionally changing business functionality.

## Current runtime flow

```
UI
 -> Next.js API route
 -> RBAC
 -> AI budget check
 -> catalog/product resolution
 -> Notebook/Product Intelligence
 -> EditorialOrchestrator
 -> GroundedWriter
 -> Evidence/claims/channel quality
 -> Editorial Quality Gate
 -> Firestore ContentItem + variants
 -> IN_REVIEW
 -> APPROVED
 -> PUBLISHED
```

The canonical editorial decision is `EditorialOrchestrator`. Channel regeneration and GEO/JSON-LD generation should reuse `generateB2BContent` rather than creating an independent editorial strategy.

## Architectural findings

### P0 — duplicated generation paths

Historically, several endpoints instantiated `AntigravityTsProvider` directly while the canonical content path used `generateB2BContent`. This created multiple AI execution paths with different prompts, timeout handling, provenance and quality behavior.

**Current direction:** generation endpoints for channel/GEO/JSON-LD route through `generateB2BContent`.

The remaining direct Antigravity path is the legacy batch marketing subsystem. It should be treated as a separate bounded subsystem until it is deliberately migrated; do not merge it opportunistically into the editorial pipeline.

### P0 — generation orchestration duplicated work

The main generation API performs product intelligence/extraction before calling `generateB2BContent`, while `generateB2BContent` performs its own Notebook Intelligence and editorial orchestration.

This is a performance and maintenance risk because one request can resolve related product context more than once.

**Target refactor:** introduce a typed `GenerationContext` built once at the application-service boundary and pass it through Product Truth → Intelligence → Orchestrator → Writer → Quality Gate.

### P1 — AI infrastructure duplicated at route level

Many AI routes repeat:

- RBAC
- `checkAiBudget`
- provider invocation
- JSON parsing
- `recordAiUsage`
- error mapping

**Target refactor:** create one application-level AI execution service. Routes should only validate input, authorize, call the use case and map the response to HTTP.

### P1 — domain contracts too weak

`ContentOutput.editorialDecision` is currently represented as a generic record even though a complete `EditorialDecisionSchema` already exists.

**Target refactor:** use one shared domain contract without introducing a runtime import cycle between `schema.ts` and `editorial-orchestrator.ts`.

### P1 — repository layer masks infrastructure failures

Some repository methods catch Firestore query failures and silently return empty arrays/null.

This makes an infrastructure outage indistinguishable from "no data", which can cause incorrect editorial decisions.

**Target refactor:** distinguish `NotFound` from `RepositoryUnavailable`; only explicit business fallback paths should degrade.

### P1 — Firestore document growth

`ContentItem` stores canonical content, multiple versions and channel payloads in one document. The repository already contains defensive pruning because the Firestore 1 MiB document limit is a real constraint.

**Target refactor:** keep the canonical campaign record small and move large channel bodies/version payloads to subcollections or dedicated documents.

### P1 — budget race condition

Budget verification happens before generation and accounting happens afterwards. Concurrent requests can therefore pass the same pre-check.

**Target refactor:** reserve budget atomically before expensive AI work and reconcile the reservation after completion.

### P2 — type safety debt

The codebase contains many `any` usages in repositories, routes and AI adapters. This is particularly dangerous around untrusted AI JSON and Firestore payloads.

**Target refactor:** validate at boundaries with Zod, then keep typed objects internally.

## Runtime constraints

Production Cloud Run is configured with a maximum of 5 instances and 1 GiB RAM. Synchronous AI endpoints use a 60-second route budget. The common AI request timeout is therefore kept below the route budget to avoid spending work on requests that the HTTP layer can no longer return.

## Refactoring strategy

1. **Stabilize contracts** — explicit request/context schemas and typed AI results.
2. **Centralize application services** — one generation use case and one AI execution service.
3. **Remove duplicated route orchestration** — thin API adapters.
4. **Separate persistence concerns** — ContentRepository handles storage, not business workflow decisions.
5. **Make failures explicit** — infrastructure failures must not look like empty business data.
6. **Split large Firestore payloads** — canonical metadata separate from large versions/channel bodies.
7. **Introduce observability at service boundaries** — request ID, SKU, workspace, model, latency and token metadata.
8. **Migrate the legacy batch marketing subsystem separately** — only after contract equivalence tests exist.

## Non-goals

This review does not intentionally change:

- editorial rules
- Product Truth
- target-person strategy
- channel formats
- catalog business data
- RBAC policy
- approval semantics
- AI model selection semantics

All changes should preserve these behaviors while reducing coupling and duplication.


## Implementation status — Phase 1

The first architecture refactor has been implemented on branch `refactor/architecture-phase-1`:

### Completed

- Added `GenerationContext` in `src/server/services/generation-context.ts`.
- Product/SKU resolution, catalog resolution, source selection, Notebook Intelligence, Product Evidence Map and Product Type detection now happen once at the application boundary.
- `generateB2BContent` accepts the canonical context and no longer reconstructs product intelligence/evidence independently.
- `/api/generate` builds the context once and passes the same context to generation and post-generation validation.
- Added `AIExecutionService` for model fallback, timeout, JSON normalization and usage metadata.
- `GroundedWriterService` now delegates model execution policy to `AIExecutionService` and retains editorial validation/grounding responsibilities.
- Added regression coverage in `scripts/test-architecture-execution.ts`.

### Intentionally deferred

The following changes remain isolated because they require migration/production validation rather than a mechanical refactor:

- atomic AI budget reservation/reconciliation
- Firestore version/variant document split
- repository error taxonomy
- final separation of Writer and Critic responsibilities
- migration of the legacy batch marketing subsystem

These are not being mixed into Phase 1 because they affect persistence semantics, failure behavior or independent execution paths and therefore require dedicated regression tests and migration plans.
