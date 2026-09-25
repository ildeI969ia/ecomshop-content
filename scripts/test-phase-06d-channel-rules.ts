import assert from "node:assert";
import { validateChannelRules } from "@/lib/quality/channel-rules";
import { ContentOutput } from "@/lib/schema";

async function runTest() {
  console.log("▶ Fase 6d — Pruebas de Reglas por Canal (Validación Automática)");

  // 1. Mock de contenido válido cumpliendo las reglas por canal
  const mockValidContent: ContentOutput = {
    topicId: "test-rules",
    topicTitle: "Switch PoE Multi-Gigabit ECS2512FP", // <= 60 car.
    category: "switches",
    generatedAt: new Date().toISOString(),
    source: "ai",
    status: "DRAFT",
    blog: {
      title: "Switch PoE Multi-Gigabit ECS2512FP",
      metaDescription: "Análisis de ingeniería sobre el switch EnGenius ECS2512FP con enlaces de 10 Gbps, presupuesto PoE de 410W y gestión Cloud en EcomShop.", // 140-160 car.
      slug: "switch-poe-ecs2512fp",
      readingTimeMinutes: 5,
      targetKeywords: ["Switch"],
      htmlContent: `
        <article>
          <p>${"Palabra ".repeat(800)}</p>
          <h2>1. Desafíos Técnicos</h2>
          <p>Análisis de enlaces troncales Multi-Gigabit.</p>
          <h3>1.1 Enlaces 10G SFP+</h3>
          <p>Presupuesto PoE.</p>
          <div class="faq-block">
            <h3>¿Cómo dimensionar el switch?</h3>
            <p>Respuesta técnica.</p>
            <h3>¿Incluye licencias?</h3>
            <p>Sin licencias.</p>
            <h3>¿Garantía?</h3>
            <p>24h.</p>
          </div>
          <!-- FAQPage -->
          <a href="https://www.ecomshop.es/ecs2512fp">Ficha Técnica</a>
          <a href="https://www.ecomshop.es/ecw536">Punto de Acceso</a>
          <img src="foto.jpg" alt="Switch en rack" />
        </article>
      `,
      cleanPlainTextExcerpt: "Extracto limpio."
    },
    whatsapp: {
      headline: "Novedad WhatsApp",
      formattedMessage: "PITCH B2B para instaladores con *negritas* y viñetas.",
      callToAction: "Ver Ficha",
      targetUrl: "https://www.ecomshop.es/ecs2512fp?utm_source=whatsapp"
    },
    linkedin: {
      hook: "¿Por qué conectar un AP Wi-Fi 7 a un switch 1 GbE es un error de ingeniería?", // <= 210 car.
      body: "Desarrollo técnico en 3 párrafos explicando el cuello de botella...",
      takeaways: ["Punto 1", "Punto 2", "Punto 3"],
      callToAction: "Debate en comentarios",
      hashtags: ["#Networking", "#WiFi7", "#Switches", "#EnGenius"],
      fullPostText: "¿Por qué conectar un AP Wi-Fi 7 a un switch 1 GbE es un error?\n\nDesarrollo técnico sin URLs en el cuerpo.\n\n#Networking #WiFi7 #Switches #EnGenius"
    },
    mailchimp: {
      subjectA: "Switch PoE ECS2512FP en Stock", // <= 50 car.
      subjectB: "Guía B2B",
      previewText: "Descubre cómo evitar cuellos de botella con conmutación Multi-Gigabit 10G SFP+.", // <= 90 car.
      ctaButtonText: "Ver Tarifa B2B",
      ctaUrl: "https://www.ecomshop.es/ecs2512fp",
      newsletterHtml: "<a class='btn' href='https://www.ecomshop.es'>Ver Tarifa B2B</a>",
      plainText: "Texto plano"
    }
  };

  // Ejecución de validación de reglas en contenido válido
  const reportValid = validateChannelRules(mockValidContent);
  console.log(`  ✔ Informe de reglas en contenido optimizado (Score: ${reportValid.score}%)`);
  assert.ok(reportValid.score >= 80, "El score de cumplimiento debe ser elevado (≥ 80%)");
  assert.strictEqual(reportValid.rules.find((r) => r.id === "blog-title-length")?.passed, true, "Título <= 60 debe pasar");
  assert.strictEqual(reportValid.rules.find((r) => r.id === "wa-length")?.passed, true, "WhatsApp <= 600 debe pasar");

  // 2. Mock de contenido con violaciones de reglas
  const mockInvalidContent: ContentOutput = {
    ...mockValidContent,
    blog: {
      ...mockValidContent.blog,
      title: "Este es un título excesivamente largo para el blog que supera los sesenta caracteres permitidos sin ninguna duda", // > 60 car.
      htmlContent: "<p>Sin H2 ni H3 ni enlaces ni alt</p>"
    },
    whatsapp: {
      headline: "WhatsApp",
      formattedMessage: "Mensaje ".repeat(200), // > 600 car.
      callToAction: "CTA",
      targetUrl: "https://ecomshop.es"
    },
    mailchimp: {
      ...mockValidContent.mailchimp,
      subjectA: "Este es un asunto de email extremadamente largo que supera de lejos los 50 caracteres máximos permitidos para Mailchimp B2B"
    }
  };

  const reportInvalid = validateChannelRules(mockInvalidContent);
  console.log(`  ✔ Informe de reglas en contenido con infracciones (Failed Channels: ${reportInvalid.failedChannels.join(", ")})`);
  assert.strictEqual(reportInvalid.passed, false, "Contenido con infracciones debe resultar en passed = false");
  assert.ok(reportInvalid.failedChannels.includes("blog"), "Debe detectar fallos en el canal blog");
  assert.ok(reportInvalid.failedChannels.includes("whatsapp"), "Debe detectar fallos en el canal whatsapp");
  assert.ok(reportInvalid.failedChannels.includes("mailchimp"), "Debe detectar fallos en el canal mailchimp");

  console.log("✔ Fase 6d — Pruebas de reglas por canal completadas con éxito.");
}

runTest().catch((err) => {
  console.error("❌ Error en prueba 6d:", err);
  process.exit(1);
});
