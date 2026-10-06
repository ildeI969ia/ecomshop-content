import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { ContentRepository } from "@/server/repositories";
import { ContentItem } from "@/server/domain/types";

export const GET = withAuthAndPermission("content:view", async (req: NextRequest, user) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const contentId = segments[segments.length - 1];

  if (!contentId) {
    return NextResponse.json({ error: "ID de contenido requerido" }, { status: 400 });
  }

  const repo = new ContentRepository();
  const cleanId = String(contentId).replace(/^(content-)+/, "");
  
  // Buscar tanto por cleanId con prefijo content- como por ID exacto (e.g. gen_...)
  let item: ContentItem | null = await repo.findById(`content-${cleanId}`);
  if (!item) {
    item = await repo.findById(contentId);
  }

  if (!item) {
    return NextResponse.json({ error: "Contenido no encontrado", code: "CONTENT_NOT_FOUND" }, { status: 404 });
  }

  if (item.workspaceId && item.workspaceId !== user.workspaceId && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Acceso no autorizado al workspace de este contenido", code: "FORBIDDEN_WORKSPACE_MISMATCH" },
      { status: 403 }
    );
  }

  const rawItem = item as unknown as Record<string, unknown>;
  const versionBody = item.versions?.[0]?.body;
  const content =
    versionBody ||
    rawItem.content ||
    (typeof rawItem.canonicalBody === "object" ? rawItem.canonicalBody : null) || {
      topicTitle: item.title,
      category: item.category,
      generatedAt: item.createdAt,
      blog: item.canonicalBody || {}
    };

  const normalizedStatus: "draft" | "reviewed" | "approved" | "published" =
    item.status === "PUBLISHED" ? "published" :
    item.status === "APPROVED" ? "approved" :
    item.status === "IN_REVIEW" ? "reviewed" : "draft";

  const responseData = {
    id: item.id,
    workspaceId: item.workspaceId || user.workspaceId,
    title: item.title,
    category: item.category,
    status: normalizedStatus,
    rawStatus: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt || item.createdAt,
    productId: item.linkedProductIds?.[0] || null,
    campaignId: item.campaignId || null,
    content,
    currentVersion: item.currentVersion || 1,
    versions: item.versions || []
  };

  return NextResponse.json({ item: responseData, content: responseData });
});
