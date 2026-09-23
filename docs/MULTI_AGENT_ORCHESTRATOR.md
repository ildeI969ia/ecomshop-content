# Multi-Agent Orchestrator

Provider-agnostic control plane for planning, persistence and bounded parallel execution.

## Runtime
1. Build a task DAG.
2. Persist the run in Firestore.
3. Mark dependency-safe tasks READY.
4. Acquire a task lease.
5. Execute independent agents in parallel up to configured capacity.
6. Persist artifacts, commit and validation state.
7. Integrate only validated work.
8. Require explicit human approval for production actions.

## Firestore
The run snapshot is stored in the "orchestrationRuns" collection using the existing Firebase Admin architecture.

## Agent isolation
Write-enabled agents should use isolated Git worktrees/branches and return a commit SHA. The orchestrator does not assume a shared filesystem.

## Production safety
The orchestrator never deploys implicitly. Secret Manager, IAM, Firestore rules, GCS access, authentication configuration and production deployment require explicit approval.
