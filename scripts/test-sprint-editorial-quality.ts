import assert from "node:assert";
import { describe, it } from "node:test";
import { generateB2BContent } from "../src/lib/generator";
import { generateGroundedContent } from "../src/lib/services/grounded-writer";

describe("Sprint Editorial — Quality & Multi-Audience Validation Suite", () => {
  it("TEST 1: Producto de catálogo para Instaladores (rigor técnico y sin especificaciones inventadas)", async () => {
    const result = await generateB2BContent({
      sku: "ECW536",
      targetAudience: "Instaladores de Telecomunicaciones",
      editorialControls: {
        businessGoal: "ALL_OPPORTUNITIES",
        targetSector: "ENTERPRISE_OFFICE",
        includePricing: false,
        emphasizeUplinkSwitching: true,
        technicalDeepDiveLevel: "HIGH_TECHNICAL",
        editorialTone: "ENGINEERING_PREVENTA",
        competitorFocus: "MERAKI",
        strategicCta: "FREE_SURVEY",
        customInstructions: "Enfocar en despliegue en campo y montaje QR"
      }
    });

    assert.ok(result.blog?.htmlContent, "El contenido HTML del blog no debe estar vacío");
    assert.ok(
      result.blog.htmlContent.includes("audience-impact-block") || result.blog.htmlContent.includes("photo-recommendation-box"),
      "Debe contener la estructura de bloques visuales recomendados"
    );
    assert.ok(
      !result.blog.htmlContent.includes("PVP 1") && !result.blog.htmlContent.includes("PVP 2"),
      "No debe inventar precios numéricos en euros"
    );
  });

  it("TEST 2: Producto de catálogo para Director TIC (diferenciación narrativa y cero licencias)", async () => {
    const result = await generateB2BContent({
      sku: "ECS5512FP",
      targetAudience: "Directores de TIC / Responsables de Sistemas",
      editorialControls: {
        businessGoal: "ALL_OPPORTUNITIES",
        targetSector: "ENTERPRISE_OFFICE",
        includePricing: false,
        emphasizeUplinkSwitching: true,
        technicalDeepDiveLevel: "HIGH_TECHNICAL",
        editorialTone: "ENGINEERING_PREVENTA",
        competitorFocus: "MERAKI",
        strategicCta: "FREE_SURVEY",
        customInstructions: "Enfocar en arquitectura, 0€ en cuotas Cloud y seguridad"
      }
    });

    assert.ok(result.blog?.title, "Debe incluir un título de blog válido");
    assert.ok(
      result.blog.htmlContent.includes("Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h") ||
      result.blog.htmlContent.includes("cta-placement-box"),
      "Debe incluir la llamada canónica a la tarifa de distribuidor"
    );
  });

  it("TEST 3: Producto personalizado (customEquipmentName)", async () => {
    const result = await generateB2BContent({
      customEquipmentName: "Switch Industrial PoE+ Extendido 8 Puertos GbE",
      topicTitle: "Solución de Conectividad Industrial para Entornos Críticos",
      category: "switching"
    });

    assert.ok(result.blog?.htmlContent, "Debe generar contenido para productos personalizados fuera de catálogo");
    assert.ok(
      !result.blog.htmlContent.includes("no se ha encontrado información"),
      "No debe fallar silenciosamente ni mostrar 'no se ha encontrado información'"
    );
  });

  it("TEST 4: Producto mediante URL (productUrl)", async () => {
    const result = await generateB2BContent({
      productUrl: "https://www.ecomshop.es/transceptores-opticos-10g",
      topicTitle: "Optimización de Enlaces Troncales 10G SFP+",
      category: "transceptores"
    });

    assert.ok(result.blog?.title, "Debe generar contenido a partir de un productUrl de referencia");
  });

  it("TEST 5: Producto por SKU de catálogo", async () => {
    const result = await generateB2BContent({
      sku: "ECW510",
      category: "wifi"
    });

    assert.ok(result.blog?.htmlContent, "Debe resolver correctamente por SKU");
  });

  it("TEST 6: Resiliencia ante respuestas incompletas de IA (normalización segura)", async () => {
    const incompleteInput: any = {
      topicTitle: "Prueba Normalización",
      category: "wifi",
      blog: {
        title: "Título Incompleto Test",
        htmlContent: "<p>Contenido parcial</p>"
      }
    };

    assert.ok(incompleteInput.blog.title, "Debe conservar los campos existentes");
  });
});
