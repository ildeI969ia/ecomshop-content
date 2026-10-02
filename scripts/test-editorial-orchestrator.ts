import assert from "node:assert";
import { NotebookIntelligenceService } from "../src/lib/services/notebook-intelligence";
import { detectProductType, buildProductEvidenceMap } from "../src/lib/services/product-evidence-map";
import { EditorialOrchestrator } from "../src/lib/services/editorial-orchestrator";

async function build(sku: string, audience?: string) {
  const notebook = new NotebookIntelligenceService();
  const intel = notebook.synthesizeProductIntelligence(sku);
  const type = detectProductType(sku, intel.card?.product?.category || "", intel.card?.technicalSpecs?.deviceType || "");
  const evidence = buildProductEvidenceMap(sku, intel);
  const decision = await new EditorialOrchestrator().generate({
    sku,
    category: intel.card?.product?.category || "general",
    preferredAudience: audience,
    workspaceId: undefined,
    intel,
    evidenceMap: evidence,
    productType: type
  });
  return decision;
}

async function main() {
  console.log("=== Editorial Orchestrator Contract Tests ===");

  const audiences = ["Ingeniero de redes Wi-Fi", "Instalador de infraestructura Wi-Fi", "Director TIC / Sistemas", "Responsable de infraestructura de campus"];
  const decisions = await Promise.all(audiences.map(a => build("ECW536", a)));
  const selectedTitles = decisions.map(d => d.selectedAngle.title);
  assert.equal(new Set(selectedTitles).size, audiences.length, "Mismo SKU + targets distintos deben producir ángulos distintos");
  assert.ok(decisions.every(d => d.angles.length >= 8 && d.angles.length <= 12), "Cada decisión debe ofrecer 8-12 ángulos");
  assert.ok(decisions.every(d => d.recommendedAudiences.length >= 4), "Debe calcular Target Persons específicos");
  assert.ok(decisions.every(d => d.editorialQuestions.length >= 8), "Debe generar preguntas editoriales suficientes");

  const products = ["ECW536", "ECS2512FP", "DAC-10G-3M", "ESG510"];
  const productDecisions = await Promise.all(products.map(sku => build(sku, "Ingeniero de redes")));
  assert.equal(new Set(productDecisions.map(d => d.selectedAngle.title)).size, products.length, "Productos distintos + mismo target deben producir decisiones distintas");
  assert.ok(productDecisions.every(d => d.productTruthLock.sku === d.sku), "Product Truth lock debe coincidir con el SKU solicitado");

  const fallback = await build("DAC-10G-3M", "Instalador de cableado");
  assert.equal(fallback.productType, "DAC");
  assert.ok(fallback.selectedAngle.editorialQuestion.toLowerCase().includes("dac") || fallback.selectedAngle.editorialQuestion.toLowerCase().includes("optica") || fallback.selectedAngle.editorialQuestion.toLowerCase().includes("longitud"), "Fallback determinista debe ser específico del producto");
  assert.equal(fallback.diversityReport.comparedCount, 0, "Sin workspace no se consulta memoria Firestore");

  console.log("PASS: 4 targets / 1 SKU generan decisiones diferentes");
  console.log("PASS: 4 productos / 1 target generan decisiones diferentes");
  console.log("PASS: Product Truth lock y fallback por tipo de producto");
}

main().catch(error => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
