import { getAdminFirestore } from "../config/firebase";
import type { OrchestrationPlan, TaskState } from "./types";

export interface StoredOrchestrationRun extends OrchestrationPlan {
  workspaceId?: string;
  updatedAt?: string;
}

export class FirestoreOrchestrationStore {
  private get db() {
    return getAdminFirestore();
  }

  /**
   * Recupera un plan de orquestación de la colección "orchestrationRuns".
   * Si se especifica workspaceId, valida que pertenezca a dicho workspace.
   */
  async get(runId: string, workspaceId?: string): Promise<OrchestrationPlan | null> {
    const docRef = this.db.collection("orchestrationRuns").doc(runId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() as StoredOrchestrationRun;

    if (workspaceId && data.workspaceId && data.workspaceId !== workspaceId) {
      return null;
    }

    return data as OrchestrationPlan;
  }

  /**
   * Persiste atómicamente un plan en "orchestrationRuns" usando plan.runId || plan.id.
   * Incluye workspaceId (si se proporciona) y updatedAt en formato ISO.
   * Usa merge: true.
   */
  async save(plan: OrchestrationPlan, workspaceId?: string): Promise<void> {
    const docId = plan.runId || plan.id;
    if (!docId) {
      throw new Error("ORCHESTRATOR_INVALID_PLAN: El plan debe contener un 'runId' o 'id' válido.");
    }

    const payload: Partial<StoredOrchestrationRun> = {
      ...plan,
      updatedAt: new Date().toISOString(),
    };

    if (workspaceId) {
      payload.workspaceId = workspaceId;
    }

    await this.db.collection("orchestrationRuns").doc(docId).set(payload, { merge: true });
  }

  /**
   * Actualiza transaccionalmente una tarea dentro del plan de orquestación.
   * Valida existencia del documento y pertenencia al workspace si se especifica.
   */
  async updateTask(
    runId: string,
    taskId: string,
    update: (task: TaskState, plan: OrchestrationPlan) => void,
    workspaceId?: string
  ): Promise<void> {
    const docRef = this.db.collection("orchestrationRuns").doc(runId);

    await this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);

      if (!snapshot.exists) {
        throw new Error(`ORCHESTRATOR_RUN_NOT_FOUND: No se encontró el run '${runId}'`);
      }

      const plan = snapshot.data() as StoredOrchestrationRun;

      if (workspaceId && plan.workspaceId && plan.workspaceId !== workspaceId) {
        throw new Error(
          `ORCHESTRATOR_TENANT_MISMATCH: El run '${runId}' pertenece a '${plan.workspaceId}', no a '${workspaceId}'`
        );
      }

      const task = plan.tasks.find((candidate) => candidate.id === taskId);
      if (!task) {
        throw new Error(`ORCHESTRATOR_TASK_NOT_FOUND: Tarea '${taskId}' no encontrada en run '${runId}'`);
      }

      update(task, plan);

      tx.set(
        docRef,
        {
          tasks: plan.tasks,
          artifacts: plan.artifacts,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  }
}
