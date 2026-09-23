import { NextRequest, NextResponse } from "next/server";
import { FirestoreOrchestrationStore } from "@/server/orchestrator/firestore-store";
import { advanceStatuses } from "@/server/orchestrator/scheduler";
import { requireOrchestratorPermission } from "@/server/orchestrator/http";

export async function POST(req: NextRequest) {
  const auth = await requireOrchestratorPermission(req, "ai:execute");
  if (auth instanceof NextResponse) return auth;
  const { runId } = await req.json().catch(() => ({}));
  if (typeof runId !== "string" || !runId) return NextResponse.json({ error: "RUN_ID_REQUIRED" }, { status: 400 });
  const store = new FirestoreOrchestrationStore();
  const plan = await store.get(runId);
  if (!plan) return NextResponse.json({ error: "RUN_NOT_FOUND" }, { status: 404 });
  plan.tasks = advanceStatuses(plan.tasks);
  await store.save(plan);
  return NextResponse.json({ runId, status: "RESUMED", tasks: plan.tasks });
}
