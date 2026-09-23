import { advanceStatuses, assertPlanIntegrity, buildF6AuditPlan, getReadyTasks, createLease, isLeaseExpired } from "../src/server/orchestrator";

const plan = buildF6AuditPlan();
assertPlanIntegrity(plan.tasks);
const ready = getReadyTasks(advanceStatuses(plan.tasks));
if (ready.length !== 8) throw new Error(`Expected 8 READY tasks, got ${ready.length}`);

const lease = createLease("F6-A", "security");
if (isLeaseExpired(lease)) throw new Error("Fresh lease unexpectedly expired");
if (isLeaseExpired(lease, Date.now() + 61_000) === false) throw new Error("Expired lease unexpectedly valid");

console.log("ORCHESTRATOR TESTS: PASS");
console.log(`Ready tasks: ${ready.map((task) => task.id).join(", ")}`);
