import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest, authorizePermission } from "@/server/security/auth";
import { CampaignRepository } from "@/server/repositories";
import { CampaignLifecycleStage } from "@/server/domain/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { campaignId } = await params;
  const repo = new CampaignRepository();
  const campaign = await repo.findById(campaignId);

  if (!campaign) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!authorizePermission(user, "campaign:edit")) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  const { campaignId } = await params;
  try {
    const body = await req.json();
    const repo = new CampaignRepository();
    const existing = await repo.findById(campaignId);
    if (!existing) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;

    // Validar máquina de estados si se intenta cambiar lifecycleStage o status
    const targetStage = body.lifecycleStage || (body.status as any);
    if (targetStage && targetStage !== existing.lifecycleStage) {
      const { validateCampaignTransition } = await import("@/server/domain/types");
      const qualityPassed = body.qualityState?.passed ?? existing.qualityState?.passed;
      const isApproved = existing.lifecycleStage === "APPROVED" || body.lifecycleStage === "APPROVED";
      const validation = validateCampaignTransition(existing.lifecycleStage, targetStage, {
        qualityPassed,
        isApproved
      });

      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.reason || "Transición de estado rechazada por la máquina de estados." },
          { status: 400 }
        );
      }
    }

    if (body.status !== undefined) updates.status = body.status;
    if (body.lifecycleStage !== undefined) updates.lifecycleStage = body.lifecycleStage;
    if (body.objective !== undefined) updates.objective = body.objective;
    if (body.targetAudience !== undefined) updates.targetAudience = body.targetAudience;
    if (body.productIds !== undefined) updates.productIds = body.productIds;
    if (body.sourceIds !== undefined) updates.sourceIds = body.sourceIds;
    if (body.editorialControls !== undefined) updates.editorialControls = body.editorialControls;
    if (body.groundingState !== undefined) updates.groundingState = body.groundingState;
    if (body.contentState !== undefined) updates.contentState = body.contentState;
    if (body.assetState !== undefined) updates.assetState = body.assetState;
    if (body.channelState !== undefined) updates.channelState = body.channelState;
    if (body.qualityState !== undefined) updates.qualityState = body.qualityState;
    if (body.reviewState !== undefined) updates.reviewState = body.reviewState;
    if (body.spentEur !== undefined) updates.spentEur = body.spentEur;
    if (body.aiCostEur !== undefined) updates.aiCostEur = body.aiCostEur;

    // Handle version snapshots
    if (body.newVersionSnapshot) {
      const currentVersions = existing.versions || [];
      updates.versions = [
        ...currentVersions,
        {
          version: currentVersions.length + 1,
          timestamp: new Date().toISOString(),
          updatedBy: user.uid,
          ...body.newVersionSnapshot
        }
      ];
    }

    updates.updatedBy = user.uid;
    await repo.update(campaignId, updates);
    const updated = await repo.findById(campaignId);

    return NextResponse.json({ success: true, campaign: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
