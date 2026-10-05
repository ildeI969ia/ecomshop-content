import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schema";
import { generateB2BContent } from "@/lib/generator";
import { buildGenerationContext } from "@/server/services/generation-context";
import { sanitizeHtml } from "@/server/security/sanitizer";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { FinOpsRepository, AuditRepository, ContentRepository, ProductIntelligenceRepository } from "@/server/repositories";
import { FinOpsRecord, ContentItem, ContentVariant } from "@/server/domain/types";
import { verifyAndSanitizeContent } from "@/lib/services/evidence-engine";
import { recordAiUsage } from "@/server/services/ai-budget";
import { reserveAiBudget, releaseAiBudgetReservation } from "@/server/services/ai-budget-reservation";
import { AI_TEXT_MODEL } from "@/lib/ai-config";
import { validateEditorialQuality, checkProductContamination } from "@/lib/quality/editorial-quality-gate";
import { logger } from "@/lib/logger";

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  let budgetReservationId: string | undefined;
  let pipelineStage = "REQUEST_VALIDATION";
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  try {
    const json = await req.json();
    const parsed = GenerateRequestSchema.safeParse(json);

    if (!parsed.success) {
      console.error("[VALIDATION_ERROR]", JSON.stringify(parsed.error.format(), null, 2));
      return NextResponse.json(
        {
          error: "Datos de entrada inválidos",
          details: parsed.error.format(),
          issues: parsed.error.issues
        },
        { status: 400 }
      );
    }

    logger.info("Generation request started", { requestId });

    // 0. Reserva atómica de presupuesto FinOps antes de iniciar cualquier trabajo de IA.
    pipelineStage = "BUDGET_RESERVATION";
    const budgetReservation = await reserveAiBudget(user.uid, user.role, 0.0045);
    if (!budgetReservation.allowed || !budgetReservation.reservation) {
      return NextResponse.json(
        {
          code: budgetReservation.code || "AI_BUDGET_EXCEEDED",
          error: budgetReservation.error || "Has superado el límite de presupuesto de IA asignado para este mes.",
          limitEur: budgetReservation.limitEur,
          spentEur: budgetReservation.currentSpentEur,
          pct: budgetReservation.pct,
          resetsAt: "Inicio del próximo mes (Hora de Madrid)"
        },
        { status: budgetReservation.code === "BUDGET_VERIFICATION_UNAVAILABLE" ? 503 : 429 }
      );
    }
    budgetReservationId = budgetReservation.reservation.reservationId;

    const inputData = parsed.data;

    // 1. Resolver el contexto de generación de forma canónica y única (SKU Hard Lock)
    pipelineStage = "CONTEXT_RESOLUTION";
    let generationContext;
    try {
      generationContext = await buildGenerationContext(inputData, {
        includeProductIntelligenceCard: true
      });
    } catch (ctxErr: unknown) {
      const message = ctxErr instanceof Error ? ctxErr.message : String(ctxErr);
      if (message.includes("PRODUCT_REQUIRED")) {
        return NextResponse.json(
          { error: "PRODUCT_REQUIRED", message: "Selecciona un SKU de EcomShop antes de generar la campaña." },
          { status: 400 }
        );
      }
      if (message.includes("PRODUCT_NOT_FOUND")) {
        return NextResponse.json(
          { error: "PRODUCT_NOT_FOUND", message },
          { status: 404 }
        );
      }
      if (message.includes("PRODUCT_IDENTITY_MISMATCH")) {
        return NextResponse.json(
          { error: "PRODUCT_IDENTITY_MISMATCH", message },
          { status: 422 }
        );
      }
      throw ctxErr;
    }

    const intelligenceCard = generationContext.intelligenceCard;
    const effectiveTitle = generationContext.effectiveTitle;
    const effectiveCategory = generationContext.effectiveCategory;
    const productUrl = generationContext.productUrl;

    // 2. Generar con la arquitectura multicanal completa a partir del contexto ya resuelto
    pipelineStage = "AI_GENERATION";
    let content = await generateB2BContent(
      {
        ...inputData,
        sku: generationContext.canonicalSku,
        productUrl: productUrl || "https://ecomshop.es",
        topicTitle: effectiveTitle,
        category: effectiveCategory
      },
      generationContext
    );

    // 3. Auditoría con EvidenceEngine (Podar o corregir claims técnicos erróneos)
    pipelineStage = "EVIDENCE_AUDIT";
    if (intelligenceCard) {
      try {
        const [blogAudit, mailAudit, linkedinAudit, waAudit] = await Promise.all([
          content.blog?.htmlContent
            ? verifyAndSanitizeContent(content.blog.htmlContent, "blog", intelligenceCard)
            : Promise.resolve(null),
          content.mailchimp?.newsletterHtml
            ? verifyAndSanitizeContent(content.mailchimp.newsletterHtml, "mailchimp", intelligenceCard)
            : Promise.resolve(null),
          content.linkedin?.fullPostText
            ? verifyAndSanitizeContent(content.linkedin.fullPostText, "linkedin", intelligenceCard)
            : Promise.resolve(null),
          content.whatsapp?.formattedMessage
            ? verifyAndSanitizeContent(content.whatsapp.formattedMessage, "whatsapp", intelligenceCard)
            : Promise.resolve(null)
        ]);

        if (blogAudit && content.blog) content.blog.htmlContent = blogAudit.sanitizedContent;
        if (mailAudit && content.mailchimp) content.mailchimp.newsletterHtml = mailAudit.sanitizedContent;
        if (linkedinAudit && content.linkedin) content.linkedin.fullPostText = linkedinAudit.sanitizedContent;
        if (waAudit && content.whatsapp) content.whatsapp.formattedMessage = waAudit.sanitizedContent;

        const audits = [blogAudit, mailAudit, linkedinAudit, waAudit].filter(Boolean);
        if (audits.length > 0) {
          const avgScore = Math.round(audits.reduce((acc, a) => acc + (a?.factCheckScore || 90), 0) / audits.length);
          content.factCheckScore = avgScore;
        }
      } catch (auditErr) {
        console.warn("[API Generate] Advertencia en auditoría de EvidenceEngine (non-fatal):", auditErr);
      }
    }

    // 4. Sanitización estricta anti-XSS
    pipelineStage = "SANITIZATION";
    if (content.blog?.htmlContent) {
      content.blog.htmlContent = sanitizeHtml(content.blog.htmlContent);
    }
    if (content.mailchimp?.newsletterHtml) {
      content.mailchimp.newsletterHtml = sanitizeHtml(content.mailchimp.newsletterHtml);
    }

    // 5. SKU isolation is a hard generation boundary: monoproduct guarantee
    pipelineStage = "PRODUCT_CONTAMINATION_CHECK";
    const contamination = checkProductContamination(content, generationContext.canonicalSku);
    if (!contamination.passed) {
      return NextResponse.json(
        {
          error: "PRODUCT_CONTAMINATION",
          message: "La generación fue bloqueada porque contiene referencias a otro producto distinto del SKU seleccionado.",
          requestedSku: generationContext.canonicalSku,
          detectedUnrelatedSkus: contamination.detectedUnrelatedSkus,
          issues: contamination.issues
        },
        { status: 422 }
      );
    }

    // 6. Quality Gate final
    pipelineStage = "EDITORIAL_QUALITY_GATE";
    const finalEditorialQuality = validateEditorialQuality(
      content,
      inputData.targetAudience || content.editorialThesis?.targetProfessional || "audiencia editorial",
      generationContext.canonicalSku
    );
    content.factCheckScore = finalEditorialQuality.score;
    content.status = (finalEditorialQuality.passed && !content.fallbackUsed) ? "DRAFT" : "NEEDS_REVIEW";
    if (!finalEditorialQuality.passed) {
      console.warn("[API Generate] Final Editorial Quality Gate bloquea aprobación:", finalEditorialQuality.acceptanceMessage);
    }

    // 7. Registro FinOps: el coste real se registra antes de persistir
    pipelineStage = "FINOPS_RECORDING";
    const tokensIn = content.usageMetadata?.promptTokenCount ?? 1850;
    const tokensOut = content.usageMetadata?.candidatesTokenCount ?? 3200;
    try {
      await recordAiUsage(user.uid, "gemini_generation", tokensIn, tokensOut, 0);
      if (budgetReservationId) {
        await releaseAiBudgetReservation(budgetReservationId);
        budgetReservationId = undefined;
      }
    } catch (usageErr) {
      console.error("[API Generate] Warning: Falló el registro de uso de IA:", usageErr);
      if (budgetReservationId) {
        try {
          await releaseAiBudgetReservation(budgetReservationId);
        } catch (releaseError) {
          console.error("[API Generate] No se pudo liberar la reserva tras fallo FinOps:", releaseError);
        }
        budgetReservationId = undefined;
      }
    }

    // 8. Persistencia en Firestore
    pipelineStage = "FIRESTORE_PERSISTENCE";
    const contentId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    try {
      const contentRepo = new ContentRepository();
      const variantRepo = new ContentRepository();
      const finOpsRepo = new FinOpsRepository();
      const auditRepo = new AuditRepository();
      const piRepo = new ProductIntelligenceRepository();

      const contentItem: ContentItem = {
        id: contentId,
        campaignId: (inputData as Record<string, unknown>).campaignId as string || undefined,
        workspaceId: user.workspaceId,
        title: content.blog?.title || content.topicTitle || "Contenido B2B",
        slug: content.blog?.slug || content.topicId,
        category: generationContext.effectiveCategory,
        currentVersion: 1,
        status: content.status === "NEEDS_REVIEW" ? "IN_REVIEW" : "DRAFT",
        authorId: user.uid,
        versions: [],
        canonicalBody: content as unknown as Record<string, unknown>,
        linkedProductIds: [generationContext.canonicalSku],
        linkedSourceIds: intelligenceCard ? intelligenceCard.evidenceLedger.map((e) => e.source) : [],
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: user.uid,
        updatedBy: user.uid
      };

      await contentRepo.save(contentItem);

      // Persistir variantes por canal desacopladas
      const variants: ContentVariant[] = [
        {
          id: `var_${contentId}_blog`,
          contentId,
          channel: "BLOG",
          bodyPayload: content.blog as unknown as Record<string, unknown>,
          status: "DRAFT",
          createdAt: nowIso,
          updatedAt: nowIso,
          version: 1,
          isAIGenerated: true,
          humanModified: false
        },
        {
          id: `var_${contentId}_mailchimp`,
          contentId,
          channel: "MAILCHIMP",
          bodyPayload: content.mailchimp as unknown as Record<string, unknown>,
          status: "DRAFT",
          createdAt: nowIso,
          updatedAt: nowIso,
          version: 1,
          isAIGenerated: true,
          humanModified: false
        },
        {
          id: `var_${contentId}_whatsapp`,
          contentId,
          channel: "WHATSAPP",
          bodyPayload: content.whatsapp as unknown as Record<string, unknown>,
          status: "DRAFT",
          createdAt: nowIso,
          updatedAt: nowIso,
          version: 1,
          isAIGenerated: true,
          humanModified: false
        },
        {
          id: `var_${contentId}_linkedin`,
          contentId,
          channel: "LINKEDIN",
          bodyPayload: content.linkedin as unknown as Record<string, unknown>,
          status: "DRAFT",
          createdAt: nowIso,
          updatedAt: nowIso,
          version: 1,
          isAIGenerated: true,
          humanModified: false
        }
      ];

      for (const variant of variants) {
        await variantRepo.saveVariant(contentId, variant);
      }

      if (intelligenceCard) {
        await piRepo.save({
          id: `pi_${generationContext.canonicalSku}`,
          productId: generationContext.canonicalSku,
          sku: generationContext.canonicalSku,
          cardPayload: intelligenceCard as unknown as Record<string, unknown>,
          version: 1,
          qualityGatePassed: true,
          evidenceCount: intelligenceCard.evidenceLedger.length,
          generatedAt: nowIso,
          updatedAt: nowIso
        });
      }

      const finOpsRecord: FinOpsRecord = {
        id: `fin_${contentId}`,
        contentId,
        campaignId: (inputData as Record<string, unknown>).campaignId as string || undefined,
        workspaceId: user.workspaceId,
        userId: user.uid,
        timestamp: nowIso,
        action: "gemini_generation",
        model: AI_TEXT_MODEL,
        provider: "vertex-ai",
        operation: "content_generation",
        sku: generationContext.canonicalSku,
        costStatus: "ESTIMATED",
        tokensInput: tokensIn,
        tokensOutput: tokensOut,
        cachedTokens: 0,
        imageCount: 0,
        estimatedCostEur: 0.0035,
        currency: "EUR",
        latencyMs: 1200
      };
      await finOpsRepo.record(finOpsRecord);

      await auditRepo.record({
        id: `aud_${contentId}`,
        userId: user.uid,
        userEmail: user.email || "system@ecomspain.com",
        workspaceId: user.workspaceId,
        action: "CREATE",
        entity: "CONTENT",
        entityId: contentId,
        timestamp: nowIso,
        diff: {
          title: content.topicTitle,
          category: content.category,
          productSku: generationContext.canonicalSku
        },
        source: "UI"
      });
    } catch (persistErr: unknown) {
      console.error("[API Generate] Fallo en persistencia Firestore:", persistErr);
      return NextResponse.json(
        {
          error: "PERSISTENCE_FAILED",
          message: "Fallo en base de datos al guardar contenido.",
          details: persistErr instanceof Error ? persistErr.message : String(persistErr),
          code: "PERSISTENCE_FAILED",
          stage: "FIRESTORE_PERSISTENCE",
          requestId
        },
        { status: 500, headers: { "x-request-id": requestId } }
      );
    }

    logger.info("Generation request completed", { requestId, stage: "COMPLETED", sku: generationContext.canonicalSku, model: AI_TEXT_MODEL });

    return NextResponse.json({
      ...content,
      id: contentId,
      intelligenceCard: intelligenceCard || undefined,
      budget: {
        spentEur: budgetReservation.currentSpentEur,
        limitEur: budgetReservation.limitEur,
        pct: budgetReservation.pct
      }
    }, { headers: { "x-request-id": requestId } });
  } catch (error: unknown) {
    if (budgetReservationId) {
      try {
        await releaseAiBudgetReservation(budgetReservationId);
      } catch (releaseError) {
        console.error("[API Generate] No se pudo liberar la reserva FinOps:", releaseError);
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Generation request failed", { requestId, stage: pipelineStage, error: message });
    return NextResponse.json(
      {
        error: "Error en motor editorial IA",
        details: message,
        code: "GENERATION_PIPELINE_FAILED",
        stage: pipelineStage,
        requestId
      },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
});
