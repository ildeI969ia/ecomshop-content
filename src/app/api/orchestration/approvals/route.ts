import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { FirestoreApprovalStore } from "@/server/orchestrator/approval-store";
import { requireOrchestratorPermission } from "@/server/orchestrator/http";

export async function POST(req: NextRequest) {
  const auth = await requireOrchestratorPermission(req, "audit:view");
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  if (typeof body.runId !== "string" || typeof body.action !== "string" || typeof body.reason !== "string") {
    return NextResponse.json({ error: "INVALID_APPROVAL_REQUEST" }, { status: 400 });
  }
  const approval = await new FirestoreApprovalStore().create({
    id: randomUUID(), runId: body.runId, requestedBy: auth.user.email, reason: body.reason, action: body.action,
  });
  return NextResponse.json(approval, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireOrchestratorPermission(req, "users:manage");
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string" || !["APPROVED", "REJECTED"].includes(body.status)) {
    return NextResponse.json({ error: "INVALID_APPROVAL_DECISION" }, { status: 400 });
  }
  const approval = await new FirestoreApprovalStore().decide(body.id, body.status, auth.user.email);
  return NextResponse.json(approval);
}
