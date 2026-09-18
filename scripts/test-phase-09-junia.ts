import { generateArticleOutline } from "../src/lib/services/outline-generator";
import { injectInternalLinks, resolveEcomProductUrl } from "../src/lib/services/internal-linking-engine";
import { writeFullArticleFromOutline } from "../src/lib/services/deep-section-writer";
import { deriveOmnichannelAssets } from "../src/lib/services/omnichannel-deriver";
import { ArticleOutlineSchema } from "../src/lib/types/article-outline";

async function runPhase09JuniaTest() {
  console.log("=== TEST DE FASE 09: THE JUNIA ENGINE ===");

  // 1. Test de Generador de Outline
  console.log("\n1. Testeando generateArticleOutline() con NotebookLM y Search Grounding...");
  const topic = "Puntos de Acceso Wi-Fi 7 y Conmutación Multi-Gigabit en Oficinas";
  const outline = await generateArticleOutline(
    topic,
    "Instaladores de Telecomunicaciones e Integradores B2B",
    "EMPRESAS_OFICINAS"
  );

  console.log(`Título generado: "${outline.title}"`);
  console.log(`Slug: "${outline.slug}"`);
  console.log(`Meta Descripción: "${outline.metaDescription}"`);
  console.log(`Total secciones en outline: ${outline.sections.length}`);

  // Validar esquema Zod
  const validation = ArticleOutlineSchema.safeParse(outline);
  if (!validation.success) {
    console.error("❌ Falló validación Zod del Outline:", validation.error);
    process.exit(1);
  }
  console.log("✓ Validación Zod de ArticleOutline superada.");

  // Comprobar diversidad de tipos de contenido
  const contentTypes = new Set(outline.sections.map((s) => s.contentType));
  console.log("Tipos de contenido generados:", Array.from(contentTypes));

  const hasTable = contentTypes.has("COMPARISON_TABLE");
  const hasCallout = contentTypes.has("INSTALLER_CALLOUT");
  const hasTopology = contentTypes.has("TOPOLOGY_DIAGRAM");
  const hasFaq = contentTypes.has("FAQ");

  console.log(`- Contiene Tabla Comparativa: ${hasTable ? "SÍ" : "NO"}`);
  console.log(`- Contiene Tip del Instalador (Callout): ${hasCallout ? "SÍ" : "NO"}`);
  console.log(`- Contiene Diagrama de Topología: ${hasTopology ? "SÍ" : "NO"}`);
  console.log(`- Contiene FAQ de Obra: ${hasFaq ? "SÍ" : "NO"}`);

  // 2. Test del Motor de Enlazado Interno
  console.log("\n2. Testeando Motor de Enlazado Interno (ecomshop.es)...");
  const sampleHtml = `
    <p>Para esta instalación recomendamos el punto de acceso ECW536 y el modelo compacto ECW526.</p>
    <p>La alimentación se gestionará con un switch PoE++ 802.3bt mediante transceptores 10G SFP+ en el rack.</p>
    <p>Cualquier avería cuenta con sustitución en 24h y soporte preventa de ingeniería de EcomSpain.</p>
  `;

  const linkingResult = injectInternalLinks(sampleHtml);
  console.log(`Enlaces inyectados: ${linkingResult.linksCount}`);
  console.log("Keywords enlazadas:", linkingResult.injectedKeywords);
  console.log("HTML enriquecido con links:", linkingResult.enrichedHtml);

  if (linkingResult.linksCount < 2) {
    console.error("❌ Falló el motor de enlazado interno: menos de 2 enlaces inyectados.");
    process.exit(1);
  }
  console.log("✓ Motor de Enlazado Interno superado.");

  // 3. Test de Deep Section Writer (Sección por Sección)
  console.log("\n3. Testeando Deep Section Writer con memoria acumulada...");
  const fullArticle = await writeFullArticleFromOutline(outline, (curr, total, sec) => {
    console.log(`  -> Sección ${curr}/${total} completada: [${sec.level}] ${sec.title} (${sec.wordCount} palabras)`);
  });

  console.log(`\nArtículo completo redactado:`);
  console.log(`Total palabras: ${fullArticle.totalWords}`);
  console.log(`Enlaces internos canónicos inyectados: ${fullArticle.internalLinksCount}`);

  if (fullArticle.totalWords < 500) {
    console.error("❌ El artículo no alcanzó la longitud esperada de ingeniería.");
    process.exit(1);
  }
  console.log("✓ Deep Section Writer superado.");

  // 4. Test de Derivación Omnicanal Automática
  console.log("\n4. Testeando Derivación Omnicanal Automática...");
  const omnichannel = await deriveOmnichannelAssets(fullArticle, "test-junia-01", "wifi");
  console.log("Newsletter Subject A:", omnichannel.mailchimp.subjectA);
  console.log("LinkedIn Hook:", omnichannel.linkedin.hook);
  console.log("WhatsApp Headline:", omnichannel.whatsapp.headline);
  console.log("Takeaways LinkedIn:", omnichannel.linkedin.takeaways);

  console.log("\n=======================================================");
  console.log("🎉 TEST DE FASE 09 — THE JUNIA ENGINE COMPLETADO CON ÉXITO");
  console.log("=======================================================");
}

runPhase09JuniaTest().catch((err) => {
  console.error("Error en test de Fase 09:", err);
  process.exit(1);
});
