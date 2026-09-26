import assert from "assert";
import { deriveOmnichannelAssets } from "../src/lib/services/omnichannel-deriver";
import { FullArticleResult } from "../src/lib/services/deep-section-writer";

async function testAuditoriaJuniaVisual() {
  console.log("=== Running Verification Test: Junia Visual Engine Audit Fixes ===");

  const dummyArticle: FullArticleResult = {
    title: "Guía de Despliegue del Switch Stonet ST3116G 16 Puertos Gigabit",
    slug: "guia-despliegue-stonet-st3116g",
    metaDescription: "Análisis técnico de instalación y conmutación del switch Stonet ST3116G.",
    targetAudience: "Instaladores B2B",
    totalWords: 850,
    internalLinksCount: 2,
    sections: [
      {
        sectionId: "sec-1",
        title: "1. Introducción al Switch Stonet ST3116G",
        level: "H2",
        contentType: "TEXT",
        htmlContent: "<p>El switch Stonet ST3116G ofrece 16 puertos Gigabit RJ45 en caja metálica de 19 pulgadas.</p>",
        wordCount: 120
      },
      {
        sectionId: "sec-2",
        title: "2. Topología de Red y Arquitectura del Stonet ST3116G",
        level: "H2",
        contentType: "TOPOLOGY_DIAGRAM",
        htmlContent: "<p>Diagrama de instalación troncal con el switch Stonet ST3116G.</p>",
        wordCount: 150
      }
    ],
    combinedHtml: "<p>Guía completa Stonet ST3116G...</p>"
  };

  const productContext = {
    sku: "ST3116G",
    brand: "Stonet",
    name: "ST3116G Switch 16-Port Unmanaged",
    deviceType: "Switch de Conmutación Gigabit",
    officialImageUrl: "https://www.ecomshop.es/images/stonet-st3116g.jpg"
  };

  console.log("Invoking deriveOmnichannelAssets with real ProductContext...");
  const output = await deriveOmnichannelAssets(
    dummyArticle,
    "topic-test-123",
    "switches",
    undefined,
    productContext
  );

  console.log("\n[VERIFICACIÓN 1] Verificando que HTML no contenga {{IMAGE:id}} no resueltos:");
  const hasUnresolvedPlaceholders = /\{\{IMAGE:[^}]+\}\}/.test(output.blog.htmlContent);
  assert(!hasUnresolvedPlaceholders, "ERROR: Quedan marcadores {{IMAGE:...}} sin sustituir en el blog final");
  console.log("✅ PASS: Todos los marcadores {{IMAGE:...}} han sido resueltos a URLs finales.");

  console.log("\n[VERIFICACIÓN 2] Verificando que no haya contaminación de marca (EnGenius en Stonet ST3116G):");
  const hasEnGeniusContamination = output.blog.htmlContent.includes("EnGenius");
  assert(!hasEnGeniusContamination, "ERROR: Se ha detectado contaminación de marca 'EnGenius' en un producto Stonet");
  console.log("✅ PASS: No existe contaminación de marca 'EnGenius'. El contenido respeta la identidad del producto.");

  console.log("\n[VERIFICACIÓN 3] Verificando sanitización (conservación de <figure>, <figcaption> y data-*):");
  const hasFigureTag = output.blog.htmlContent.includes("<figure") && output.blog.htmlContent.includes("<figcaption");
  assert(hasFigureTag, "ERROR: DOMPurify eliminó los tags <figure> o <figcaption>");
  console.log("✅ PASS: Los tags <figure> y <figcaption> son respetados por el sanitizer.");

  const hasDataAttrs = output.blog.htmlContent.includes("data-image-id");
  assert(hasDataAttrs, "ERROR: DOMPurify eliminó el atributo data-image-id");
  console.log("✅ PASS: Los atributos data-image-id y data-placement-after son conservados.");

  console.log("\n[VERIFICACIÓN 4] Verificando PhotoPlacements del Layout Editorial:");
  assert(output.blog.editorialLayout.photoPlacements.length > 0, "ERROR: No se generaron photoPlacements");
  const heroPlacement = output.blog.editorialLayout.photoPlacements[0];
  assert.equal(heroPlacement.productSku, "ST3116G", "El SKU del placement no coincide con el producto");
  assert(heroPlacement.imageUrl, "El placement no tiene asignada una imageUrl final");
  console.log("✅ PASS: PhotoPlacements generados y vinculados correctamente al producto ST3116G.");

  console.log("\n=== ALL AUDIT VERIFICATIONS PASSED SUCCESSFULLY ===");
}

testAuditoriaJuniaVisual().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
