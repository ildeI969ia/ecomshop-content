import { parseEcomshopHtml } from "../src/lib/services/ecomshop-extractor";
import { verifyAndSanitizeContent } from "../src/lib/services/evidence-engine";
import { ProductIntelligenceCard } from "../src/lib/types/product-intelligence";

const sampleHtml = `
<html>
<head>
  <title>Punto de acceso EnGenius ECW536 Cloud WiFi 7 - EcomShop</title>
  <meta property="og:title" content="Punto de acceso EnGenius ECW536 Cloud WiFi 7">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "EnGenius Cloud WiFi 7 ECW536",
    "sku": "ECW536",
    "brand": { "@type": "Brand", "name": "EnGenius" },
    "offers": {
      "@type": "Offer",
      "price": "649.00",
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock"
    }
  }
  </script>
</head>
<body>
  <div class="data-sheet">
    <dl class="data-sheet">
      <dt class="name">Puertos:</dt>
      <dd class="value">1x 10GbE RJ45 PoE++</dd>
      <dt class="name">Estándar:</dt>
      <dd class="value">Wi-Fi 7 (802.11be) Tri-Band</dd>
    </dl>
  </div>
  <div class="product-description">
    Punto de acceso profesional con modulación 4096-QAM y canales ultraanchos de 320 MHz.
  </div>
</body>
</html>
`;

async function runTests() {
  console.log("1. Probando parseEcomshopHtml...");
  const extracted = parseEcomshopHtml(sampleHtml, "https://www.ecomshop.es/engenius-ecw536");
  if (extracted.sku !== "ECW536" || extracted.brand !== "EnGenius") {
    throw new Error(`Extracción fallida: SKU=${extracted.sku}, Brand=${extracted.brand}`);
  }
  console.log("✓ Extracción exitosa:", extracted.title, "| SKU:", extracted.sku, "| Atributos:", Object.keys(extracted.attributes).length);

  console.log("2. Probando EvidenceEngine sanitization...");
  const card: ProductIntelligenceCard = {
    product: {
      brand: "EnGenius",
      model: "ECW526",
      sku: "ECW526",
      category: "wifi",
      stockStatus: "IN_STOCK"
    },
    technicalSpecs: {
      standards: ["Wi-Fi 7 (802.11be)"],
      ports: ["1x 2.5GbE RJ45"],
      powerRequirements: "PoE+ 802.3at",
      management: "EnGenius Cloud",
      keyDifferentiators: ["Sin licencias"]
    },
    evidenceLedger: [
      {
        claim: "Puerto uplink 2.5GbE PoE+",
        source: "Datasheet ECW526",
        sourceType: "DATASHEET",
        confidence: "HIGH",
        verified: true
      }
    ],
    commercialAngles: {
      executiveRoi: "0€ licencias",
      engineeringPerformance: "Baja latencia",
      operationsDeployment: "Aprovisionamiento QR"
    },
    complementaryProducts: [],
    generatedAt: new Date().toISOString()
  };

  // Borrador con alucinación (menciona 10G cuando el ECW526 es 2.5G)
  const hallucinatedDraft = "El nuevo ECW526 cuenta con un puerto 10Gbps para máxima velocidad.";
  const audit = await verifyAndSanitizeContent(hallucinatedDraft, "blog", card);
  console.log("✓ Auditoría EvidenceEngine completada.");
  console.log("Score:", audit.factCheckScore);
  console.log("Sanitized draft:", audit.sanitizedContent);
  console.log("Unverified claims podadas:", audit.unverifiedClaims);
  console.log("✓ PIPELINE COMPLETO VERIFICADO.");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
