import { fetchAndVerifySources } from "../src/lib/sources/verified-sources-service";

async function main() {
  const sku = process.argv[2] || "ECC120";
  const brand = process.argv[3] || "Axis";

  console.log(`[TEST] Probando servicio de verificación de fuentes fiables para SKU: ${sku}, Marca: ${brand}...`);
  
  const result = await fetchAndVerifySources({
    sku,
    brand,
    productName: `Cámara IP Profesional ${sku}`,
    includeNotebookLM: true
  });

  console.log("\n--- RESULTADO DE FUENTES VERIFICADAS ---");
  console.log(JSON.stringify(result, null, 2));
  console.log("--------------------------------------\n");

  if (result.sources.length >= 2 && result.overallTrustScore >= 0.8) {
    console.log("✅ Prueba completada con éxito. El nivel de confianza de las fuentes cumple el estándar.");
  } else {
    console.error("❌ La verificación no alcanzó el umbral mínimo.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Error running test:", err);
  process.exit(1);
});
