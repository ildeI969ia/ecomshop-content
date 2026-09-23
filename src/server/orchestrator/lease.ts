export interface AgentLease {
  taskId: string;
  agentId: string;
  acquiredAt: string;
  expiresAt: string;
  heartbeatAt: string;
}

export function createLease(taskId: string, agentId: string, ttlMs = 60_000): AgentLease {
  const now = Date.now();
  return {
    taskId,
    agentId,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    heartbeatAt: new Date(now).toISOString(),
  };
}

export function isLeaseExpired(lease: AgentLease, now = Date.now()): boolean {
  return new Date(lease.expiresAt).getTime() <= now;
}
