# Multi-Agent Orchestrator

The orchestration core is provider-agnostic: it plans and validates a task DAG but does not execute an LLM or deploy production.

## Control flow

Planner -> Task DAG -> parallel agents -> artifacts -> integration -> QA -> explicit deployment.

## Safety

- Dependencies are validated and cycles rejected.
- File scopes prevent unsafe concurrent work.
- RED tasks serialize.
- Production infrastructure is never modified implicitly.
- Integration and deployment are explicit stages.

## F6

The initial plan contains eight read-only audits (F6-A through F6-H). The execution runtime may cap concurrency at six active agents.

## Next layers

1. persistent Firestore run/task documents;
2. leases and heartbeats;
3. artifact registry;
4. retries and backoff;
5. human approval gates;
6. worktree lifecycle;
7. provider adapters;
8. UI for runs and tasks.
