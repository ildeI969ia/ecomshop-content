import type { OrchestrationPlan, TaskState } from "./types";

export interface TaskStore {
  get(runId: string): Promise<OrchestrationPlan | null>;
  save(plan: OrchestrationPlan): Promise<void>;
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

export async function executeReadyTasks(
  plan: OrchestrationPlan,
  executor: AgentExecutor,
  store: TaskStore,
): Promise<OrchestrationPlan> {
  const ready = plan.tasks.filter((t) => t.status === "READY").slice(0, plan.maxConcurrentAgents);
  for (const task of ready) {
    task.status = "RUNNING";
    task.startedAt = new Date().toISOString();
  }
  await store.save(plan);

  await Promise.all(ready.map(async (task) => {
    try {
      const result = await executor.execute(task, plan);
      task.status = "VALIDATED";
      task.finishedAt = new Date().toISOString();
      task.commit = result.commit;
      plan.artifacts.push(...(result.artifacts ?? []));
    } catch (error) {
      task.status = "FAILED";
      task.finishedAt = new Date().toISOString();
      task.error = error instanceof Error ? error.message : String(error);
    }
  }));

  await store.save(plan);
  return plan;
}

export function requireProductionApproval(approved: boolean, action: string): void {
  if (!approved) throw new Error(`ORCHESTRATOR_APPROVAL_REQUIRED: ${action}`);
}
