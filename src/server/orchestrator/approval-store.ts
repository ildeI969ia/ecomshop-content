import { getFirestore } from "firebase-admin/firestore";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface OrchestrationApproval {
  id: string;
  runId: string;
  requestedBy: string;
  reason: string;
  action: string;
  status: ApprovalStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

export class FirestoreApprovalStore {
  private readonly db = getFirestore();

  async create(input: Omit<OrchestrationApproval, "createdAt" | "status">): Promise<OrchestrationApproval> {
    const approval: OrchestrationApproval = { ...input, status: "PENDING", createdAt: new Date().toISOString() };
    await this.db.collection("orchestrationApprovals").doc(approval.id).create(approval);
    return approval;
  }

  async get(id: string): Promise<OrchestrationApproval | null> {
    const snapshot = await this.db.collection("orchestrationApprovals").doc(id).get();
    return snapshot.exists ? snapshot.data() as OrchestrationApproval : null;
  }

  async decide(id: string, status: Extract<ApprovalStatus, "APPROVED" | "REJECTED">, decidedBy: string): Promise<OrchestrationApproval> {
    const ref = this.db.collection("orchestrationApprovals").doc(id);
    return this.db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new Error("ORCHESTRATOR_APPROVAL_NOT_FOUND");
      const current = snapshot.data() as OrchestrationApproval;
      if (current.status !== "PENDING") throw new Error("ORCHESTRATOR_APPROVAL_ALREADY_DECIDED");
      const next = { ...current, status, decidedAt: new Date().toISOString(), decidedBy };
      tx.set(ref, next);
      return next;
    });
  }
}
