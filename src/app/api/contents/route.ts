import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { hasPermission } from "@/server/security/rbac";
import { ContentRepository, AuditRepository } from "@/server/repositories";
import { ContentItem } from "@/server/domain/types";
import { ContentOutputSchema } from "@/lib/schema";
import { validateEditorialQuality } from "@/lib/quality/editorial-quality-gate";

import { normalizePersistedContent } from "@/lib/utils/content-normalizer";

export const GET = withAuthAndPermission("content:view", async (req: NextRequest, user) => {
  const repo = new ContentRepository();
  try {
    const url = new URL(req.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "100", 10);
    const limit = isNaN(limitParam) || limitParam <= 0 ? 100 : Math.min(limitParam, 200);

    const querySearch = (url.searchParams.get("q") || url.searchParams.get("query") || "").trim().toLowerCase();
    const statusParam = (url.searchParams.get("status") || "").trim().toUpperCase();
    const skuParam = (url.searchParams.get("sku") || "").trim().toUpperCase();
    const categoryParam = (url.searchParams.get("category") || "").trim().toLowerCase();
    const isFullRequested = url.searchParams.get("full") === "true";

    const cursorParam = url.searchParams.get("cursor") || undefined;

    const { items: list, nextCursor } = await repo.listRecentPaginated(limit, user.workspaceId, cursorParam);

    let formatted = list.map((item: ContentItem) => {
      const normalized = normalizePersistedContent(item, user.workspaceId);
      if (!isFullRequested) {
        // En modo resumen ligero omitimos el árbol pesado de content si no es requerido
        return {
          ...normalized,
          content: null
        };
      }
      return normalized;
    });

    // Filtros en memoria para consulta flexible
    if (querySearch) {
      formatted = formatted.filter((item) =>
        item.title.toLowerCase().includes(querySearch) ||
        item.slug.toLowerCase().includes(querySearch) ||
        (item.productId && item.productId.toLowerCase().includes(querySearch)) ||
        item.preview.toLowerCase().includes(querySearch) ||
        item.category.toLowerCase().includes(querySearch)
      );
    }

    if (statusParam && statusParam !== "ALL") {
      formatted = formatted.filter((item) =>
        item.status.toUpperCase() === statusParam ||
        item.rawStatus.toUpperCase() === statusParam
      );
    }

    if (skuParam) {
      formatted = formatted.filter((item) =>
        item.productId && item.productId.toUpperCase().includes(skuParam)
      );
    }

    if (categoryParam && categoryParam !== "all") {
      formatted = formatted.filter((item) =>
        item.category.toLowerCase() === categoryParam
      );
    }

    return NextResponse.json({
      items: formatted,
      contents: formatted, // Retrocompatibilidad para clientes existentes
      total: formatted.length,
      nextCursor
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error al recuperar contenidos persistidos.";
    console.error("[api/contents GET] Error al listar contenidos:", err);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: errorMsg,
        code: "FIRESTORE_QUERY_FAILED"
      },
      { status: 500 }
    );
  }
});

