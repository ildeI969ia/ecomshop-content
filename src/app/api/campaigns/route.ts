import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { CampaignRepository, ContentRepository } from "@/server/repositories";
import { Campaign } from "@/server/domain/types";

export const GET = withAuthAndPermission("campaign:view", async (req: NextRequest, user) => {
  const repo = new CampaignRepository();
  const url = new URL(req.url);
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const sku = url.searchParams.get("sku");

  try {
    let list = await repo.listByWorkspace(user.workspaceId);
    if (!includeArchived) {
      list = list.filter((c) => c.status !== "ARCHIVED");
    }
    if (sku) {
      const cleanSku = sku.trim().toUpperCase();
      list = list.filter((c) => c.productIds?.some((p) => p.toUpperCase() === cleanSku));
    }
    return NextResponse.json({ campaigns: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ campaigns: [], error: message }, { status: 200 });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const DELETE = withAuthAndPermission("campaign:delete", async (req: NextRequest, user) => {
  const url = new URL(req.url);
  const sku = url.searchParams.get("sku");
  const hardDelete = url.searchParams.get("hard") === "true";
  const cascadeContents = url.searchParams.get("cascade") !== "false";

  if (!sku) {
    return NextResponse.json({ error: "Parámetro 'sku' requerido para borrar campañas asociadas a un producto." }, { status: 400 });
  }

  try {
    const campaignRepo = new CampaignRepository();
    const contentRepo = new ContentRepository();

    const cleanSku = sku.trim().toUpperCase();
    const campaigns = await campaignRepo.findByProductId(cleanSku, user.workspaceId);

    const affectedCampaignIds: string[] = [];
    const affectedContentIds: string[] = [];

    for (const campaign of campaigns) {
      affectedCampaignIds.push(campaign.id);

      if (cascadeContents) {
        const contents = await contentRepo.listByCampaign(campaign.id);
        for (const c of contents) {
          if (c.workspaceId && c.workspaceId !== user.workspaceId) continue;
          affectedContentIds.push(c.id);
          if (hardDelete) {
            await contentRepo.delete(c.id);
          } else {
            await contentRepo.updateStatus(c.id, "ARCHIVED");
          }
        }
      }

      if (hardDelete) {
        await campaignRepo.delete(campaign.id);
      } else {
        await campaignRepo.archive(campaign.id, user.uid);
      }
    }

    // Opcionalmente cascadear también contenidos vinculados directamente al SKU que no tengan campaignId
    if (cascadeContents) {
      const productContents = await contentRepo.listByProduct(cleanSku, user.workspaceId);
      for (const pc of productContents) {
        if (!affectedContentIds.includes(pc.id)) {
          affectedContentIds.push(pc.id);
          if (hardDelete) {
            await contentRepo.delete(pc.id);
          } else {
            await contentRepo.updateStatus(pc.id, "ARCHIVED");
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      sku: cleanSku,
      mode: hardDelete ? "HARD_DELETE" : "SOFT_DELETE",
      status: hardDelete ? "DELETED" : "ARCHIVED",
      campaignsAffected: affectedCampaignIds.length,
      affectedCampaignIds,
      contentsAffected: affectedContentIds.length,
      affectedContentIds
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
