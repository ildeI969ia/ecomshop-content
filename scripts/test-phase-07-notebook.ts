import { NotebookGroundingService } from "../src/lib/services/notebook-grounding";
import { buildProductIntelligenceCard } from "../src/lib/services/product-intelligence";
import { verifyAndSanitizeContent } from "../src/lib/services/evidence-engine";
import { RawExtractedProduct } from "../src/lib/services/ecomshop-extractor";

async function testNotebookGrounding() {
  console.log("1. Testeando NotebookGroundingService con SKU ECW510...");
  const service = new NotebookGroundingService();
  const res = await service.queryNotebookContext("EnGenius ECW510");
  console.log("Notebook consultado:", res.notebookName);
  console.log("Fuentes indexadas:", res.totalSourcesIndexed);
  console.log("Chunks encontrados:", res.matchedChunks.length);
  if (res.matchedChunks.length === 0) {
    throw new Error("No se encontraron chunks de grounding para ECW510");
  }
  console.log("Primer chunk:", res.matchedChunks[0].title);

  console.log("\n2. Testeando buildProductIntelligenceCard con Grounding...");
  const rawProduct: RawExtractedProduct = {
    url: "https://www.ecomshop.es/engenius-ecw510",
    title: "Punto de acceso EnGenius Cloud ECW510 Wi-Fi 7",
    brand: "EnGenius",
    sku: "ECW510",
    stockStatus: "IN_STOCK",
    category: "wifi",
    descriptionHtml: "<p>Punto de acceso Wi-Fi 7 BE5000 compacto para despachos y salas.</p>",
    descriptionText: "Punto de acceso Wi-Fi 7 BE5000 compacto para despachos y salas.",
    attributes: {
      "Puertos": "1x 2.5GbE RJ45",
      "Alimentación": "PoE+ 802.3at",
      "Estándar": "Wi-Fi 7 (802.11be)"
    },
    images: []
  };

  const card = await buildProductIntelligenceCard(rawProduct);
  console.log("Card generada para:", card.product.model);
  console.log("Standards:", card.technicalSpecs.standards);
  console.log("Ports:", card.technicalSpecs.ports);
  console.log("Evidence count:", card.evidenceLedger.length);

  console.log("\n3. Testeando EvidenceEngine con alucinación de 10Gbps...");
  const hallucinatedDraft = "El EnGenius ECW510 incluye puertos 10GbE y switch 10G integrado.";
  const audit = await verifyAndSanitizeContent(hallucinatedDraft, "blog", card);
  console.log("Sanitized result:", audit.sanitizedContent);
  console.log("Quality Gate:", audit.passedQualityGate ? "PASSED" : "FAILED");
  console.log("Score:", audit.factCheckScore);
  console.log("Unverified claims corregidas:", audit.unverifiedClaims);

  console.log("\n✓ TEST FASE 07.4 COMPLETADO CON ÉXITO.");
}

testNotebookGrounding().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
