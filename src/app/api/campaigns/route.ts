import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { CampaignRepository } from "@/server/repositories";
import { Campaign } from "@/server/domain/types";

export const GET = withAuthAndPermission("campaign:view", async (req: NextRequest, user) => {
  const repo = new CampaignRepository();
  try {
    const list = await repo.listByWorkspace(user.workspaceId);
    return NextResponse.json({ campaigns: list });
  } catch (err: any) {
    return NextResponse.json({ campaigns: [], error: err?.message }, { status: 200 });
  }
});

export const POST = withAuthAndPermission("campaign:create", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const repo = new CampaignRepository();
    const campaign: Campaign = {
      id: body.id || `camp-${Date.now()}`,
      workspaceId: user.workspaceId,
      code: body.code || `CAMP-${Date.now().toString().slice(-4)}`,
      name: body.name || `Campaña ${body.productIds?.[0] || "B2B"}`,
      status: body.status || "DRAFT",
      lifecycleStage: body.lifecycleStage || "DRAFT",
      objective: body.objective || "",
      targetAudience: body.targetAudience || "",
      opportunityId: body.opportunityId,
      targetPipelineEur: body.targetPipelineEur || 0,
      budgetEur: body.budgetEur || 0,
      spentEur: body.spentEur || 0,
      aiCostEur: body.aiCostEur || 0,
      productIds: body.productIds || [],
      sourceIds: body.sourceIds || [],
      editorialControls: body.editorialControls,
      groundingState: body.groundingState,
      contentState: body.contentState,
      assetState: body.assetState,
      channelState: body.channelState,
      qualityState: body.qualityState,
      reviewState: body.reviewState,
      versions: body.versions || [],
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
});
