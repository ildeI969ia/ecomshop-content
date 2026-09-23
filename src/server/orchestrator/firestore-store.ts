import { getFirestore } from "firebase-admin/firestore";
import type { OrchestrationPlan, TaskState } from "./types";
import type { TaskStore } from "./runtime";

export class FirestoreOrchestrationStore implements TaskStore {
  private readonly db = getFirestore();

  async get(runId: string): Promise<OrchestrationPlan | null> {
    const snapshot = await this.db.collection("orchestrationRuns").doc(runId).get();
    if (!snapshot.exists) return null;
    return snapshot.data() as OrchestrationPlan;
  }

  async save(plan: OrchestrationPlan): Promise<void> {
    await this.db.collection("orchestrationRuns").doc(plan.id).set({
      ...plan,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  async updateTask(
    runId: string,
    taskId: string,
    update: (task: TaskState, plan: OrchestrationPlan) => void,
  ): Promise<void> {
    const ref = this.db.collection("orchestrationRuns").doc(runId);
    await this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new Error(`ORCHESTRATOR_RUN_NOT_FOUND: ${runId}`);
      const plan = snapshot.data() as OrchestrationPlan;
      const task = plan.tasks.find((candidate) => candidate.id === taskId);
      if (!task) throw new Error(`ORCHESTRATOR_TASK_NOT_FOUND: ${taskId}`);
      update(task, plan);
      tx.set(ref, { tasks: plan.tasks, artifacts: plan.artifacts, updatedAt: new Date().toISOString() }, { merge: true });
    });
  }
}
