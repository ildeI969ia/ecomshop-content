import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest, authorizePermission } from "@/server/security/auth";
import { CampaignRepository } from "@/server/repositories";
import { Campaign } from "@/server/domain/types";

export async function GET(req: NextRequest) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const repo = new CampaignRepository();
  try {
    const list = await repo.listByWorkspace(user.workspaceId);
    return NextResponse.json({ campaigns: list });
  } catch (err: any) {
    return NextResponse.json({ campaigns: [], error: err?.message }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!authorizePermission(user, "campaign:create")) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const repo = new CampaignRepository();
    const campaign: Campaign = {
      id: `camp-${Date.now()}`,
      workspaceId: user.workspaceId,
      code: body.code || `CAMP-${Date.now().toString().slice(-4)}`,
      name: body.name,
      status: body.status || "DRAFT",
      objective: body.objective || "",
      targetAudience: body.targetAudience || "",
      targetPipelineEur: body.targetPipelineEur || 0,
      budgetEur: body.budgetEur || 0,
      spentEur: 0,
      aiCostEur: 0,
      productIds: body.productIds || [],
      sourceIds: body.sourceIds || [],
      ownerId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.uid,
      updatedBy: user.uid
    };

    await repo.create(campaign);
    return NextResponse.json({ success: true, campaign });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
