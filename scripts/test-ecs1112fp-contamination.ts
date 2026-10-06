import assert from "node:assert";
import { checkProductContamination } from "../src/lib/quality/editorial-quality-gate";
import type { ContentOutput } from "../src/lib/schema";

async function runTest() {
  console.log("Testing ECS1112FP with ECS112FP alias/typo from catalog specs...");

  const mockContentWithFeedAlias: Partial<ContentOutput> = {
    topicTitle: "EnGenius ECS1112FP Switch PoE Gigabit",
    claims: [
      {
        text: "EnGenius ECS112FP Switch POE Gigabit Gestionable IA de EnGenius Cloud 10 puertos LAN",
        sourceId: "https://www.ecomshop.es/productos/ecs1112fp"
      }
    ],
    editorialDecision: {
      sku: "ECS1112FP",
      productTruthLock: {
        sku: "ECS1112FP",
        model: "ECS1112FP",
        brand: "ENGENIUS"
      }
    } as any,
    blog: {
      title: "Despliegue del switch EnGenius ECS1112FP en redes empresariales",
      metaDescription: "Análisis del switch ECS1112FP y compatibilidad con el modelo ECS112FP del fabricante",
      slug: "ecs1112fp-guia",
      readingTimeMinutes: 5,
      targetKeywords: ["ECS1112FP", "Switch PoE"],
      htmlContent: "<article><p>El switch EnGenius ECS1112FP (referenciado en especificaciones técnicas como ECS112FP) proporciona 10 puertos Gigabit PoE+.</p></article>",
      cleanPlainTextExcerpt: "El switch EnGenius ECS1112FP proporciona 10 puertos Gigabit PoE+."
    } as any
  };

  const report = checkProductContamination(mockContentWithFeedAlias as ContentOutput, "ECS1112FP");
  console.log("Report:", report);
  assert.strictEqual(report.passed, true, "ECS112FP should be whitelisted because it is in the product claims/specs!");

  // Now test genuine contamination with unrelated product (e.g. ECW536)
  const contaminatedContent: Partial<ContentOutput> = {
    ...mockContentWithFeedAlias,
    blog: {
      ...mockContentWithFeedAlias.blog,
      htmlContent: "<article><p>El switch ECS1112FP se conecta con el punto de acceso ECW536.</p></article>"
    } as any
  };

  const reportContaminated = checkProductContamination(contaminatedContent as ContentOutput, "ECS1112FP");
  console.log("Contaminated report:", reportContaminated);
  assert.strictEqual(reportContaminated.passed, false, "ECW536 must be detected as genuine contamination!");
  assert.deepStrictEqual(reportContaminated.detectedUnrelatedSkus, ["ECW536"]);

  console.log("✅ ALL ECS1112FP CONTAMINATION TESTS PASSED!");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
