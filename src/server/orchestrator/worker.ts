import {
  OrchestrationPlan,
  OrchestrationTask,
  StructuredEvent,
  OrchestrationEventType,
  FailureType
} from "./types";
import { WorktreeManager, WorktreeInstance } from "./worktree-manager";
import { LeaseManager } from "./lease-manager";
import { ApprovalStore } from "./approval-store";
import { IAgentProvider } from "./agent-provider";
import { ValidationGate } from "./validation-gate";

export interface OrchestrationWorkerOptions {
  workerId?: string;
  leaseTtlMs?: number;
  heartbeatIntervalMs?: number;
}

export class OrchestrationWorker {
  public readonly workerId: string;
  private worktreeManager: WorktreeManager;
  private leaseManager: LeaseManager;
  private approvalStore: ApprovalStore;
  private agentProvider: IAgentProvider;
  private validationGate: ValidationGate;
  private leaseTtlMs: number;
  private heartbeatIntervalMs: number;
  private events: StructuredEvent[] = [];

  constructor(
    worktreeManager: WorktreeManager,
    leaseManager: LeaseManager,
    approvalStore: ApprovalStore,
    agentProvider: IAgentProvider,
    validationGate: ValidationGate = new ValidationGate(),
    options: OrchestrationWorkerOptions = {}
  ) {
    this.worktreeManager = worktreeManager;
    this.leaseManager = leaseManager;
    this.approvalStore = approvalStore;
    this.agentProvider = agentProvider;
    this.validationGate = validationGate;
    this.workerId = options.workerId ?? `worker-${Math.random().toString(36).substring(2, 8)}`;
    this.leaseTtlMs = options.leaseTtlMs ?? 30000;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 10000;
  }

  public getEvents(): StructuredEvent[] {
    return [...this.events];
  }

  private emitEvent(runId: string, taskId: string, eventType: OrchestrationEventType, details?: Record<string, unknown>): void {
    this.events.push({
      timestamp: new Date().toISOString(),
      runId,
      taskId,
      eventType,
      details
    });
  }

  /**
   * Ejecuta el ciclo de vida completo de una tarea individual.
   */
  public async processTask(plan: OrchestrationPlan, task: OrchestrationTask): Promise<boolean> {
    const { runId, baseCommit, environment } = plan;

    // 1. Verificar dependencias completadas
    if (task.dependencies && task.dependencies.length > 0) {
      const allDepsValid = task.dependencies.every((depId) => {
        const depTask = plan.tasks.find((t) => t.id === depId);
        return depTask && (depTask.status === "VALIDATED" || depTask.status === "INTEGRATED");
      });

      if (!allDepsValid) {
        task.status = "BLOCKED";
        return false;
      }
    }

    // 2. Comprobar compuerta de aprobación si es acción sensible o entorno PRODUCTION
    if (task.sensitiveAction || environment === "PRODUCTION") {
      const actionToCheck = task.sensitiveAction ?? "cloudrun.deploy";
      if (!this.approvalStore.hasValidApproval(runId, actionToCheck)) {
        task.status = "BLOCKED";
        task.lastFailureType = "APPROVAL_REQUIRED";
        task.lastError = `Acción sensible '${actionToCheck}' requiere aprobación explícita humana antes de su ejecución`;
        this.approvalStore.requestApproval(runId, actionToCheck, plan.requestedBy, task.lastError);
        this.emitEvent(runId, task.id, "APPROVAL_REQUESTED", { action: actionToCheck });
        return false;
      }
    }

    // 3. Reclamar la tarea mediante lease atómico
    const leaseAttempt = this.leaseManager.acquireTaskLease(runId, task.id, this.workerId, this.leaseTtlMs);
    if (!leaseAttempt.acquired || !leaseAttempt.lease) {
      return false; // Tarea retenida por otro worker o en proceso
    }

    task.status = "RUNNING";
    task.lease = leaseAttempt.lease;
    this.emitEvent(runId, task.id, "TASK_CLAIMED", { workerId: this.workerId, lease: leaseAttempt.lease });

    // 4. Iniciar heartbeat periódico durante la ejecución
    let heartbeatTimer: NodeJS.Timeout | null = setInterval(() => {
      const refreshed = this.leaseManager.heartbeatTaskLease(runId, task.id, this.workerId, this.leaseTtlMs);
      if (!refreshed && heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }, this.heartbeatIntervalMs);

    let worktree: WorktreeInstance | null = null;

    try {
      // 5. Crear worktree aislado a partir del baseCommit reproducible
      worktree = await this.worktreeManager.createWorktree({
        runId,
        taskId: task.id,
        baseCommit
      });
      task.assignedWorktreePath = worktree.worktreePath;
      this.emitEvent(runId, task.id, "WORKTREE_CREATED", { path: worktree.worktreePath });

      // 6. Preparar manifest y ejecutar agente
      this.emitEvent(runId, task.id, "AGENT_STARTED", { role: task.agentRole });
      const manifest = {
        runId,
        taskId: task.id,
        agentRole: task.agentRole || task.ownerAgent || "orchestrator",
        workspacePath: worktree.worktreePath,
        baseCommit,
        environment,
        filesAllowed: task.filesAllowed,
        filesForbidden: task.filesForbidden,
        prompt: `Implementar tarea ${task.title}`
      };

      const result = await this.agentProvider.execute(manifest);
      this.emitEvent(runId, task.id, "AGENT_FINISHED", { exitCode: result.exitCode });

      // 7. Validación independiente (Validation Gate)
      this.emitEvent(runId, task.id, "VALIDATION_STARTED");
      const validation = await this.validationGate.validate(task, result, worktree.worktreePath);

      if (!validation.valid) {
        this.emitEvent(runId, task.id, "VALIDATION_FAILED", { errors: validation.errors });
        this.handleFailure(task, "VALIDATION_FAILURE", validation.errors.join("; "));
        return false;
      }

      this.emitEvent(runId, task.id, "VALIDATION_PASSED");
      task.status = "VALIDATED";
      if (result.commitSha) {
        task.commitSha = result.commitSha;
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.handleFailure(task, "TRANSIENT_FAILURE", message);
      this.emitEvent(runId, task.id, "TASK_FAILED", { error: message });
      return false;
    } finally {
      // 8. Detener heartbeat
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }

      // 9. Cleanup garantizado del worktree
      if (worktree) {
        try {
          await this.worktreeManager.removeWorktree(worktree);
          this.emitEvent(runId, task.id, "WORKTREE_CLEANED");
        } catch (cleanupErr) {
          console.warn(`[Worker] Error limpiando worktree ${worktree.worktreePath}:`, cleanupErr);
        }
      }

      // 10. Liberar lease
      this.leaseManager.releaseTaskLease(runId, task.id, this.workerId);
    }
  }

  private handleFailure(task: OrchestrationTask, failureType: FailureType, errorMsg: string): void {
    task.attempts = (task.attempts ?? 0) + 1;
    task.lastFailureType = failureType;
    task.lastError = errorMsg;

    const maxRetries = task.maxRetries ?? 2;
    if (task.attempts < maxRetries && failureType === "TRANSIENT_FAILURE") {
      task.status = "READY";
      const backoffMs = Math.pow(2, task.attempts) * 1000;
      task.nextAttemptAt = Date.now() + backoffMs;
    } else {
      task.status = "FAILED";
    }
  }
}
