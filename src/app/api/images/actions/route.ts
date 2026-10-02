import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { AssetRepository, AuditRepository, ContentRepository } from "@/server/repositories";
import { Asset, ContentItem } from "@/server/domain/types";
import { sanitizeHtml } from "@/server/security/sanitizer";

type ImageAction = "insert_article" | "reuse_campaign";
type ArticleMode = "hero" | "body";
type CampaignChannel = "linkedin" | "newsletter";

interface ImageActionRequest {
  action: ImageAction;
  assetId: string;
  contentId: string;
  mode?: ArticleMode;
  channel?: CampaignChannel;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildVersionBody(content: ContentItem, body: Record<string, unknown>): ContentItem["versions"][number]["body"] {
  return body;
}

export const POST = withAuthAndPermission("content:edit", async (req: NextRequest, user) => {
  try {
    const body = (await req.json()) as Partial<ImageActionRequest>;
    if (
      (body.action !== "insert_article" && body.action !== "reuse_campaign") ||
      typeof body.assetId !== "string" ||
      typeof body.contentId !== "string"
    ) {
      return NextResponse.json(
        { error: "Acción inválida: se requiere action, assetId y contentId." },
        { status: 400 }
      );
    }

    if (body.action === "insert_article" && body.mode !== "hero" && body.mode !== "body") {
      return NextResponse.json({ error: "Para insertar en artículo se requiere mode=hero|body." }, { status: 400 });
    }

    if (body.action === "reuse_campaign" && body.channel !== "linkedin" && body.channel !== "newsletter") {
      return NextResponse.json({ error: "Para reutilizar en campaña se requiere channel=linkedin|newsletter." }, { status: 400 });
    }

    const assets = new AssetRepository();
    const asset = await assets.findById(body.assetId);
    if (!asset) {
      return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });
    }
    if (asset.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "El activo no pertenece al workspace actual." }, { status: 403 });
    }
    if (!asset.publicUrl) {
      return NextResponse.json({ error: "El activo no tiene una URL pública verificada." }, { status: 409 });
    }

    const contents = new ContentRepository();
    const content = await contents.findById(body.contentId);
    if (!content) {
      return NextResponse.json({ error: "Contenido/artículo no encontrado." }, { status: 404 });
    }
    if (content.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: "El contenido no pertenece al workspace actual." }, { status: 403 });
    }

    const canonicalBody = asRecord(content.canonicalBody);
    const currentBlog = asRecord(canonicalBody.blog);
    const currentLayout = asRecord(currentBlog.editorialLayout);
    const currentPlacements = Array.isArray(currentLayout.photoPlacements)
      ? currentLayout.photoPlacements
      : [];

    let nextBody: Record<string, unknown> = { ...canonicalBody };
    let operationLabel = "";

    if (body.action === "insert_article") {
      const mode = body.mode as ArticleMode;
      const placements = currentPlacements.map((placement) => ({ ...asRecord(placement) }));
      const targetIndex = mode === "hero"
        ? 0
        : Math.max(
            0,
            placements.findIndex((placement) => {
              const status = placement.status;
              return status !== "GENERATED";
            })
          );

      const placement = placements[targetIndex] || {
        id: `manual-${asset.id}`,
        placementAfterHeading: mode === "hero" ? "Hero" : "Contenido",
        position: mode === "hero" ? "BEFORE_SECTION" : "AFTER_SECTION",
        photoType: "GENERATED_ASSET",
        aspectRatio: "16:9",
        description: "Imagen generada desde el Estudio Visual",
        imagen3Prompt: asset.filename,
        productSku: undefined
      };

      placement.assetId = asset.id;
      placement.imageUrl = asset.publicUrl;
      placement.status = "GENERATED";
      placement.altText = placement.altText || "Imagen generada para artículo B2B";
      placement.caption = placement.caption || "Imagen generada en EcomSpain Marketing OS";

      if (placements[targetIndex]) {
        placements[targetIndex] = placement;
      } else {
        placements.push(placement);
      }

      const currentHtml = typeof currentBlog.htmlContent === "string" ? currentBlog.htmlContent : "";
      const marker = `{{IMAGE:${String(placement.id)}}}`;
      const imageHtml =
        `<figure data-image-id="${escapeHtml(asset.id)}"><img src="${escapeHtml(asset.publicUrl)}" alt="${escapeHtml(String(placement.altText))}" /></figure>`;

      const nextHtml = currentHtml.includes(marker)
        ? currentHtml.replaceAll(marker, imageHtml)
        : mode === "hero"
          ? `${imageHtml}${currentHtml}`
          : `${currentHtml}${imageHtml}`;

      const nextBlog = {
        ...currentBlog,
        htmlContent: sanitizeHtml(nextHtml),
        editorialLayout: {
          ...currentLayout,
          photoPlacements: placements
        }
      };

      nextBody = { ...canonicalBody, blog: nextBlog };
      operationLabel = `Imagen insertada en artículo como ${mode === "hero" ? "Hero" : "cuerpo"}`;
    } else {
      const channel = body.channel as CampaignChannel;
      const channelKey = channel === "linkedin" ? "linkedin" : "mailchimp";
      const currentChannel = asRecord(canonicalBody[channelKey]);
      nextBody = {
        ...canonicalBody,
        [channelKey]: {
          ...currentChannel,
          imageUrl: asset.publicUrl,
          imageAssetId: asset.id
        }
      };
      operationLabel = `Imagen vinculada a ${channel === "linkedin" ? "LinkedIn" : "Newsletter Mailchimp"}`;
    }

    const nowIso = new Date().toISOString();
    const nextVersions = [...(content.versions || [])];
    if (nextVersions.length > 0) {
      const latestVersion = nextVersions[nextVersions.length - 1];
      nextVersions[nextVersions.length - 1] = {
        ...latestVersion,
        body: buildVersionBody(content, nextBody),
        changeSummary: operationLabel,
        editedByUserId: user.uid,
        timestamp: nowIso
      };
    }

    await contents.update(content.id, {
      canonicalBody: nextBody,
      versions: nextVersions,
      currentVersion: content.currentVersion || 1,
      updatedBy: user.uid
    });

    const linkedAsset: Asset = {
      ...asset,
      contentId: content.id,
      updatedAt: nowIso,
      updatedBy: user.uid
    };
    await assets.save(linkedAsset);

    await new AuditRepository().record({
      id: `audit-image-action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      workspaceId: user.workspaceId,
      timestamp: nowIso,
      userId: user.uid,
      userEmail: user.email,
      action: "EDIT",
      entity: "IMAGE_ASSET_LINK",
      entityId: asset.id,
      diff: {
        action: body.action,
        contentId: content.id,
        mode: body.mode,
        channel: body.channel
      },
      source: "UI"
    });

    return NextResponse.json({
      success: true,
      action: body.action,
      assetId: asset.id,
      contentId: content.id,
      operation: operationLabel
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api/images/actions] Error:", error);
    return NextResponse.json({ error: message || "No se pudo ejecutar la acción sobre la imagen." }, { status: 500 });
  }
});
