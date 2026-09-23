import type { OrchestrationPlan, TaskState } from "./types";
import { acquireTaskLease, releaseTaskLease } from "./lease";
import type { AgentLease } from "./types";

export interface TaskStore {
  get(runId: string): Promise<OrchestrationPlan | null>;
  save(plan: OrchestrationPlan): Promise<void>;
  updateTask(runId: string, taskId: string, update: (task: TaskState, plan: OrchestrationPlan) => void): Promise<void>;
}

export interface AgentExecutor {
  execute(task: TaskState, plan: OrchestrationPlan): Promise<{
    summary: string;
    artifacts?: OrchestrationPlan["artifacts"];
    commit?: string;
  }>;
}

export interface ApprovalGate {
  approve(input: { runId: string; reason: string }): Promise<boolean>;
}

export interface TaskClaimer {
  claim(runId: string, task: TaskState, agentId: string): Promise<AgentLease | null>;
  release(runId: string, taskId: string, agentId: string): Promise<void>;
}

export const firestoreTaskClaimer: TaskClaimer = {
  claim: acquireTaskLease,
  release: releaseTaskLease,
};

function retryDelayMs(attempt: number): number {
  return Math.min(60_000, 1_000 * 2 ** Math.max(0, attempt - 1));
}

export async function executeReadyTasks(
  plan: OrchestrationPlan,
  executor: AgentExecutor,
  store: TaskStore,
  claimer: TaskClaimer = firestoreTaskClaimer,
): Promise<OrchestrationPlan> {
  const ready = plan.tasks
    .filter((task) => task.status === "READY")
    .filter((task) => !task.nextAttemptAt || new Date(task.nextAttemptAt).getTime() <= Date.now())
    .slice(0, plan.maxConcurrentAgents);

  const claimed: Array<{ task: TaskState; lease: AgentLease }> = [];
  for (const task of ready) {
    const lease = await claimer.claim(plan.id, task, task.ownerAgent);
    if (lease) {
      task.status = "RUNNING";
      task.startedAt = new Date().toISOString();
      task.attempts = (task.attempts ?? 0) + 1;
      claimed.push({ task, lease });
    }
  }
  await Promise.all(claimed.map(async ({ task, lease }) => {
    try {
      const result = await executor.execute(task, plan);
      task.status = "VALIDATED";
      task.finishedAt = new Date().toISOString();
      task.commit = result.commit;
      task.error = undefined;
      task.nextAttemptAt = undefined;
      await store.updateTask(plan.id, task.id, (storedTask, storedPlan) => {
        Object.assign(storedTask, task);
        storedTask.lease = undefined;
        storedPlan.artifacts.push(...(result.artifacts ?? []));
      });
    } catch (error) {
      const attempts = task.attempts ?? 1;
      const maxAttempts = task.maxAttempts ?? 3;
      task.error = error instanceof Error ? error.message : String(error);
      task.finishedAt = new Date().toISOString();
      if (attempts < maxAttempts) {
        task.status = "READY";
        task.nextAttemptAt = new Date(Date.now() + retryDelayMs(attempts)).toISOString();
      } else {
        task.status = "FAILED";
      }
      await store.updateTask(plan.id, task.id, (storedTask) => {
        Object.assign(storedTask, task);
        storedTask.lease = undefined;
      });
    } finally {
      await claimer.release(plan.id, task.id, lease.agentId);
    }
  }));
  return plan;
}

export function requireProductionApproval(approved: boolean, action: string): void {
  if (!approved) throw new Error(`ORCHESTRATOR_APPROVAL_REQUIRED: ${action}`);
}
