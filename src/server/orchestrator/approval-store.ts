import { ApprovalRecord, SensitiveActionType } from "./types";

export class ApprovalStore {
  private records: Map<string, ApprovalRecord> = new Map();

  private makeKey(runId: string, action: SensitiveActionType): string {
    return `${runId}:::${action}`;
  }

  /**
   * Solicita una aprobación humana para una acción sensible en un run.
   */
  public requestApproval(
    runId: string,
    action: SensitiveActionType,
    requestedBy: string,
    reason?: string
  ): ApprovalRecord {
    const key = this.makeKey(runId, action);
    const existing = this.records.get(key);

    if (existing && existing.status === "GRANTED") {
      return existing;
    }

    const record: ApprovalRecord = {
      approvalId: `appr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      runId,
      action,
      requestedBy,
      status: "PENDING",
      requestedAt: new Date().toISOString(),
      reason
    };

    this.records.set(key, record);
    return record;
  }

  /**
   * Resuelve una solicitud de aprobación (GRANTED o REJECTED).
   */
  public resolveApproval(
    runId: string,
    action: SensitiveActionType,
    approver: string,
    decision: "GRANTED" | "REJECTED",
    reason?: string
  ): ApprovalRecord {
    const key = this.makeKey(runId, action);
    const record = this.records.get(key);

    if (!record) {
      throw new Error(`No existe solicitud de aprobación pendiente para runId=${runId} action=${action}`);
    }

    record.status = decision;
    record.approver = approver;
    record.resolvedAt = new Date().toISOString();
    if (reason) {
      record.reason = reason;
    }

    return record;
  }

  /**
   * Comprueba si una acción sensible cuenta con aprobación válida y activa.
   */
  public hasValidApproval(runId: string, action: SensitiveActionType): boolean {
    const record = this.records.get(this.makeKey(runId, action));
    return Boolean(record && record.status === "GRANTED");
  }

  public getApproval(runId: string, action: SensitiveActionType): ApprovalRecord | undefined {
    return this.records.get(this.makeKey(runId, action));
  }

  public clear(): void {
    this.records.clear();
  }
}
