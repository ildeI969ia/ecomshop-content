import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { hasPermission } from "@/server/security/rbac";
import { CampaignRepository } from "@/server/repositories";

export const GET = withAuthAndPermission("campaign:view", async (req: NextRequest, user) => {
  const url = new URL(req.url);
  const campaignId = url.pathname.split("/").pop();

  if (!campaignId) {
    return NextResponse.json({ error: "ID de campaña requerido" }, { status: 400 });
  }

  const repo = new CampaignRepository();
  const campaign = await repo.findById(campaignId);

  if (!campaign) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }

  if (campaign.workspaceId && campaign.workspaceId !== user.workspaceId) {
    return NextResponse.json({ error: "Acceso no autorizado al workspace de esta campaña" }, { status: 403 });
  }

  return NextResponse.json({ campaign });
});

export const PATCH = withAuthAndPermission("campaign:edit", async (req: NextRequest, user) => {
  const url = new URL(req.url);
  const campaignId = url.pathname.split("/").pop();

  if (!campaignId) {
    return NextResponse.json({ error: "ID de campaña requerido" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const repo = new CampaignRepository();
    const existing = await repo.findById(campaignId);
    if (!existing) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    if (existing.workspaceId && existing.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "Acceso no autorizado al workspace de esta campaña" }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;

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
    if (body.spentEur !== undefined || body.aiCostEur !== undefined) {
      if (user.role !== "ADMIN" && !hasPermission(user.role, "finops:manage")) {
        return NextResponse.json(
          { error: "No tiene permisos para modificar los costes de la campaña (spentEur/aiCostEur)." },
          { status: 403 }
        );
      }
      if (body.spentEur !== undefined) updates.spentEur = body.spentEur;
      if (body.aiCostEur !== undefined) updates.aiCostEur = body.aiCostEur;
    }

    if (body.newVersionSnapshot) {
      const currentVersions = existing.versions || [];
      const { version, updatedBy, timestamp, ...cleanSnapshot } = body.newVersionSnapshot || {};
      updates.versions = [
        ...currentVersions,
        {
          ...cleanSnapshot,
          version: currentVersions.length + 1,
          timestamp: new Date().toISOString(),
          updatedBy: user.uid
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
});
