/**
 * Sprint P1-B: Automated Regression Test for Product Identity, Brand Mixing & Unknown SKU Handling
 *
 * Verificaciones:
 * 1. Resolución de identidad correcta para SKUs de distintas marcas: Ruckus, Stonet, Teltonika y EnGenius.
 * 2. Bloqueo explícito QUALITY_GATE_BLOCKED: BRAND_MIXING si un borrador de marca Ruckus/Stonet/Teltonika menciona EnGenius o viceversa.
 * 3. Lanzamiento de error PRODUCT_NOT_FOUND al solicitar un SKU inexistente en el catálogo.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findCatalogProduct } from "../src/lib/data/ecomshop-catalog";
import { MarketingPipelineEngine } from "../src/server/orchestrator/marketing-pipeline";
import { MockAgentProvider } from "../src/server/orchestrator/agent-provider";

describe("Sprint P1-B — Product Identity & Brand Contamination Gate", () => {
  it("1. Resuelve correctamente la identidad de SKUs de múltiples marcas (Ruckus, Stonet, Teltonika, EnGenius)", () => {
    const testCases = [
      { sku: "R550", expectedBrand: "Ruckus" },
      { sku: "ST3116G", expectedBrand: "Stonet" },
      { sku: "RUTX11", expectedBrand: "Teltonika" },
      { sku: "ECW536", expectedBrand: "EnGenius" }
    ];

    for (const tc of testCases) {
      const product = findCatalogProduct(tc.sku);
      assert.ok(product, `El SKU ${tc.sku} debe existir en el catálogo canónico`);
      assert.equal(product.brand, tc.expectedBrand, `La marca de ${tc.sku} debe ser ${tc.expectedBrand}`);
    }
  });

  it("2. Lanza error PRODUCT_NOT_FOUND ante un SKU inexistente sin usar fallbacks sustitutos", () => {
    const unknownSku = "SKU-INEXISTENTE-999";
    const product = findCatalogProduct(unknownSku);
    assert.equal(product, undefined);

    const engine = new MarketingPipelineEngine(new MockAgentProvider());
    assert.throws(
      () => engine.resolveProductAndEvidence(unknownSku),
      (err: any) => err.message.includes("PRODUCT_NOT_IN_CANONICAL_CATALOG") || err.message.includes("PRODUCT_NOT_FOUND")
    );
  });

  it("3. Quality Gate bloquea con QUALITY_GATE_BLOCKED: BRAND_MIXING si un producto Ruckus contiene menciones a EnGenius", () => {
    const engine = new MarketingPipelineEngine(new MockAgentProvider());
    const product = findCatalogProduct("R550")!;
    assert.ok(product);

    // Salida simulada con contaminación de marca (menciona EnGenius en un producto Ruckus)
    const contaminatedOutput = {
      positioning: "Punto de acceso Wi-Fi 6 Ruckus R550 para alta densidad",
      targetAudience: "Integradores de Hoteles y Educación",
      seo: {
        title: "Ruckus R550 AP Wi-Fi 6",
        metaDescription: "Punto de acceso profesional EnGenius Cloud para proyectos corporativos",
        slug: "ruckus-r550-wifi6",
        primaryKeyword: "Ruckus R550"
      },
      productDescription: "Excelente rendimiento gestionado mediante EnGenius Cloud y Ruckus SmartZone."
    };

    const report = engine.evaluateQualityGate(product, [], contaminatedOutput);
    const brandCheck = report.checks.find(c => c.name === "BRAND_CHECK");

    assert.ok(brandCheck, "BRAND_CHECK debe ejecutarse en el Quality Gate");
    assert.equal(brandCheck.status, "BLOCKED", "Debe resultar BLOCKED ante contaminación de marca");
    assert.ok(brandCheck.details.includes("BRAND_MIXING"), "El detalle debe indicar QUALITY_GATE_BLOCKED: BRAND_MIXING");
  });

  it("4. Quality Gate aprueba BRAND_CHECK cuando el borrador pertenece limpiamente a la marca del producto", () => {
    const engine = new MarketingPipelineEngine(new MockAgentProvider());
    const product = findCatalogProduct("ST3116G")!;
    assert.ok(product);

    const cleanOutput = {
      positioning: "Switch de conmutación no gestionable Stonet ST3116G de 16 puertos Gigabit",
      targetAudience: "Pymes e Instaladores CCTV",
      seo: {
        title: "Stonet ST3116G Switch 16 Puertos Gigabit",
        metaDescription: "Conmutador metálico Stonet de alta durabilidad para armarios rack B2B",
        slug: "stonet-st3116g-switch",
        primaryKeyword: "Stonet ST3116G"
      },
      productDescription: "Switch Stonet plug and play con disipación pasiva silenciosa."
    };

    const report = engine.evaluateQualityGate(product, [], cleanOutput);
    const brandCheck = report.checks.find(c => c.name === "BRAND_CHECK");

    assert.ok(brandCheck);
    assert.equal(brandCheck.status, "PASS");
  });
});
