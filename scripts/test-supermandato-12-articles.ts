import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { GroundedWriterService } from "../src/lib/services/grounded-writer";
import { NotebookIntelligenceService } from "../src/lib/services/notebook-intelligence";
import { validateEditorialQuality, checkProductContamination } from "../src/lib/quality/editorial-quality-gate";
import { detectProductType, buildProductEvidenceMap } from "../src/lib/services/product-evidence-map";
import { generateEditorialAngleCandidates, selectBestEditorialAngle } from "../src/lib/services/editorial-angle-engine";
import { auditEditorialQualityWithCritic } from "../src/lib/services/editorial-critic";
import { MasterEditorialPackage } from "../src/lib/types/editorial-intelligence";

async function runSupermandato12ArticlesBenchmark() {
  console.log("==========================================================================");
  console.log("🚀 EJECUTANDO SUITE DEFINITIVA DEL SUPERMANDATO: 12 ARTÍCULOS REALES");
  console.log("==========================================================================\n");

  const products = [
    { sku: "DAC-10G-3M", topic: "Interconexión Pasiva 10G SFP+ 3 Metros", category: "fibra", sourceIds: ["src-8", "src-18"] },
    { sku: "ECW510", topic: "Migración a Wi-Fi 7 y Despliegue de Alta Conectividad B2B", category: "wifi", sourceIds: ["src-0", "src-4", "src-8", "src-18"] },
    { sku: "ST3116G", topic: "Switch de Conmutación B2B Stonet ST3116G 16 Puertos GbE", category: "switches", sourceIds: ["src-8"] }
  ];

  const audiences = [
    { key: "instalador", label: "Instalador B2B" },
    { key: "director_tic", label: "Director TIC / Sistemas" },
    { key: "compras", label: "Jefe de Compras / TCO" },
    { key: "distribuidor", label: "Distribuidor / Canal" }
  ];

  const outputDir = path.join(process.cwd(), ".agent-output", "supermandato");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const notebookIntel = new NotebookIntelligenceService();
  const writer = new GroundedWriterService();
  const masterPackages: MasterEditorialPackage[] = [];

  let articleIndex = 1;

  for (const prod of products) {
    const intel = notebookIntel.synthesizeProductIntelligence(prod.sku, prod.sourceIds);
    const productType = detectProductType(prod.sku, prod.category, intel.card?.technicalSpecs?.deviceType);
    const evidenceMap = buildProductEvidenceMap(prod.sku, intel);

    for (const aud of audiences) {
      console.log("--------------------------------------------------------------------------");
      console.log(`📌 [${articleIndex}/12] Generando Artículo: SKU=${prod.sku} | Audiencia=${aud.label}...`);

      const content = await writer.generateGroundedContent({
        sku: prod.sku,
        topicTitle: prod.topic,
        category: prod.category,
        targetAudience: aud.label,
        intel,
        selectedSourceIds: prod.sourceIds
      });

      // 1. Angle Engine
      const angleCandidates = generateEditorialAngleCandidates(prod.sku, productType, aud.label, intel);
      const selectedAngle = selectBestEditorialAngle(angleCandidates);

      // 2. Editorial Critic
      const criticReport = auditEditorialQualityWithCritic(content, selectedAngle, evidenceMap, aud.label);

      // 3. Quality Gate & Contamination
      const qualityReport = validateEditorialQuality(content, aud.label, prod.sku);
      const contaminationReport = checkProductContamination(content, prod.sku);

      console.log(`  * Editorial Question: "${selectedAngle.editorialQuestion}"`);
      console.log(`  * Reader Promise: "${selectedAngle.readerPromise}"`);
      console.log(`  * Reader Learnings: ${criticReport.readerLearnings.length} temas clave aprendidos`);
      console.log(`  * Critic Publishability Score: ${criticReport.publishability}/10`);
      console.log(`  * Quality Gate Passed: ${qualityReport.passed} (${qualityReport.score}/100)`);
      console.log(`  * Anti-Contamination Passed: ${contaminationReport.passed}`);
      console.log(`  * Acceptance Message: "${qualityReport.acceptanceMessage}"\n`);

      // Verificaciones estrictas del Supermandato
      assert.ok(content.editorialThesis, `Debe generar editorialThesis para ${prod.sku} - ${aud.label}`);
      assert.ok(content.outline, `Debe generar outline para ${prod.sku} - ${aud.label}`);
      assert.ok(content.blog?.htmlContent, `Debe generar HTML para ${prod.sku} - ${aud.label}`);
      assert.ok(qualityReport.passed, `Quality Gate falló para ${prod.sku} - ${aud.label}: ${qualityReport.acceptanceMessage}`);
      assert.ok(contaminationReport.passed, `Anti-contaminación falló para ${prod.sku} - ${aud.label}`);
      assert.ok(criticReport.publishability >= 8, `Editorial Critic rechazó el artículo (${criticReport.publishability}/10)`);
      assert.ok(criticReport.readerLearnings.length >= 3, `Debe extraer al menos 3 aprendizajes del lector para ${prod.sku} - ${aud.label}`);

      const pkg: MasterEditorialPackage = {
        productSku: prod.sku,
        targetAudience: aud.label,
        productType,
        editorialQuestion: selectedAngle.editorialQuestion,
        editorialAngle: selectedAngle.title,
        tension: selectedAngle.tension,
        thesis: content.editorialThesis!,
        readerPromise: selectedAngle.readerPromise,
        readerLearnings: criticReport.readerLearnings,
        outline: content.outline!,
        evidenceMap,
        criticReport,
        factCheckPassed: qualityReport.factCheck.passed,
        finalStatus: "PUBLISHABLE",
        blogHtml: content.blog.htmlContent,
        article: {
          title: content.blog.title,
          metaDescription: content.blog.metaDescription,
          slug: content.blog.slug,
          htmlContent: content.blog.htmlContent,
          plainText: content.blog.htmlContent.replace(/<[^>]+>/g, " ")
        }
      };

      masterPackages.push(pkg);

      const filename = `article_${articleIndex}_${prod.sku.toLowerCase()}_${aud.key}.json`;
      fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(pkg, null, 2), "utf-8");
      console.log(`  💾 Paquete entregable guardado en: ${path.join(outputDir, filename)}\n`);

      articleIndex++;
    }
  }

  // Guardar resumen maestro de los 12 paquetes
  fs.writeFileSync(path.join(outputDir, "master_12_packages_summary.json"), JSON.stringify(masterPackages, null, 2), "utf-8");

  console.log("==========================================================================");
  console.log("✅ SUPERMANDATO COMPLETADO SATISFACTORIAMENTE: 12 ARTÍCULOS PUBLICABLES GENERADOS Y VERIFICADOS");
  console.log("==========================================================================");
}

runSupermandato12ArticlesBenchmark().catch((err) => {
  console.error("❌ ERROR EN SUITE DEFINITIVA DEL SUPERMANDATO:", err);
  process.exit(1);
});
