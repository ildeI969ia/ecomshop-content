import type { TaskState, TaskStatus } from "./types";

function dependencyReady(task: TaskState, byId: ReadonlyMap<string, TaskState>): boolean {
  return task.dependencies.every((id) => {
    const dependency = byId.get(id);
    return dependency?.status === "VALIDATED" || dependency?.status === "INTEGRATED";
  });
}

function overlaps(a: TaskState, b: TaskState): boolean {
  return a.filesAllowed.some((aPath) =>
    b.filesAllowed.some((bPath) => {
      if (aPath === bPath) return true;
      if (aPath.endsWith("/**") && bPath.startsWith(aPath.slice(0, -3))) return true;
      if (bPath.endsWith("/**") && aPath.startsWith(bPath.slice(0, -3))) return true;
      return false;
    }),
  );
}

export function getReadyTasks(tasks: readonly TaskState[]): TaskState[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const active = tasks.filter((task) => task.status === "RUNNING");

  return tasks.filter((task) => {
    if (task.status !== "PENDING" || !dependencyReady(task, byId)) return false;
    if (task.parallelism === "RED") return active.length === 0;
    return !active.some((running) => overlaps(task, running));
  });
}

export function advanceStatuses(tasks: readonly TaskState[]): TaskState[] {
  const ready = new Set(getReadyTasks(tasks).map((task) => task.id));
  return tasks.map((task) => ({
    ...task,
    status: task.status === "PENDING" && ready.has(task.id) ? "READY" : task.status,
  }));
}

export function assertNoDependencyCycles(tasks: readonly TaskState[]): void {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): void => {
    if (visiting.has(id)) throw new Error(`ORCHESTRATOR_DEPENDENCY_CYCLE: ${id}`);
    if (visited.has(id)) return;
    const task = byId.get(id);
    if (!task) throw new Error(`ORCHESTRATOR_UNKNOWN_DEPENDENCY: ${id}`);
    visiting.add(id);
    task.dependencies.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  };

  tasks.forEach((task) => visit(task.id));
}

export function assertPlanIntegrity(tasks: readonly TaskState[]): void {
  assertNoDependencyCycles(tasks);
  const ids = new Set<string>();

  for (const task of tasks) {
    if (ids.has(task.id)) throw new Error(`ORCHESTRATOR_DUPLICATE_TASK: ${task.id}`);
    ids.add(task.id);
    if (task.dependencies.includes(task.id)) throw new Error(`ORCHESTRATOR_SELF_DEPENDENCY: ${task.id}`);
  }
}

export function isTerminal(status: TaskStatus): boolean {
  return status === "VALIDATED" || status === "INTEGRATED" || status === "REJECTED";
}
