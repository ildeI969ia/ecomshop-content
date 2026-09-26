import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { GroundedWriterService } from "../src/lib/services/grounded-writer";
import { NotebookIntelligenceService } from "../src/lib/services/notebook-intelligence";
import { validateEditorialQuality, checkProductContamination } from "../src/lib/quality/editorial-quality-gate";

async function runSkuSyncAndContaminationTestSuite() {
  console.log("==========================================================================");
  console.log("🚀 EJECUTANDO SUITE DE REGRESIÓN DE SINCRONIZACIÓN DE SKU Y ANTI-CONTAMINACIÓN");
  console.log("==========================================================================\n");

  const notebookIntel = new NotebookIntelligenceService();
  const writer = new GroundedWriterService();

  const outputDir = path.join(process.cwd(), ".agent-output", "sku-sync");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // --- TEST 1: Oportunidad previa = ECW510, pero el usuario selecciona DAC-10G-3M ---
  console.log("--------------------------------------------------------------------------");
  console.log("📌 TEST 1: Oportunidad activa = ECW510 | SKU seleccionado = DAC-10G-3M");
  const reqSku1 = "DAC-10G-3M";
  const intel1 = notebookIntel.synthesizeProductIntelligence(reqSku1, ["src-8", "src-18"]);

  const content1 = await writer.generateGroundedContent({
    sku: reqSku1,
    topicTitle: "Cable de Conexión Directa en Cobre 10G SFP+ 3 Metros",
    category: "fibra",
    targetAudience: "Director TIC / Sistemas",
    intel: intel1
  });

  const contamination1 = checkProductContamination(content1, reqSku1);
  const qualityReport1 = validateEditorialQuality(content1, "Director TIC / Sistemas", reqSku1);

  console.log(`  * Requested SKU: ${reqSku1}`);
  console.log(`  * Generated Topic: "${content1.topicTitle}"`);
  console.log(`  * Tesis Editorial Presente: ${Boolean(content1.editorialThesis)}`);
  console.log(`  * Contamination Check Passed: ${contamination1.passed}`);
  if (!contamination1.passed) {
    console.log(`    ❌ Skus no relacionados detectados: ${contamination1.detectedUnrelatedSkus.join(", ")}`);
  }
  console.log(`  * Quality Gate Message: "${qualityReport1.acceptanceMessage}"\n`);

  assert.strictEqual(content1.blog?.targetKeywords?.[0] || reqSku1, reqSku1, "El SKU generado debe coincidir exactamente con el SKU solicitado (DAC-10G-3M)");
  assert.ok(contamination1.passed, `El contenido de DAC-10G-3M NO puede estar contaminado con ECW510. Detectado: ${contamination1.detectedUnrelatedSkus.join(", ")}`);
  assert.ok(qualityReport1.passed, `Quality Gate falló para TEST 1: ${qualityReport1.acceptanceMessage}`);

  // --- TEST 2: Usuario selecciona ECW510 ---
  console.log("--------------------------------------------------------------------------");
  console.log("📌 TEST 2: SKU seleccionado = ECW510 (Punto de Acceso Wi-Fi 7)");
  const reqSku2 = "ECW510";
  const intel2 = notebookIntel.synthesizeProductIntelligence(reqSku2, ["src-0", "src-4", "src-18"]);

  const content2 = await writer.generateGroundedContent({
    sku: reqSku2,
    topicTitle: "Migración a Wi-Fi 7 y Despliegue de Alta Conectividad B2B",
    category: "wifi",
    targetAudience: "Instalador B2B",
    intel: intel2
  });

  const contamination2 = checkProductContamination(content2, reqSku2);
  const qualityReport2 = validateEditorialQuality(content2, "Instalador B2B", reqSku2);

  console.log(`  * Requested SKU: ${reqSku2}`);
  console.log(`  * Generated Topic: "${content2.topicTitle}"`);
  console.log(`  * Contamination Check Passed: ${contamination2.passed}`);
  console.log(`  * Quality Gate Message: "${qualityReport2.acceptanceMessage}"\n`);

  assert.ok(contamination2.passed, `El contenido de ECW510 NO puede contener SKUs no relacionados como DAC-10G-3M`);
  assert.ok(qualityReport2.passed, `Quality Gate falló para TEST 2: ${qualityReport2.acceptanceMessage}`);

  // --- TEST 3: SKU de catálogo sin oportunidad previa (ST3116G) ---
  console.log("--------------------------------------------------------------------------");
  console.log("📌 TEST 3: SKU sin oportunidad previa = ST3116G (Switch Stonet 16 Puertos GbE)");
  const reqSku3 = "ST3116G";
  const intel3 = notebookIntel.synthesizeProductIntelligence(reqSku3, ["src-8"]);

  const content3 = await writer.generateGroundedContent({
    sku: reqSku3,
    topicTitle: "Switch de Conmutación B2B Stonet ST3116G",
    category: "switches",
    targetAudience: "Jefe de Compras / TCO",
    intel: intel3
  });

  const contamination3 = checkProductContamination(content3, reqSku3);
  const qualityReport3 = validateEditorialQuality(content3, "Jefe de Compras / TCO", reqSku3);

  console.log(`  * Requested SKU: ${reqSku3}`);
  console.log(`  * Contamination Check Passed: ${contamination3.passed}`);
  console.log(`  * Quality Gate Message: "${qualityReport3.acceptanceMessage}"\n`);

  assert.ok(contamination3.passed, `El contenido de ST3116G NO puede contener SKUs de Wi-Fi 7 ni transceptores no relacionados`);
  assert.ok(qualityReport3.passed, `Quality Gate falló para TEST 3: ${qualityReport3.acceptanceMessage}`);

  // Guardar informes de auditoría y evidencia
  fs.writeFileSync(path.join(outputDir, "dac-10g-3m.json"), JSON.stringify(content1, null, 2), "utf-8");
  fs.writeFileSync(path.join(outputDir, "ecw510.json"), JSON.stringify(content2, null, 2), "utf-8");
  fs.writeFileSync(path.join(outputDir, "st3116g.json"), JSON.stringify(content3, null, 2), "utf-8");

  console.log("==========================================================================");
  console.log("✅ TODAS LAS PRUEBAS DE REGRESIÓN DE SKU Y ANTI-CONTAMINACIÓN PASARON DE FORMA SATISFACTORIA");
  console.log("==========================================================================");
}

runSkuSyncAndContaminationTestSuite().catch((err) => {
  console.error("❌ ERROR EN SUITE DE SINCRONIZACIÓN DE SKU:", err);
  process.exit(1);
});
