import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { generateGroundedContent, GroundedWriterService } from "../src/lib/services/grounded-writer";
import { NotebookIntelligenceService } from "../src/lib/services/notebook-intelligence";
import { validateEditorialQuality } from "../src/lib/quality/editorial-quality-gate";

async function runMandato2Benchmark() {
  console.log("==========================================================================");
  console.log("🚀 EJECUTANDO SUITE DE PRUEBA OBLIGATORIA MANDATO 2 PARA ENGENIUS ECW510");
  console.log("==========================================================================\n");

  const sku = "ECW510";
  const notebookIntel = new NotebookIntelligenceService();
  const intel = notebookIntel.synthesizeProductIntelligence(sku, ["src-0", "src-4", "src-8", "src-18"]);
  const writer = new GroundedWriterService();

  const audiences = [
    { key: "instalador", label: "Instalador B2B", description: "Instalador de Telecomunicaciones y Técnico Integrador" },
    { key: "director_tic", label: "Director TIC / Sistemas", description: "Director de TIC y Responsable de Infraestructura" },
    { key: "compras", label: "Jefe de Compras / TCO", description: "Jefe de Compras y Responsable de Aprovisionamiento B2B" },
    { key: "distribuidor", label: "Distribuidor / Canal", description: "Distribuidor y Mayorista de Canal B2B" }
  ];

  const outputDir = path.join(process.cwd(), ".agent-output", "mandato2");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: Record<string, any> = {};

  for (const aud of audiences) {
    console.log(`--------------------------------------------------------------------------`);
    console.log(`📌 Generando Artículo para Audiencia: ${aud.label} (${aud.description})...`);

    const content = await writer.generateGroundedContent({
      sku,
      topicTitle: `Migración a Wi-Fi 7 y Despliegue de Alta Conectividad B2B`,
      category: "wifi",
      targetAudience: aud.label,
      intel,
      selectedSourceIds: ["src-0", "src-4", "src-8", "src-18"]
    });

    // Validar con Quality Gate Mandato 2
    const qualityReport = validateEditorialQuality(content, aud.label);

    console.log(`  ✓ Fact-Check Score: ${content.factCheckScore}%`);
    console.log(`  ✓ Tesis Editorial Presente: ${Boolean(content.editorialThesis)}`);
    console.log(`  ✓ Problema Planteado: "${content.editorialThesis?.problem}"`);
    console.log(`  ✓ Titular Generado: "${content.blog?.title}"`);
    console.log(`  ✓ Quality Gate Passed: ${qualityReport.passed} (${qualityReport.score}/100)`);
    console.log(`  ✓ Mensaje Aceptación: "${qualityReport.acceptanceMessage}"\n`);

    assert.ok(content.editorialThesis, `Debe generar editorialThesis para ${aud.label}`);
    assert.ok(content.outline, `Debe generar outline para ${aud.label}`);
    assert.ok(content.blog?.htmlContent, `Debe generar HTML para ${aud.label}`);
    assert.ok(
      !content.blog.htmlContent.includes("Visión General del Producto"),
      `Prohibido encabezado 'Visión General del Producto' en ${aud.label}`
    );
    assert.ok(
      qualityReport.passed,
      `Quality Gate debe pasar para ${aud.label}. Falló: ${qualityReport.acceptanceMessage}`
    );

    const artifactPath = path.join(outputDir, `ecw510_${aud.key}.json`);
    fs.writeFileSync(artifactPath, JSON.stringify({ content, qualityReport }, null, 2), "utf-8");
    console.log(`  💾 Guardado artefacto completo en: ${artifactPath}\n`);

    results[aud.key] = content;
  }

  console.log("==========================================================================");
  console.log("✅ TODAS LAS PRUEBAS DE AUDIENCIA ECW510 SUPERADAS SATISFACTORIAMENTE");
  console.log("==========================================================================");
}

runMandato2Benchmark().catch((err) => {
  console.error("❌ ERROR EN SUITE MANDATO 2:", err);
  process.exit(1);
});
