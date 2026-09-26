import assert from "assert";
import { GroundedWriterService } from "../src/lib/services/grounded-writer";

async function testGroundedFallbackCyberscope() {
  console.log("=== Testing GroundedWriterService Fallback for CYBERSCOPE ===");

  const writer = new GroundedWriterService();
  const result = await writer.generateGroundedContent({
    sku: "CYBERSCOPE",
    topicTitle: "Auditoría y Certificación de Red con NetAlly CYBERSCOPE",
    category: "TESTER",
    selectedSourceIds: ["src-4"],
    intel: {
      sku: "CYBERSCOPE",
      brand: "NetAlly",
      model: "CYBERSCOPE Handheld Cyber Security Analyzer",
      recommendedTone: "ENGINEERING_PREVENTA",
      naturalSector: "ENTERPRISE_OFFICE",
      recommendedCompetitor: "FLUKE",
      keyClaims: [{ claim: "Certificación y escaneo de vulnerabilidades en capa física e IP", sourceId: "src-4" }],
      card: {
        product: {
          brand: "NetAlly",
          model: "CYBERSCOPE",
          category: "TESTER"
        },
        technicalSpecs: {
          ports: ["RJ45 10G/1G", "SFP+ 10G", "Wi-Fi 6E Antenna"],
          powerRequirements: "Batería Li-Ion Recargable",
          standards: ["IEEE 802.3", "Wi-Fi 6E 802.11ax"],
          deviceType: "TESTER",
          management: "AllyCare Cloud"
        },
        evidenceLedger: [],
        compatibilityMatrix: []
      },
      mandatoryElectronics: {
        recommendedSwitchSku: "SFP-10G-SR-KIT",
        recommendedSwitchName: "Transceptores 10G SFP+"
      }
    }
  });

  console.log("Resultado obtenido para SKU CYBERSCOPE:");
  console.log("- Source:", result.source);
  console.log("- Status:", result.status);
  console.log("- Blog Title:", result.blog.title);

  assert.equal(result.blog.targetKeywords.includes("NetAlly"), true, "El contenido debe incluir la marca NetAlly");
  assert.equal(result.blog.htmlContent.includes("EnGenius"), false, "No debe haber contaminación de EnGenius para CYBERSCOPE");
  assert.equal(result.blog.htmlContent.includes("RUT956"), false, "No debe haber contaminación de RUT956 para CYBERSCOPE");

  console.log("✅ PASS: Fallback generado correctamente para CYBERSCOPE sin contaminación ni errores 500.");
}

testGroundedFallbackCyberscope().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
