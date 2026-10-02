import assert from "node:assert";
import { NotebookIntelligenceService } from "../src/lib/services/notebook-intelligence";
import { detectProductType, buildProductEvidenceMap } from "../src/lib/services/product-evidence-map";
import { EditorialOrchestrator } from "../src/lib/services/editorial-orchestrator";

const products = ["ECW536", "ECS2512FP", "DAC-10G-3M", "ESG510", "ECS5512F"];
const audiences = [
  "Ingeniero de redes Wi-Fi",
  "Instalador de infraestructura Wi-Fi",
  "Director TIC / Sistemas",
  "Responsable de Compras / TCO"
];

async function main() {
  const notebook = new NotebookIntelligenceService();
  const orchestrator = new EditorialOrchestrator();
  const decisions = [];

  for (const sku of products) {
    const intel = notebook.synthesizeProductIntelligence(sku);
    const type = detectProductType(sku, intel.card?.product?.category || "", intel.card?.technicalSpecs?.deviceType || "");
    const evidence = buildProductEvidenceMap(sku, intel);

    for (const audience of audiences) {
      const decision = await orchestrator.generate({
        sku,
        category: intel.card?.product?.category || "general",
        preferredAudience: audience,
        intel,
        evidenceMap: evidence,
        productType: type
      });
      decisions.push(decision);
    }
  }

  assert.equal(decisions.length, 20);
  assert.ok(decisions.every(d => d.angles.length >= 8 && d.angles.length <= 12));
  assert.ok(decisions.every(d => d.productTruthLock.sku === d.sku));

  const titleCount = new Set(decisions.map(d => d.selectedAngle.title)).size;
  const questionCount = new Set(decisions.map(d => d.selectedAngle.editorialQuestion)).size;
  const angleCount = new Set(decisions.map(d => d.selectedAngle.id)).size;

  const skuContamination = decisions.filter(d => d.productTruthLock.sku !== d.sku).length;
  const unresolvedDiversity = decisions.filter(d => d.diversityReport.collisionDetected).length;

  const report = {
    combinations: decisions.length,
    titleUniqueness: titleCount / decisions.length,
    editorialQuestionUniqueness: questionCount / decisions.length,
    angleUniqueness: angleCount / decisions.length,
    productContamination: skuContamination,
    unresolvedDiversityCollisions: unresolvedDiversity
  };

  console.log(JSON.stringify(report, null, 2));
  assert.equal(skuContamination, 0);
  assert.equal(unresolvedDiversity, 0);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
