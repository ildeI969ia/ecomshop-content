import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { ContentRepository } from "@/server/repositories";
import { ContentItem } from "@/server/domain/types";
import { normalizePersistedContent } from "@/lib/utils/content-normalizer";

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

  const normalized = normalizePersistedContent(item, user.workspaceId);
  const responseData = {
    ...normalized,
    versions: item.versions || []
  };

  return NextResponse.json({ item: responseData, content: responseData });
});
