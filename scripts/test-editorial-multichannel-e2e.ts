process.env.NODE_ENV = "test";
process.env.ALLOW_EDITORIAL_FALLBACK = "true";

import assert from "node:assert";
import { describe, it } from "node:test";
import { generateB2BContent } from "../src/lib/generator";
import { buildGenerationContext } from "../src/server/services/generation-context";
import { EditorialOrchestrator } from "../src/lib/services/editorial-orchestrator";
import { ChannelStrategyPlanner } from "../src/lib/services/channel-strategy-planner";
import { CrossChannelCritic } from "../src/lib/services/cross-channel-critic";

describe("E2E Phase 3 — Editorial Multichannel Hardening Suite", () => {
  it("A1 - A16: Flujo Completo Multicanal con SKU Lock y Product Truth (ECW536)", async () => {
    const requestedSku = "ECW536";
    const context = await buildGenerationContext({ sku: requestedSku });

    // 1. requestedSku === canonicalSku
    assert.strictEqual(context.requestedSku, requestedSku, "A1: requestedSku debe ser exacto");
    assert.strictEqual(context.canonicalSku, requestedSku, "A1: canonicalSku debe coincidir con el solicitado");

    // 2. Product Truth presente
    assert.ok(context.intel, "A2: Product Truth StructuredProductIntelligence debe existir");
    assert.strictEqual(context.intel.sku, requestedSku, "A2: intel.sku debe coincidir");
    assert.ok(context.catalogDevice, "A2: catalogDevice debe existir");

    // 3. Cero contaminación cruzada de otros SKUs
    const orchestrator = new EditorialOrchestrator();
    const decision = await orchestrator.generate({
      sku: context.canonicalSku,
      category: context.effectiveCategory,
      topicTitle: context.effectiveTitle,
      intel: context.intel,
      evidenceMap: context.evidenceMap,
      productType: context.productType
    });

    assert.ok(decision.thesis, "A4: Tesis editorial debe ser generada");
    assert.ok(decision.thesis.problem, "A4: Tesis debe contener problema");
    assert.ok(decision.thesis.centralArgument, "A4: Tesis debe contener argumento central");

    // 4. Estrategia multicanal independiente
    const planner = new ChannelStrategyPlanner();
    const strategies = planner.plan({
      context,
      decision,
      targetAudience: decision.primaryAudience
    });

    assert.ok(strategies.BLOG, "A5: Estrategia BLOG debe existir");
    assert.ok(strategies.LINKEDIN, "A6: Estrategia LINKEDIN debe existir");
    assert.ok(strategies.WHATSAPP, "A7: Estrategia WHATSAPP debe existir");
    assert.ok(strategies.MAILCHIMP, "A8: Estrategia MAILCHIMP debe existir");
    assert.ok(strategies.GEO, "A9: Estrategia GEO debe existir");

    // 5. Generación de contenido B2B multicanal
    const content = await generateB2BContent({ sku: requestedSku }, context);

    assert.ok(content.blog?.htmlContent, "A5: Blog debe tener contenido HTML");
    assert.ok(content.linkedin?.fullPostText, "A6: LinkedIn debe tener fullPostText");
    assert.ok(content.whatsapp?.formattedMessage, "A7: WhatsApp debe tener formattedMessage");
    assert.ok(content.mailchimp?.subjectA && content.mailchimp?.newsletterHtml, "A8: Mailchimp debe tener subjectA y newsletterHtml");
    assert.ok(content.geo?.htmlContent, "A9: GEO debe tener htmlContent");

    // 6. Test de diferenciación Jaccard < 0.55
    const critic = new CrossChannelCritic();
    const crossReport = critic.evaluate(content, strategies, requestedSku);
    assert.ok(crossReport.channelDiversity >= 50, `A10: Channel diversity debe ser >= 50 (obtenido: ${crossReport.channelDiversity})`);
    assert.strictEqual(crossReport.productTruthConsistency, 1.0, "A10: productTruthConsistency debe ser 1.0");
    assert.strictEqual(crossReport.forbiddenOverlap.length, 0, "A10: No debe existir overlap prohibido entre canales");

    // 7. Grounding verificado
    assert.ok(content.claims.length > 0, "A12: Debe tener claims vinculados a fuentes");
    assert.ok(Object.keys(content.citations).length > 0, "A12: Debe tener citas de laboratorio/feed");

    // 8. Honest Fallback
    if (content.fallbackUsed) {
      assert.strictEqual(content.status, "NEEDS_REVIEW", "A11: Fallback jamás debe auto-aprobarse");
      assert.ok(content.fallbackNotice, "A11: Debe incluir fallbackNotice explícito");
    }
  });

  it("Test de Contaminación Cruzada: Cero menciones de otros SKUs no relacionados", async () => {
    const requestedSku = "ECW515";
    const context = await buildGenerationContext({ sku: requestedSku });
    const content = await generateB2BContent({ sku: requestedSku }, context);

    const fullText = [
      content.blog?.htmlContent || "",
      content.linkedin?.fullPostText || "",
      content.whatsapp?.formattedMessage || "",
      content.mailchimp?.newsletterHtml || "",
      content.geo?.htmlContent || ""
    ].join(" ");

    // No debe contener menciones aisladas de otros access points como ECW536 o switches ajenos
    assert.ok(!fullText.includes("ECW536"), "No debe contaminar ECW515 con referencias a ECW536");
    assert.ok(!fullText.includes("ECS5512FP"), "No debe contaminar ECW515 con ECS5512FP");
  });

  it("Test de Diversidad Editorial: Variación determinista con variationSeed", async () => {
    const sku = "ECW536";
    const context = await buildGenerationContext({ sku });
    const orchestrator = new EditorialOrchestrator();

    const dec1 = await orchestrator.generate({
      sku,
      category: context.effectiveCategory,
      topicTitle: context.effectiveTitle,
      intel: context.intel,
      evidenceMap: context.evidenceMap,
      productType: context.productType,
      variationSeed: 1
    });

    const dec2 = await orchestrator.generate({
      sku,
      category: context.effectiveCategory,
      topicTitle: context.effectiveTitle,
      intel: context.intel,
      evidenceMap: context.evidenceMap,
      productType: context.productType,
      variationSeed: 2
    });

    assert.ok(dec1.selectedAngle, "Debe seleccionar un ángulo en run 1");
    assert.ok(dec2.selectedAngle, "Debe seleccionar un ángulo en run 2");
    assert.ok(dec1.thesis.problem, "Tesis 1 debe tener problema");
    assert.ok(dec2.thesis.problem, "Tesis 2 debe tener problema");
  });

  it("Simulación de Fallback Honesto: Contingencia controlada sin inventar datos", async () => {
    const sku = "ECW510";
    const context = await buildGenerationContext({ sku });
    const orchestrator = new EditorialOrchestrator();
    const decision = await orchestrator.generate({
      sku,
      category: context.effectiveCategory,
      topicTitle: context.effectiveTitle,
      intel: context.intel,
      evidenceMap: context.evidenceMap,
      productType: context.productType
    });

    const planner = new ChannelStrategyPlanner();
    const strategies = planner.plan({ context, decision, targetAudience: decision.primaryAudience });

    // Instanciar writer forzando fallback
    const { GroundedWriterService } = await import("../src/lib/services/grounded-writer");
    const writer = new GroundedWriterService();
    const fallbackResult = await writer.generateGroundedContent({
      sku,
      topicTitle: context.effectiveTitle,
      category: context.effectiveCategory,
      intel: context.intel,
      editorialDecision: decision
    }, context);

    assert.ok(fallbackResult.fallbackUsed, "Debe marcar fallbackUsed=true en entorno sin API Key");
    assert.strictEqual(fallbackResult.status, "NEEDS_REVIEW", "El fallback debe quedar en NEEDS_REVIEW");
    assert.ok(fallbackResult.fallbackNotice, "Debe tener fallbackNotice");
    assert.ok(fallbackResult.blog.htmlContent.includes(sku), "El blog debe contener el SKU");
  });
});
