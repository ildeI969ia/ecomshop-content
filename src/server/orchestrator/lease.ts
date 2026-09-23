import { getFirestore } from "firebase-admin/firestore";
import type { TaskState } from "./types";
import type { AgentLease } from "./types";

export function createLease(taskId: string, agentId: string, ttlMs = 60_000): AgentLease {
  const now = Date.now();
  return {
    taskId, agentId,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    heartbeatAt: new Date(now).toISOString(),
  };
}

export function isLeaseExpired(lease: AgentLease, now = Date.now()): boolean {
  return new Date(lease.expiresAt).getTime() <= now;
}

export async function acquireTaskLease(
  runId: string,
  task: TaskState,
  agentId: string,
  ttlMs = 60_000,
): Promise<AgentLease | null> {
  const db = getFirestore();
  const ref = db.collection("orchestrationRuns").doc(runId);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return null;
    const plan = snapshot.data() as { tasks: TaskState[] };
    const current = plan.tasks.find((candidate) => candidate.id === task.id);
    if (!current || (current.status !== "READY" && current.status !== "RUNNING")) return null;
    if (current.lease && !isLeaseExpired(current.lease)) return null;
    const lease = createLease(task.id, agentId, ttlMs);
    const tasks = plan.tasks.map((candidate) =>
      candidate.id === task.id ? { ...candidate, status: "RUNNING", lease } : candidate,
    );
    tx.set(ref, { tasks, updatedAt: new Date().toISOString() }, { merge: true });
    return lease;
  });
}

export async function releaseTaskLease(runId: string, taskId: string, agentId: string): Promise<void> {
  const db = getFirestore();
  const ref = db.collection("orchestrationRuns").doc(runId);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return;
    const plan = snapshot.data() as { tasks: TaskState[] };
    const tasks = plan.tasks.map((task) => {
      if (task.id !== taskId || task.lease?.agentId !== agentId) return task;
      const { lease: _ignored, ...withoutLease } = task;
      return withoutLease;
    });
    tx.set(ref, { tasks, updatedAt: new Date().toISOString() }, { merge: true });
  });
}