export const POST = withAuthAndPermission("content:create", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const repo = new ContentRepository();

    const rawId = String(body.id || Date.now());
    const cleanId = rawId.replace(/^(content-)+/, "");
    const contentId = rawId.startsWith("gen_") ? rawId : `content-${cleanId}`;

    const normalizedStatus =
      body.status === "published" || body.status === "PUBLISHED" ? "PUBLISHED" :
      body.status === "approved" || body.status === "APPROVED" ? "APPROVED" :
      body.status === "reviewed" || body.status === "IN_REVIEW" ? "IN_REVIEW" : "DRAFT";

    const isFallback =
      body.generator === "catalog-fallback" ||
      body.fallbackUsed === true ||
      body.content?.generator === "catalog-fallback" ||
      body.content?.fallbackUsed === true ||
      body.content?.source === "fallback";

    if (normalizedStatus === "PUBLISHED" && isFallback && !body.humanApproved) {
      return NextResponse.json(
        { error: "No se puede publicar directamente contenido generado en modo catálogo (catalog-fallback) sin aprobación humana explícita." },
        { status: 400 }
      );
    }

    if (normalizedStatus === "PUBLISHED" && !hasPermission(user.role, "content:publish") && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: `Su rol (${user.role}) no tiene el permiso 'content:publish' necesario para publicar contenido.` },
        { status: 403 }
      );
    }

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
      canonicalBody: body.content || (typeof body.body === "object" ? body.body : {}),
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
    const rawId = String(id).trim();
    const cleanId = rawId.replace(/^(content-)+/, "");

    // Resolver ID ya sea gen_xxx, content-xxx o cleanId
    let contentId = rawId;
    let existingContent = await repo.findById(rawId);
    if (!existingContent && rawId !== cleanId) {
      existingContent = await repo.findById(cleanId);
      if (existingContent) contentId = cleanId;
    }
    if (!existingContent && !rawId.startsWith("content-")) {
      existingContent = await repo.findById(`content-${cleanId}`);
      if (existingContent) contentId = `content-${cleanId}`;
    }

    if (!existingContent) {
      return NextResponse.json({ error: "Contenido no encontrado" }, { status: 404 });
    }

    if (existingContent.workspaceId && existingContent.workspaceId !== user.workspaceId && user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Acceso denegado: No se permite modificar contenido perteneciente a otro workspace",
          code: "FORBIDDEN_WORKSPACE_MISMATCH"
        },
        { status: 403 }
      );
    }

    // Resolver el ContentOutput que se va a guardar/validar. Priorizar la versión activa,
    // y aceptar una edición completa nueva aunque el registro previo esté dañado.
    const latestVersionBody =
      existingContent.versions?.find((version) => version.version === existingContent.currentVersion)?.body ||
      [...(existingContent.versions || [])].sort((a, b) => b.version - a.version)[0]?.body ||
      existingContent.canonicalBody;

    const incomingBody = body.content ?? body.body ?? body.canonicalBody;
    let candidateBody: unknown = latestVersionBody;

    if (incomingBody && typeof incomingBody === "object" && !Array.isArray(incomingBody)) {
      const incomingRecord = incomingBody as Record<string, unknown>;
      const parsedIncoming = ContentOutputSchema.safeParse(incomingRecord);
      if (parsedIncoming.success) {
        candidateBody = parsedIncoming.data;
      } else {
        // El editor puede enviar solo el blog. En ese caso se actualiza el blog
        // sobre el ContentOutput existente, sin destruir el resto de canales/metadatos.
        const parsedExisting = ContentOutputSchema.safeParse(latestVersionBody);
        if (parsedExisting.success) {
          if (incomingRecord.blog && typeof incomingRecord.blog === "object" && !Array.isArray(incomingRecord.blog)) {
            candidateBody = {
              ...parsedExisting.data,
              ...incomingRecord,
              blog: { ...parsedExisting.data.blog, ...(incomingRecord.blog as Record<string, unknown>) }
            };
          } else if ("htmlContent" in incomingRecord || "metaDescription" in incomingRecord || "cleanPlainTextExcerpt" in incomingRecord) {
            candidateBody = {
              ...parsedExisting.data,
              blog: { ...parsedExisting.data.blog, ...incomingRecord }
            };
          } else {
            candidateBody = { ...parsedExisting.data, ...incomingRecord };
          }
        } else {
          candidateBody = incomingRecord;
        }
      }
    }

    const parsedCandidate = ContentOutputSchema.safeParse(candidateBody);
    if (incomingBody !== undefined && !parsedCandidate.success) {
      return NextResponse.json(
        {
          error: "INVALID_CONTENT_OUTPUT",
          message: "El contenido editado debe cumplir el contrato ContentOutput antes de guardarse.",
          details: parsedCandidate.error.issues
        },
        { status: 400 }
      );
    }

    const currentStatus = existingContent.status;
    if (normalizedStatus === "APPROVED" && currentStatus !== "IN_REVIEW" && currentStatus !== "DRAFT" && currentStatus !== "APPROVED") {
      return NextResponse.json(
        { error: `Transición inválida: un contenido en ${currentStatus} no puede pasar a APPROVED.`, code: "INVALID_CONTENT_TRANSITION" },
        { status: 409 }
      );
    }

    if (normalizedStatus === "PUBLISHED" && currentStatus !== "APPROVED" && currentStatus !== "IN_REVIEW" && currentStatus !== "DRAFT" && currentStatus !== "PUBLISHED") {
      return NextResponse.json(
        { error: `Transición inválida: un contenido en ${currentStatus} no puede pasar a PUBLISHED.`, code: "INVALID_CONTENT_TRANSITION" },
        { status: 409 }
      );
    }

    if (normalizedStatus === "APPROVED" || normalizedStatus === "PUBLISHED") {
      const parsedContent = ContentOutputSchema.safeParse(candidateBody);
      if (!parsedContent.success) {
        return NextResponse.json(
          { error: "QUALITY_GATE_BLOCKED: El contenido persistido no cumple el contrato ContentOutput.", details: parsedContent.error.issues },
          { status: 409 }
        );
      }

      const decision = parsedContent.data.editorialDecision;
      const selectedAngle =
        decision && typeof decision.selectedAngle === "object" && decision.selectedAngle !== null
          ? decision.selectedAngle as Record<string, unknown>
          : undefined;
      const requestedAudience =
        selectedAngle && typeof selectedAngle.targetAudience === "string"
          ? selectedAngle.targetAudience
          : "";
      const requestedSku =
        decision && typeof decision.productTruthLock === "object" && decision.productTruthLock !== null &&
        typeof (decision.productTruthLock as Record<string, unknown>).sku === "string"
          ? String((decision.productTruthLock as Record<string, unknown>).sku)
          : undefined;

      const qualityReport = validateEditorialQuality(parsedContent.data, requestedAudience, requestedSku);
      if (!qualityReport.passed) {
        return NextResponse.json(
          {
            error: "QUALITY_GATE_BLOCKED",
            message: qualityReport.acceptanceMessage,
            score: qualityReport.score,
            report: qualityReport
          },
          { status: 409 }
        );
      }

      const isFallback =
        parsedContent.data.source === "fallback" ||
        parsedContent.data.fallbackUsed === true;

      if (normalizedStatus === "PUBLISHED" && isFallback && !body.humanApproved) {
        return NextResponse.json(
          { error: "No se puede publicar directamente contenido generado en modo catálogo sin aprobación humana explícita." },
          { status: 400 }
        );
      }
    }

    if (normalizedStatus === "PUBLISHED" && !hasPermission(user.role, "content:publish") && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: `Su rol (${user.role}) no tiene el permiso 'content:publish' necesario para publicar contenido.` },
        { status: 403 }
      );
    }

    // Guardar el ContentOutput completo y registrar cada edición como una versión.
    if (incomingBody !== undefined) {
      const parsedUpdatedBody = ContentOutputSchema.safeParse(candidateBody);
      if (!parsedUpdatedBody.success) {
        return NextResponse.json(
          {
            error: "INVALID_CONTENT_OUTPUT",
            message: "No se puede persistir un contenido incompleto o incompatible con ContentOutput.",
            details: parsedUpdatedBody.error.issues
          },
          { status: 400 }
        );
      }

      const nowIso = new Date().toISOString();
      const nextVersion = Math.max(
        existingContent.currentVersion || 0,
        ...(existingContent.versions || []).map((version) => version.version),
        0
      ) + 1;
      const updatedBody = parsedUpdatedBody.data as unknown as Record<string, unknown>;
      const updatedItem: ContentItem = {
        ...existingContent,
        title: body.title || parsedUpdatedBody.data.blog.title || parsedUpdatedBody.data.topicTitle || existingContent.title,
        slug: parsedUpdatedBody.data.blog.slug || existingContent.slug,
        status: normalizedStatus as any,
        currentVersion: nextVersion,
        canonicalBody: updatedBody,
        versions: [
          ...(existingContent.versions || []),
          {
            version: nextVersion,
            body: updatedBody,
            changeSummary: "Edición guardada desde Campaign Workspace",
            editedByUserId: user.uid,
            isAIGenerated: false,
            timestamp: nowIso
          }
        ],
        updatedBy: user.uid,
        updatedAt: nowIso
      };
      await repo.upsertBySlug(updatedItem);
    } else {
      await repo.updateStatus(contentId, normalizedStatus as any);
    }

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
      diff: { newStatus: normalizedStatus, hasContentUpdate: Boolean(body.content || body.body) },
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

    // Validar que todos los elementos a eliminar pertenezcan al workspace del usuario
    for (const targetId of idsToDelete) {
      const rawTargetId = String(targetId).trim();
      const cleanId = rawTargetId.replace(/^(content-)+/, "");
      let existing = await repo.findById(rawTargetId);
      if (!existing && !rawTargetId.startsWith("content-")) {
        existing = await repo.findById(`content-${cleanId}`);
      }
      if (existing && existing.workspaceId && existing.workspaceId !== user.workspaceId && user.role !== "ADMIN") {
        return NextResponse.json(
          {
            error: `Acceso denegado: El contenido '${targetId}' pertenece a otro workspace`,
            code: "FORBIDDEN_WORKSPACE_MISMATCH"
          },
          { status: 403 }
        );
      }
    }

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
