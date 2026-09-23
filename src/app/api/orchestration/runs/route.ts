import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { buildF6AuditPlan } from "@/server/orchestrator/plan-builder";
import { FirestoreOrchestrationStore } from "@/server/orchestrator/firestore-store";
import { advanceStatuses } from "@/server/orchestrator/scheduler";
import { requireOrchestratorPermission } from "@/server/orchestrator/http";

export async function POST(req: NextRequest) {
  const auth = await requireOrchestratorPermission(req, "ai:execute");
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  if (body !== null && typeof body !== "object") return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const plan = buildF6AuditPlan();
  plan.id = randomUUID();
  plan.tasks = advanceStatuses(plan.tasks);
  await new FirestoreOrchestrationStore().save(plan);
  return NextResponse.json({ runId: plan.id, status: "CREATED", taskCount: plan.tasks.length });
}

export async function GET(req: NextRequest) {
  const auth = await requireOrchestratorPermission(req, "audit:view");
  if (auth instanceof NextResponse) return auth;
  const runId = new URL(req.url).searchParams.get("runId");
  if (!runId) return NextResponse.json({ error: "RUN_ID_REQUIRED" }, { status: 400 });
  const plan = await new FirestoreOrchestrationStore().get(runId);
  if (!plan) return NextResponse.json({ error: "RUN_NOT_FOUND" }, { status: 404 });
  return NextResponse.json(plan);
}
