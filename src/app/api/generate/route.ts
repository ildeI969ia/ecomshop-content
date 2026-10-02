import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schema";
import { generateB2BContent } from "@/lib/generator";
import { sanitizeHtml } from "@/server/security/sanitizer";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { FinOpsRepository, AuditRepository, ContentRepository, ProductIntelligenceRepository } from "@/server/repositories";
import { FinOpsRecord, ContentItem, ContentVariant } from "@/server/domain/types";
import { verifyAndSanitizeContent } from "@/lib/services/evidence-engine";
import { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import { getDynamicCatalogProduct } from "@/lib/catalog-server";
import { findCatalogProductExact, type CatalogProduct } from "@/lib/data/ecomshop-catalog";
import { buildFeedProductIntelligence } from "@/lib/services/feed-product-intelligence";

import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { AI_TEXT_MODEL } from "@/lib/ai-config";
import { validateEditorialQuality } from "@/lib/quality/editorial-quality-gate";

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
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

    // 0. Comprobar presupuesto FinOps (estimación ~0.0045€ para generación multicanal completa)
    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.0045);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          code: "AI_BUDGET_EXCEEDED",
          error: "Has superado el límite de presupuesto de IA asignado para este mes.",
          limitEur: budgetCheck.limitEur,
          spentEur: budgetCheck.currentSpentEur,
          pct: budgetCheck.pct,
          resetsAt: "Inicio del próximo mes (Hora de Madrid)"
        },
        { status: 429 }
      );
    }

    const inputData = parsed.data;

    // La generación canónica sólo puede arrancar con el producto exacto seleccionado.
    // Prioridad absoluta: feed sincronizado de EcomShop. El catálogo estático es sólo fallback.
    const targetSku = (inputData.sku || inputData.customEquipmentName || inputData.promotedProductIds?.[0] || "").trim();
    if (!targetSku) {
      return NextResponse.json(
        { error: "PRODUCT_REQUIRED", message: "Selecciona un SKU de EcomShop antes de generar la campaña." },
        { status: 400 }
      );
    }

    const canonicalProduct: CatalogProduct | undefined =
      (await getDynamicCatalogProduct(targetSku)) || findCatalogProductExact(targetSku);

    if (!canonicalProduct) {
      return NextResponse.json(
        { error: "PRODUCT_NOT_FOUND", message: `El SKU ${targetSku} no existe en el feed/catálogo de EcomShop.` },
        { status: 404 }
      );
    }

    // Product Truth se deriva directamente del feed. No NotebookLM, no fuentes globales.
    const feedIntelligence = buildFeedProductIntelligence(canonicalProduct);
    const intelligenceCard: ProductIntelligenceCard = feedIntelligence.card;
    const effectiveTitle = inputData.topicTitle || canonicalProduct.name;
    const effectiveCategory = canonicalProduct.category;
    const productUrl = canonicalProduct.url;

    let content = await generateB2BContent({
      ...inputData,
      sku: canonicalProduct.sku,
      productUrl,
      topicTitle: effectiveTitle,
      category: effectiveCategory,
      canonicalProduct
    });

    // 3. Auditoría con EvidenceEngine (Podar o corregir claims técnicos erróneos en paralelo)
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

        // Calcular factCheckScore real promediando las auditorías de canales ejecutadas
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
    if (content.blog?.htmlContent) {
      content.blog.htmlContent = sanitizeHtml(content.blog.htmlContent);
    }
    if (content.mailchimp?.newsletterHtml) {
      content.mailchimp.newsletterHtml = sanitizeHtml(content.mailchimp.newsletterHtml);
    }

    // 4.5. Grounding Validation de Cifras Técnicas (Fase 6c)
    const { validateContentGrounding } = await import("@/lib/services/claim-validator");
    content.groundingValidation = validateContentGrounding(content);

    // 4.6. Validación y Autofix de Reglas por Canal (Fase 6d)
    const { autoFixFailedChannels } = await import("@/lib/quality/channel-fixer");
    const channelFixResult = await autoFixFailedChannels(content);
    content = channelFixResult.updatedContent;
    content.channelValidation = channelFixResult.report;

    // Quality Gate final después de EvidenceEngine + channel fixes.
    const finalEditorialQuality = validateEditorialQuality(
      content,
      inputData.targetAudience || content.editorialThesis?.targetProfessional || "audiencia editorial",
      canonicalProduct.sku
    );
    content.factCheckScore = finalEditorialQuality.score;
    content.status = finalEditorialQuality.passed ? "DRAFT" : "NEEDS_REVIEW";
    if (!finalEditorialQuality.passed) {
      console.warn("[API Generate] Final Editorial Quality Gate bloquea aprobación:", finalEditorialQuality.acceptanceMessage);
    }

    // SKU isolation is a hard generation boundary: a campaign for one product
    // must never be persisted if another product/model appears in the payload.
    const { checkProductContamination } = await import("@/lib/quality/editorial-quality-gate");
    const contamination = checkProductContamination(content, canonicalProduct.sku);
    if (!contamination.passed) {
      return NextResponse.json(
        {
          error: "PRODUCT_CONTAMINATION",
          message: "La generación fue bloqueada porque contiene referencias a otro producto distinto del SKU seleccionado.",
          requestedSku: canonicalProduct.sku,
          detectedUnrelatedSkus: contamination.detectedUnrelatedSkus,
          issues: contamination.issues
        },
        { status: 422 }
      );
    }

    // 5. Persistencia en Firestore (Contents, Variants, ProductIntelligence, FinOps, Audit)
    let contentId = `content-${content.topicId}-${Date.now().toString(36)}`;
    try {
      const nowIso = new Date().toISOString();
      const contentRepo = new ContentRepository();

      const contentItem: ContentItem = {
        id: contentId,
        campaignId: inputData.campaignId || null,
        workspaceId: user.workspaceId,
        title: content.blog?.title || content.topicTitle || "Contenido B2B",
        slug: content.blog?.slug || content.topicId,
        category: content.category,
        // Toda generación entra en revisión humana; el Quality Gate decide si puede aprobarse.
        status: "IN_REVIEW",
        currentVersion: 1,
        authorId: user.uid,
        versions: [
          {
            version: 1,
            body: content as any,
            changeSummary: "Generación automática con EvidenceEngine y Vertex AI Grounding",
            editedByUserId: user.uid,
            isAIGenerated: true,
            timestamp: nowIso
          }
        ],
        canonicalBody: content as any,
        linkedProductIds: intelligenceCard ? [intelligenceCard.product.sku] : [],
        linkedSourceIds: intelligenceCard ? intelligenceCard.evidenceLedger.map(e => e.source) : [],
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: user.uid,
        updatedBy: user.uid
      };
      await contentRepo.save(contentItem);

      // Guardar variantes por canal
      const channels: Array<{ channel: "BLOG" | "MAILCHIMP" | "WHATSAPP" | "LINKEDIN"; payload: any; title?: string }> = [
        { channel: "BLOG", payload: content.blog, title: content.blog?.title },
        { channel: "MAILCHIMP", payload: content.mailchimp, title: content.mailchimp?.subjectA },
        { channel: "WHATSAPP", payload: content.whatsapp, title: content.whatsapp?.headline },
        { channel: "LINKEDIN", payload: content.linkedin, title: content.linkedin?.hook }
      ];

      for (const ch of channels) {
        const variant: ContentVariant = {
          id: `var-${ch.channel.toLowerCase()}-${Date.now().toString(36)}`,
          contentId,
          channel: ch.channel,
          status: "DRAFT",
          title: ch.title || content.blog?.title || content.topicTitle || "Variante " + ch.channel,
          bodyPayload: ch.payload,
          version: 1,
          isAIGenerated: true,
          humanModified: false,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        await contentRepo.saveVariant(contentId, variant);
      }

      // Persistir tarjeta de inteligencia técnica en Firestore
      if (intelligenceCard) {
        const intelRepo = new ProductIntelligenceRepository();
        await intelRepo.save({
          id: `intel-${intelligenceCard.product.sku.toLowerCase()}`,
          productId: intelligenceCard.product.sku,
          sku: intelligenceCard.product.sku,
          cardPayload: intelligenceCard as any,
          version: 1,
          qualityGatePassed: true,
          evidenceCount: intelligenceCard.evidenceLedger.length,
          generatedAt: nowIso,
          updatedAt: nowIso
        });
      }

      // FinOps
      const finopsRepo = new FinOpsRepository();
      const finopsRecord: FinOpsRecord = {
        id: `finops-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        workspaceId: user.workspaceId,
        timestamp: nowIso,
        userId: user.uid,
        action: "gemini_generation",
        model: AI_TEXT_MODEL,
        provider: "vertex-ai",
        operation: "content_generation",
        sku: intelligenceCard?.product?.sku,
        costStatus: "ESTIMATED",
        tokensInput: 1850,
        tokensOutput: 3200,
        cachedTokens: 0,
        imageCount: 0,
        latencyMs: 1600,
        estimatedCostEur: 0.0045,
        currency: "EUR"
      };
      await finopsRepo.record(finopsRecord);

      // Audit Log
      const auditRepo = new AuditRepository();
      await auditRepo.record({
        id: `audit-${Date.now()}`,
        workspaceId: user.workspaceId,
        timestamp: nowIso,
        userId: user.uid,
        userEmail: user.email,
        action: "GENERATE_AI",
        entity: "CONTENT_ITEM",
        entityId: contentId,
        diff: {
          title: content.topicTitle,
          category: content.category,
          productSku: intelligenceCard?.product?.sku
        },
        source: "UI"
      });
      // Registrar consumo real de IA en ai_usage con fail-safe (try/catch) y usageMetadata real
      const tokensIn = content.usageMetadata?.promptTokenCount ?? 1850;
      const tokensOut = content.usageMetadata?.candidatesTokenCount ?? 3200;
      try {
        await recordAiUsage(user.uid, "gemini_generation", tokensIn, tokensOut, 0);
      } catch (usageErr) {
        console.error("[API Generate] Warning: Falló el registro de uso de IA (recordAiUsage):", usageErr);
      }
    } catch (persistErr: any) {
      console.error("[API Generate] Fallo en persistencia Firestore:", persistErr);
      return NextResponse.json(
        {
          error: "PERSISTENCE_FAILED",
          message: "El contenido fue generado pero falló la persistencia atómica en Firestore",
          details: persistErr?.message || String(persistErr),
          contentPreview: { id: contentId, title: content.topicTitle }
        },
        { status: 500 }
      );
    }

    const latestBudget = await checkAiBudget(user.uid, user.role, 0);

    return NextResponse.json({
      ...content,
      id: contentId,
      intelligenceCard: intelligenceCard || undefined,
      budget: {
        spentEur: latestBudget.currentSpentEur,
        limitEur: latestBudget.limitEur,
        pct: latestBudget.pct
      }
    });
  } catch (error: any) {
    const errorDetails = {
      message: error?.message || String(error),
      name: error?.name,
      status: error?.status,
      code: error?.code,
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      hasGcpProject: Boolean(process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT),
      useVertexAi: process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || process.env.USE_VERTEX_AI === "true",
      stack: error?.stack
    };
    console.error("[API Generate ERROR DETALLADO VERTEX/GEMINI]:", JSON.stringify(errorDetails, null, 2));

    return NextResponse.json(
      { error: "La IA no ha respondido, vuelve a intentarlo", details: error?.message || String(error) },
      { status: 500 }
    );
  }
});
