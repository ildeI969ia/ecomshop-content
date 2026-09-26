import assert from "node:assert";
import { describe, it } from "node:test";
import { GenerateRequestSchema } from "../src/lib/schema";
import { generateB2BContent } from "../src/lib/generator";

describe("Free Topic Generation Test — Tema o Tesis Editorial Libre", () => {
  it("Valida la solicitud con Tema Libre y competidor Aruba (evita error 'Datos de entrada inválidos')", () => {
    const freeTopicPayload = {
      topicTitle: "Migración a WiFi7 para Pymes y Corporativo con EnGenius Cloud",
      category: "Wi-Fi & Redes Inalámbricas",
      targetAudience: "Instaladores de telecomunicaciones, integradores IT y responsables de sistemas",
      productUrl: "https://ecomshop.es",
      customNotes: "",
      promotedProductIds: ["ecw536"],
      customEquipmentName: "ECW536",
      customEquipmentUrl: "https://ecomshop.es",
      ctaObjective: "Solicitar Presupuesto y Asesoramiento",
      ctaButtonText: "Consultar Condiciones B2B",
      ctaUrl: "https://ecomshop.es",
      syncWhatsApp: true,
      syncLinkedIn: true,
      customAngle: "ROI",
      editorialControls: {
        targetSector: "ENTERPRISE_OFFICE",
        editorialTone: "ENGINEERING_PREVENTA",
        competitorFocus: "ARUBA",
        emphasizeUplinkSwitching: false,
        includePricing: false
      },
      businessGoal: "ALL_OPPORTUNITIES"
    };

    const parsed = GenerateRequestSchema.safeParse(freeTopicPayload);
    assert.ok(parsed.success, `La validación de Zod debería ser exitosa. Errores: ${JSON.stringify(parsed.error?.format())}`);
  });

  it("Ejecuta la generación de contenido B2B con Tema Libre y competidor Aruba", async () => {
    const result = await generateB2BContent({
      topicTitle: "Migración a WiFi7 para Pymes y Corporativo con EnGenius Cloud",
      category: "Wi-Fi & Redes Inalámbricas",
      targetAudience: "Instaladores de telecomunicaciones, integradores IT y responsables de sistemas",
      editorialControls: {
        targetSector: "ENTERPRISE_OFFICE",
        editorialTone: "ENGINEERING_PREVENTA",
        competitorFocus: "ARUBA",
        emphasizeUplinkSwitching: false,
        includePricing: false
      }
    });

    assert.ok(result.blog?.htmlContent || result.geo?.htmlContent, "Debe generar el HTML del blog para tema libre");
    assert.ok(result.blog?.title || result.geo?.title, "Debe generar un título válido para el tema libre");
  });
});
