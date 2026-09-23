import { TaskLease } from "./types";

export class LeaseManager {
  private leases: Map<string, TaskLease> = new Map();

  private leaseKey(runId: string, taskId: string): string {
    return `${runId}:::${taskId}`;
  }

  /**
   * Intenta adquirir un lease de forma atómica.
   * Si existe un lease vigente de otro agente, retorna false.
   * Si el lease expiró o es del mismo agente, se adquiere y retorna true.
   */
  public acquireTaskLease(
    runId: string,
    taskId: string,
    agentId: string,
    ttlMs: number = 30000
  ): { acquired: boolean; lease?: TaskLease; reason?: string } {
    const key = this.leaseKey(runId, taskId);
    const now = Date.now();
    const existing = this.leases.get(key);

    if (existing && existing.expiresAt > now && existing.agentId !== agentId) {
      return {
        acquired: false,
        reason: `Tarea actualmente retenida por agente ${existing.agentId} hasta ${new Date(existing.expiresAt).toISOString()}`
      };
    }

    const newLease: TaskLease = {
      runId,
      taskId,
      agentId,
      acquiredAt: now,
      expiresAt: now + ttlMs,
      ttlMs
    };

    this.leases.set(key, newLease);
    return { acquired: true, lease: newLease };
  }

  /**
   * Actualiza el heartbeat de un lease extendiendo su tiempo de expiración.
   * Falla si el lease ya expiró o pertenece a otro agente.
   */
  public heartbeatTaskLease(
    runId: string,
    taskId: string,
    agentId: string,
    ttlMs: number = 30000
  ): boolean {
    const key = this.leaseKey(runId, taskId);
    const now = Date.now();
    const existing = this.leases.get(key);

    if (!existing) {
      return false;
    }

    if (existing.agentId !== agentId) {
      return false;
    }

    if (existing.expiresAt <= now) {
      return false; // El lease ya expiró y no puede renovarse tardíamente
    }

    existing.expiresAt = now + ttlMs;
    existing.ttlMs = ttlMs;
    return true;
  }

  /**
   * Libera el lease de una tarea.
   */
  public releaseTaskLease(runId: string, taskId: string, agentId: string): boolean {
    const key = this.leaseKey(runId, taskId);
    const existing = this.leases.get(key);

    if (!existing) {
      return true;
    }

    if (existing.agentId !== agentId) {
      return false;
    }

    this.leases.delete(key);
    return true;
  }

  public getLease(runId: string, taskId: string): TaskLease | undefined {
    return this.leases.get(this.leaseKey(runId, taskId));
  }

  public clear(): void {
    this.leases.clear();
  }
}
