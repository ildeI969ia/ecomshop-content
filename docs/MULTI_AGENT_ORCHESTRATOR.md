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


## Ejecución real de agentes

El control plane separa la orquestación de la herramienta concreta que ejecuta un agente:
- `AgentProvider` define el contrato.
- `CommandAgentProvider` ejecuta un adaptador CLI explícitamente configurado; no presupone un ejecutable concreto de Antigravity/Cline.
- `GitWorktreeManager` crea una rama/worktree aislado por tarea y permite eliminarlo al finalizar.
- `acquireTaskLease()` reclama una tarea mediante transacción Firestore para impedir doble ejecución concurrente.
- El runtime aplica hasta 3 intentos por tarea, con backoff exponencial acotado, y libera el lease siempre en `finally`.

El proveedor real debe inyectarse por configuración. No se debe hardcodear una CLI de agente ni sus credenciales en el repositorio.

### Estado de producción

La orquestación no despliega producción automáticamente. Cualquier operación sobre Cloud Run, IAM, Secret Manager, Firestore Rules, GCS o autenticación requiere una aprobación explícita antes de ejecutarse.
