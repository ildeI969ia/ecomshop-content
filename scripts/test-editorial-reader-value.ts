import assert from "node:assert/strict";
import { validateEditorialQuality } from "../src/lib/quality/editorial-quality-gate";
import type { ContentOutput } from "../src/lib/schema";

function base(htmlContent: string): ContentOutput {
  return {
    topicId: "test-reader-value",
    topicTitle: "Cómo dimensionar un switch para una instalación B2B",
    category: "switches",
    generatedAt: new Date().toISOString(),
    editorialThesis: {
      problem: "El número de puertos no debe decidirse únicamente por el número de equipos actuales.",
      targetProfessional: "Ingeniero de infraestructura",
      businessContext: "Una instalación B2B debe contemplar capacidad, crecimiento y mantenimiento.",
      technicalQuestion: "¿Cómo dimensionar correctamente un switch compacto?",
      whyItMatters: "Una mala estimación puede obligar a rehacer la instalación.",
      centralArgument: "La decisión debe partir de la carga y del crecimiento previsto.",
      solutionApproach: "Relacionar interfaces y capacidad con el escenario real.",
      productRole: "El producto se evalúa como una opción concreta dentro de esa decisión."
    },
    outline: [
      { section: "La decisión", purpose: "Plantear el problema", argument: "Qué capacidad hace falta." },
      { section: "Análisis", purpose: "Explicar los criterios", argument: "Capacidad y crecimiento." },
      { section: "Aplicación", purpose: "Aplicar los criterios", argument: "Encaje del producto." },
      { section: "Validación", purpose: "Comprobar requisitos", argument: "Qué revisar antes del despliegue." },
      { section: "Decisión profesional", purpose: "Cerrar", argument: "Cuándo encaja." }
    ],
    blog: {
      title: "Cómo dimensionar un switch para una instalación B2B",
      metaDescription: "Criterios técnicos para dimensionar un switch.",
      slug: "test-switch",
      readingTimeMinutes: 7,
      targetKeywords: ["switch", "dimensionamiento"],
      htmlContent,
      cleanPlainTextExcerpt: "Criterios de dimensionamiento."
    },
    mailchimp: { subjectA: "Test", subjectB: "Test", previewText: "Test", ctaButtonText: "Consultar", ctaUrl: "https://ecomshop.es", newsletterHtml: "<p>Test</p>", plainText: "Test" },
    whatsapp: { headline: "Test", formattedMessage: "Test", callToAction: "Consultar", targetUrl: "https://ecomshop.es" },
    linkedin: { hook: "Test", body: "Test", takeaways: ["Test"], callToAction: "Consultar", hashtags: ["#test"], fullPostText: "Test" },
    editorialDecision: {
      selectedAngle: {
        title: "Dimensionar sin sobredimensionar",
        editorialQuestion: "¿Cómo dimensionar correctamente un switch compacto?",
        tension: "capacidad actual frente a crecimiento",
        readerPromise: "El lector podrá convertir las especificaciones en criterios de decisión.",
        targetAudience: "Ingeniero de infraestructura"
      },
      diversityReport: { collisionDetected: false },
      productTruthLock: { sku: "ST3105G", model: "ST3105G", brand: "STONET" }
    }
  } as ContentOutput;
}

const usefulArticle = `
<article>
<p>Una instalación puede funcionar hoy y quedar limitada en pocos meses si el dimensionamiento se hace contando únicamente los equipos actuales. La pregunta relevante no es cuántos dispositivos existen ahora, sino qué capacidad necesita la arquitectura y qué crecimiento debe absorber.</p>
<h2>¿Cómo dimensionar correctamente un switch compacto?</h2>
<p>Primero hay que identificar interfaces, tráfico esperado, alimentación y crecimiento. La capacidad nominal debe interpretarse dentro del escenario.</p>
<h2>Qué criterios cambian la decisión</h2>
<p>Conviene revisar puertos disponibles, uplinks, capacidad de switching y organización del cableado. Cada dato tiene una consecuencia operativa.</p>
<h2>Cómo encaja el producto</h2>
<p>El ST3105G debe evaluarse con los datos verificados de su ficha EcomShop y frente a los requisitos concretos del proyecto.</p>
<h2>Qué comprobar antes del despliegue</h2>
<p>Hay que validar compatibilidad, alimentación, crecimiento y cualquier requisito que no esté especificado en el feed.</p>
<h2>Cuándo encaja y cuándo replantear la arquitectura</h2>
<p>Encaja cuando las capacidades documentadas cubren el escenario. Si falta un requisito esencial, debe verificarse antes de comprar.</p>
<h2>Decisión profesional</h2>
<p>La decisión debe partir de las necesidades reales y no de una lista de características.</p>
</article>`;

const report = validateEditorialQuality(base(usefulArticle), "Ingeniero de infraestructura", "ST3105G");
assert.equal(report.passed, true, report.acceptanceMessage);

const ficha = `
<article><h2>Características del producto</h2>
<p>ST3105G tiene cinco puertos. ST3105G tiene capacidad Gigabit. ST3105G es compacto.</p>
<p>ST3105G tiene cinco puertos y ST3105G tiene cinco puertos.</p></article>`;
const bad = validateEditorialQuality(base(ficha), "Ingeniero de infraestructura", "ST3105G");
assert.equal(bad.passed, false);
assert.ok(bad.valueCheck.issues.length > 0);

console.log("EDITORIAL READER VALUE: PASS");
