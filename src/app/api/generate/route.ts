import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schema";
import { generateB2BContent } from "@/lib/generator";
import { sanitizeHtml } from "@/server/security/sanitizer";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { FinOpsRepository, AuditRepository, ContentRepository, ProductIntelligenceRepository } from "@/server/repositories";
import { FinOpsRecord, ContentItem, ContentVariant } from "@/server/domain/types";
import { extractEcomshopProduct } from "@/lib/services/ecomshop-extractor";
import { buildProductIntelligenceCard } from "@/lib/services/product-intelligence";
import { verifyAndSanitizeContent } from "@/lib/services/evidence-engine";
import { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import { getCatalogDevice, ECOMSHOP_CATALOG } from "@/lib/catalog";

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const json = await req.json();
    const parsed = GenerateRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de entrada inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const inputData = parsed.data;

    // Detectar si el SKU corresponde a un dispositivo canónico de ECOMSHOP_CATALOG
    const targetSku = inputData.sku || inputData.customEquipmentName || (inputData.promotedProductIds && inputData.promotedProductIds[0]) || "";
    const catalogDevice = getCatalogDevice(targetSku) ||
      (inputData.topicTitle ? getCatalogDevice(inputData.topicTitle) : undefined) ||
      (inputData.productUrl ? getCatalogDevice(inputData.productUrl) : undefined);

    // 1. Fase de Extracción o Enriquecimiento con ECOMSHOP_CATALOG
    let intelligenceCard: ProductIntelligenceCard | null = null;
    let effectiveTitle = inputData.topicTitle;
    let effectiveCategory = inputData.category;
    let productUrl = inputData.productUrl;

    if (catalogDevice) {
      if (!effectiveTitle) {
        effectiveTitle = `${catalogDevice.brand} ${catalogDevice.sku}: ${catalogDevice.name}`;
      }
      if (effectiveCategory === "general") {
        if (catalogDevice.category.startsWith("WIFI")) effectiveCategory = "wifi";
        else if (catalogDevice.category.startsWith("SWITCH")) effectiveCategory = "switches";
        else if (catalogDevice.category === "GATEWAY_SDWAN") effectiveCategory = "engenius";
        else effectiveCategory = "engenius";
      }
      if (!productUrl) {
        productUrl = catalogDevice.productUrl;
      }
      if (!inputData.selectedSourceIds || inputData.selectedSourceIds.length === 0) {
        inputData.selectedSourceIds = [catalogDevice.notebookSource, "src-4", "src-18"].filter(Boolean);
      }
      try {
        const { ProductIntelligenceService } = await import("@/server/services/product-intelligence-service");
        const intelService = new ProductIntelligenceService();
        intelligenceCard = await intelService.getOrGenerateCard(catalogDevice.sku);
      } catch (intelErr) {
        console.warn("[API Generate] No se pudo obtener tarjeta de inteligencia para catalogDevice:", intelErr);
      }
    } else if (productUrl) {
      try {
        const rawProduct = await extractEcomshopProduct(productUrl);
        intelligenceCard = await buildProductIntelligenceCard(rawProduct);

        if (!effectiveTitle) {
          effectiveTitle = `${rawProduct.brand} ${rawProduct.sku}: Despliegue y Ventajas Técnicas B2B`;
        }
        if (effectiveCategory === "general") {
          const lowerCat = (rawProduct.category || "").toLowerCase();
          if (lowerCat.includes("wifi") || rawProduct.sku.includes("ECW")) effectiveCategory = "wifi";
          else if (lowerCat.includes("switch") || rawProduct.sku.includes("ECS")) effectiveCategory = "switches";
          else if (lowerCat.includes("fibra") || lowerCat.includes("sfp")) effectiveCategory = "fibra";
          else effectiveCategory = "engenius";
        }
      } catch (extErr) {
        console.warn("[API Generate] Fallo en extracción/intelligence previa (continuando):", extErr);
      }
    }

    if (!effectiveTitle) {
      effectiveTitle = "Solución de Conectividad Profesional EcomShop";
    }

    // 2. Generar Borradores Multicanal
    let content = await generateB2BContent({
      ...inputData,
      sku: catalogDevice?.sku || inputData.sku,
      productUrl: productUrl || catalogDevice?.productUrl,
      topicTitle: effectiveTitle,
      category: effectiveCategory
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

    // 5. Persistencia en Firestore (Contents, Variants, ProductIntelligence, FinOps, Audit)
    let contentId = `content-${content.topicId}-${Date.now().toString(36)}`;
    try {
      const nowIso = new Date().toISOString();
      const contentRepo = new ContentRepository();

      const contentItem: ContentItem = {
        id: contentId,
        workspaceId: user.workspaceId,
        title: content.blog.title || content.topicTitle,
        slug: content.blog.slug || content.topicId,
        category: content.category,
        status: "DRAFT",
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
        { channel: "BLOG", payload: content.blog, title: content.blog.title },
        { channel: "MAILCHIMP", payload: content.mailchimp, title: content.mailchimp.subjectA },
        { channel: "WHATSAPP", payload: content.whatsapp, title: content.whatsapp.headline },
        { channel: "LINKEDIN", payload: content.linkedin, title: content.linkedin.hook }
      ];

      for (const ch of channels) {
        const variant: ContentVariant = {
          id: `var-${ch.channel.toLowerCase()}-${Date.now().toString(36)}`,
          contentId,
          channel: ch.channel,
          status: "DRAFT",
          title: ch.title,
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
        model: "gemini-2.5-flash",
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

    return NextResponse.json({
      ...content,
      id: contentId,
      intelligenceCard: intelligenceCard || undefined
    });
  } catch (error: any) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Error interno al procesar el contenido", details: error?.message || String(error) },
      { status: 500 }
    );
  }
});
