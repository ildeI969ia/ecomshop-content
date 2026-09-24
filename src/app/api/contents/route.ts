import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { ContentRepository, AuditRepository } from "@/server/repositories";
import { ContentItem } from "@/server/domain/types";

export const GET = withAuthAndPermission("content:view", async (req: NextRequest, user) => {
  const repo = new ContentRepository();
  try {
    let list = await repo.listRecent(100, user.workspaceId);
    if (list.length === 0) {
      list = await repo.listRecent(100);
    }

    const formatted = list.map((item: ContentItem) => {
      const versionBody = item.versions?.[0]?.body;
      const content = versionBody || (item as any).content || (typeof (item as any).body === "object" ? (item as any).body : null) || {
        topicTitle: item.title,
        category: item.category,
        generatedAt: item.createdAt,
        blog: item.canonicalBody || {}
      };

      const normalizedStatus: "draft" | "reviewed" | "approved" | "published" =
        item.status === "PUBLISHED" ? "published" :
        item.status === "APPROVED" ? "approved" :
        item.status === "IN_REVIEW" ? "reviewed" : "draft";

      return {
        id: item.id,
        title: item.title,
        category: item.category,
        status: normalizedStatus,
        createdAt: item.createdAt,
        content
      };
    });

    return NextResponse.json({ contents: formatted });
  } catch (err: any) {
    console.error("[api/contents GET] Error al listar contenidos:", err);
    return NextResponse.json({ contents: [], error: err?.message }, { status: 200 });
  }
});

export const POST = withAuthAndPermission("content:create", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const repo = new ContentRepository();

    const rawId = String(body.id || Date.now());
    const cleanId = rawId.replace(/^(content-)+/, "");
    const contentId = `content-${cleanId}`;

    const normalizedStatus =
      body.status === "published" || body.status === "PUBLISHED" ? "PUBLISHED" :
      body.status === "approved" || body.status === "APPROVED" ? "APPROVED" :
      body.status === "reviewed" || body.status === "IN_REVIEW" ? "IN_REVIEW" : "DRAFT";

    const contentItem: ContentItem = {
      id: contentId,
      workspaceId: user.workspaceId,
      campaignId: body.campaignId || "",
      title: body.title || body.content?.topicTitle || "Sin título",
      slug: body.content?.blog?.slug || `post-${rawId}`,
      category: body.category || body.content?.category || "general",
      status: normalizedStatus as any,
      currentVersion: 1,
      authorId: user.uid,
      canonicalBody: body.content?.blog || (typeof body.body === "object" ? body.body : {}),
      linkedProductIds: body.linkedProductIds || [],
      linkedSourceIds: body.linkedSourceIds || [],
      versions: [
        {
          version: 1,
          body: body.content || body.body || {},
          changeSummary: "Generado vía Generador Multicanal",
          editedByUserId: user.uid,
          isAIGenerated: true,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: body.createdAt && !isNaN(new Date(body.createdAt).getTime()) ? new Date(body.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.uid,
      updatedBy: user.uid
    };

    await repo.save(contentItem);

    if (body.content?.mailchimp) {
      await repo.saveVariant(contentId, {
        id: `var-${contentId}-mailchimp`,
        contentId,
        channel: "MAILCHIMP",
        status: normalizedStatus as any,
        bodyPayload: body.content.mailchimp,
        version: 1,
        isAIGenerated: true,
        humanModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (body.content?.linkedin) {
      await repo.saveVariant(contentId, {
        id: `var-${contentId}-linkedin`,
        contentId,
        channel: "LINKEDIN",
        status: normalizedStatus as any,
        bodyPayload: body.content.linkedin,
        version: 1,
        isAIGenerated: true,
        humanModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const auditRepo = new AuditRepository();
    await auditRepo.record({
      id: `audit-${Date.now()}`,
      workspaceId: user.workspaceId,
      timestamp: new Date().toISOString(),
      userId: user.uid,
      userEmail: user.email,
      action: "CREATE",
      entity: "CONTENT",
      entityId: contentId,
      diff: { title: contentItem.title, status: normalizedStatus },
      source: "UI"
    });

    return NextResponse.json({ success: true, content: contentItem });
  } catch (err: any) {
    console.error("[api/contents POST] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const PATCH = withAuthAndPermission("content:edit", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ error: "Faltan id o status" }, { status: 400 });
    }

    const normalizedStatus =
      status === "published" || status === "PUBLISHED" ? "PUBLISHED" :
      status === "approved" || status === "APPROVED" ? "APPROVED" :
      status === "reviewed" || status === "IN_REVIEW" ? "IN_REVIEW" : "DRAFT";

    const repo = new ContentRepository();
    const cleanId = String(id).replace(/^(content-)+/, "");
    const contentId = `content-${cleanId}`;

    await repo.updateStatus(contentId, normalizedStatus as any);

    const auditRepo = new AuditRepository();
    await auditRepo.record({
      id: `audit-status-${Date.now()}`,
      workspaceId: user.workspaceId,
      timestamp: new Date().toISOString(),
      userId: user.uid,
      userEmail: user.email,
      action: "EDIT",
      entity: "CONTENT_STATUS",
      entityId: contentId,
      diff: { newStatus: normalizedStatus },
      source: "UI"
    });

    return NextResponse.json({ success: true, id: contentId, status: normalizedStatus });
  } catch (err: any) {
    console.error("[api/contents PATCH] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const DELETE = withAuthAndPermission("content:delete", async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get("id");

    let idsToDelete: string[] = [];

    if (queryId) {
      idsToDelete.push(queryId);
    } else {
      try {
        const body = await req.json();
        if (body?.ids && Array.isArray(body.ids)) {
          idsToDelete.push(...body.ids);
        } else if (body?.id && typeof body.id === "string") {
          idsToDelete.push(body.id);
        }
      } catch {
        // Body may be empty
      }
    }

    idsToDelete = Array.from(new Set(idsToDelete.filter((id) => typeof id === "string" && id.trim().length > 0)));

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: "Faltan IDs de contenidos a eliminar" }, { status: 400 });
    }

    const repo = new ContentRepository();
    const auditRepo = new AuditRepository();

    const expandedIds = Array.from(
      new Set(
        idsToDelete.flatMap((id) => [
          id,
          id.startsWith("content-") ? id.replace(/^content-/, "") : `content-${id}`
        ])
      )
    );

    if (expandedIds.length === 1) {
      await repo.delete(expandedIds[0]);
    } else {
      await repo.deleteBulk(expandedIds);
    }

    const nowIso = new Date().toISOString();
    await Promise.all(
      idsToDelete.map((id) =>
        auditRepo.record({
          id: `audit-del-content-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: user.workspaceId,
          timestamp: nowIso,
          userId: user.uid,
          userEmail: user.email,
          action: "DELETE",
          entity: "CONTENT",
          entityId: id,
          diff: { id },
          source: "UI"
        }).catch((auditErr) => {
          console.warn(`[api/contents DELETE] Error registrando auditoría para ${id}:`, auditErr);
        })
      )
    );

    return NextResponse.json({ success: true, deletedIds: idsToDelete });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error al eliminar contenido";
    console.error("[api/contents DELETE] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
});
