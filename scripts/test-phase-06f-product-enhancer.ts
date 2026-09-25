import assert from "node:assert";
import { enhanceProductSheet, exportEnhancedSheetToHtml, exportEnhancedSheetToCsv } from "@/lib/services/product-sheet-enhancer";

async function runTest() {
  console.log("▶ Fase 6f — Pruebas de Modo 'Mejorar Ficha de Producto' (3 SKUs Reales)");

  const testSkus = ["ECW536", "ECS2512FP", "ESG510"];

  for (const sku of testSkus) {
    console.log(`\n--> Procesando SKU real: ${sku}...`);
    const sheet = await enhanceProductSheet(sku);

    // 1. Verificar SKU e Identidad
    assert.strictEqual(sheet.sku, sku, `El SKU procesado debe ser ${sku}`);
    assert.ok(sheet.brand, "La marca del producto debe estar definida");

    // 2. Verificar las 5 ventajas propuestas
    assert.ok(sheet.advantages.proposed, "Debe tener lista de ventajas propuestas");
    assert.strictEqual(sheet.advantages.proposed.length, 5, `Debe proponer exactamente 5 ventajas para ${sku}`);

    // 3. Verificar diferencias (actual vs. propuesto) y aceptación por separado
    assert.notStrictEqual(sheet.name.original, sheet.name.proposed, "El nombre propuesto debe ser diferente al original");
    assert.notStrictEqual(sheet.metaTitle.original, sheet.metaTitle.proposed, "El meta título propuesto debe ser diferente al original");
    assert.ok(sheet.faq.proposed.length >= 3, "Debe incluir bloque FAQ con al menos 3 preguntas/respuestas");
    assert.ok(sheet.comparison.proposed.closestModel, "Debe incluir comparativa con modelo cercano de la misma gama");

    // 4. Verificar Grounding de afirmaciones (Reglas 6c)
    assert.ok(sheet.groundingValidation, "Debe incluir reporte de grounding validation");
    assert.strictEqual(sheet.groundingValidation?.isValid, true, `Grounding validation debe ser válido para ${sku}`);

    // 5. Exportaciones (HTML y CSV)
    const htmlExport = exportEnhancedSheetToHtml(sheet);
    assert.ok(htmlExport.includes(sheet.sku), `La exportación HTML debe incluir el SKU ${sku}`);
    assert.ok(htmlExport.includes("5 Ventajas Clave"), "La exportación HTML debe incluir el bloque de 5 ventajas");

    const csvExport = exportEnhancedSheetToCsv(sheet);
    assert.ok(csvExport.includes(sheet.sku), `La exportación CSV debe incluir la fila para ${sku}`);

    console.log(`  ✔ SKU ${sku} procesado correctamente con 5 ventajas, FAQ, comparativa, grounding validado y exportación HTML/CSV.`);
  }

  console.log("\n✔ Fase 6f — Pruebas de mejora de fichas de producto completadas con éxito en 3 SKUs reales.");
}

runTest().catch((err) => {
  console.error("❌ Error en prueba 6f:", err);
  process.exit(1);
});
