# Editorial Orchestration

## Pipeline

`SKU -> Product Truth -> Product Intelligence -> Audience Strategy -> Editorial Research -> Angle Generation -> Diversity Selection -> Thesis -> Outline -> Grounded Writer -> Critic -> Final Quality Gate`

The HTTP endpoint does not decide the editorial strategy. `EditorialOrchestrator` is the single decision point.

## Product Truth lock

The orchestrator rejects a request when the requested SKU and Product Intelligence SKU differ. The writer receives the selected decision and is instructed not to replace the angle, audience, thesis or outline with generic defaults.

## Target Persons

Audience strategy is product-type dependent. The current engine derives roles from the actual product category, including network engineers, Wi-Fi installers, infrastructure engineers, IT directors, campus owners, datacenter engineers, procurement, security and branch operations.

## Editorial diversity

The orchestrator creates 10 product-type-specific questions and converts them into 10-12 candidate angles. Before selection it reads recent content from the current workspace and calculates lexical similarity for titles and editorial questions.

A candidate is rejected when:
- title similarity >= 0.72, or
- editorial-question similarity >= 0.58.

If at least one clean candidate exists, the clean candidate is selected. If every candidate collides, the decision is marked as a diversity collision and the final Quality Gate blocks the result.

## User-selected angle

The UI can send the selected angle back to the orchestrator. The orchestrator prioritizes that selection but still applies the diversity collision guard. A colliding user-selected angle is replaced by the next valid candidate.

## Grounded Writer

`GroundedWriterService` consumes the orchestrator decision. It receives:
- Product Truth / Product Intelligence
- target audience
- editorial question
- angle
- tension
- reader promise
- reader learnings
- thesis
- outline
- diversity context

The writer is therefore a renderer of an editorial decision, not the place where strategy is invented.

## Quality Gate

The final generation path runs `validateEditorialQuality` after writing. A missing orchestrator decision or an unresolved diversity collision prevents a PASS.

## Fallback

When Gemini/Vertex is unavailable, the deterministic fallback keeps the same orchestrated thesis, outline, angle and audience instead of reverting to the old universal three-angle template.

## UI

The editorial selector now exposes:
1. Target Persons
2. Editorial Questions
3. 8-12 product-specific angles
4. Orchestrator-selected angle
5. User override with diversity validation

## Validation

Run:

```bash
npm run typecheck
npm run build
npm run test:editorial-orchestrator
npm run test
```

The 20-combination benchmark is intentionally separated from normal tests because running full AI article generation consumes model quota.
