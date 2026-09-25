import assert from "node:assert";
import { validateContentGrounding } from "@/lib/services/claim-validator";
import { ContentOutput } from "@/lib/schema";

async function runTest() {
  console.log("▶ Fase 6c — Pruebas Unitarias del Validador de Grounding Obligatorio");

  // Mock ContentOutput con cifras
  const validContent: ContentOutput = {
    topicId: "test-grounding",
    topicTitle: "Switch ECS2512FP",
    category: "switches",
    generatedAt: new Date().toISOString(),
    source: "ai",
    status: "DRAFT",
    claims: [
      { text: "Conmutación Multi-Gigabit con troncales de 10 Gbps", sourceId: "src-8" },
      { text: "Presupuesto PoE 802.3bt de 410W", sourceId: "src-8" },
      { text: "Ahorro directo en TCO a 3 años", sourceId: "src-4" }
    ],
    blog: {
      title: "Prueba de Conmutación",
      metaDescription: "Switch de 10 Gbps y 410W para redes corporativas.",
      slug: "prueba-conmutacion",
      readingTimeMinutes: 5,
      targetKeywords: ["Switch"],
      htmlContent: "<p>El switch ofrece interfaces de 10 Gbps y 410W con garantía a 3 años.</p>",
      cleanPlainTextExcerpt: "Switch de 10 Gbps y 410W."
    },
    mailchimp: {
      subjectA: "Asunto",
      subjectB: "Asunto B",
      previewText: "Prev",
      ctaButtonText: "CTA",
      ctaUrl: "https://ecomshop.es",
      newsletterHtml: "<p>10 Gbps</p>",
      plainText: "10 Gbps"
    },
    whatsapp: {
      headline: "Titular",
      formattedMessage: "10 Gbps y 410W",
      callToAction: "CTA",
      targetUrl: "https://ecomshop.es"
    },
    linkedin: {
      hook: "Gancho",
      body: "Desarrollo",
      takeaways: ["10 Gbps"],
      callToAction: "CTA",
      hashtags: ["#WiFi"],
      fullPostText: "10 Gbps y 410W"
    }
  };

  // CASO 1: Cifras con fuentes existentes amparadas -> Debe PASAR (isValid = true)
  const resultValid = validateContentGrounding(validContent);
  assert.strictEqual(resultValid.isValid, true, "Cifras con fuente asociada debe resultar en isValid = true");
  assert.strictEqual(resultValid.ungroundedClaims.length, 0, "No debe haber cifras ungrounded cuando todas tienen fuente");

  console.log("  ✔ Caso 1: Cifras con fuente asociada pasan la validación (isValid = true)");

  // CASO 2: Cifra inventada ("42%" y "999W") sin estar en claims -> Debe BLOQUEAR (isValid = false)
  const invalidContent: ContentOutput = {
    ...validContent,
    blog: {
      ...validContent.blog,
      htmlContent: "<p>El switch ofrece 999W y un 42% de ahorro inventado sin fuente.</p>"
    }
  };

  const resultInvalid = validateContentGrounding(invalidContent);
  assert.strictEqual(resultInvalid.isValid, false, "Cifras inventadas sin fuente debe resultar en isValid = false");
  assert.ok(resultInvalid.ungroundedClaims.length > 0, "Debe detectar al menos una cifra ungrounded ('42%' o '999W')");
  
  const hasFakePercent = resultInvalid.ungroundedClaims.some(u => u.number.includes("42%"));
  const hasFakeWatts = resultInvalid.ungroundedClaims.some(u => u.number.includes("999W"));
  assert.ok(hasFakePercent || hasFakeWatts, "Debe registrar explícitamente la cifra inventada sin fuente");

  console.log("  ✔ Caso 2: Cifra inventada sin fuente bloquea la aprobación (isValid = false)");
  console.log("✔ Fase 6c — Pruebas unitarias del validador completadas con éxito.");
}

runTest().catch((err) => {
  console.error("❌ Error en prueba 6c:", err);
  process.exit(1);
});
