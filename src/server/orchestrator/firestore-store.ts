import { getFirestore } from "firebase-admin/firestore";
import type { OrchestrationPlan } from "./types";
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
}
