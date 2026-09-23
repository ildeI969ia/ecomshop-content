import { advanceStatuses, assertPlanIntegrity, buildF6AuditPlan, getReadyTasks } from "../src/server/orchestrator";

const plan = buildF6AuditPlan();
assertPlanIntegrity(plan.tasks);
const advanced = advanceStatuses(plan.tasks);
const ready = getReadyTasks(advanced);

if (ready.length !== 8) throw new Error(`Expected 8 independent F6 audit tasks to be READY, got ${ready.length}`);
console.log("ORCHESTRATOR TESTS: PASS");
console.log(`Plan: ${plan.id}`);
console.log(`Ready tasks: ${ready.map((task) => task.id).join(", ")}`);
