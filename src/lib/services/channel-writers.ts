import { ContentOutput } from "@/lib/schema";
import { ChannelWriterInput } from "@/lib/types/channel-strategy";
import { generateDynamicComparativeTableHtml } from "@/lib/services/grounded-writer-comparative";

/**
 * Normalizadores y sanitizadores de canal (Mandato 4).
 * Su responsabilidad es validar, estructurar y sanitizar la salida del AI Writer.
 * NO escriben párrafos de marketing ni fabrican claims comerciales no demostrados.
 */

export function normalizeBlogChannel(
  rawBlog: Partial<ContentOutput["blog"]> | undefined,
  input: ChannelWriterInput
): ContentOutput["blog"] {
  const { context, decision, strategies } = input;
  const intel = context.intel;
  const productName = `${intel.brand} ${intel.model}`;
  const sku = context.canonicalSku;
  const thesis = decision.thesis;
  const title = rawBlog?.title?.trim() || `${productName}: Criterios técnicos para una decisión B2B`;
  const slug = rawBlog?.slug?.trim() || `${sku.toLowerCase()}-criterios-b2b`;

  if (rawBlog?.htmlContent && rawBlog.htmlContent.length >= 600) {
    return {
      title,
      metaDescription: rawBlog.metaDescription || `Análisis técnico consultivo de ${productName} para ${decision.primaryAudience}.`,
      slug,
      readingTimeMinutes: rawBlog.readingTimeMinutes || Math.max(4, Math.ceil(rawBlog.htmlContent.split(/\s+/).length / 200)),
      targetKeywords: rawBlog.targetKeywords || [sku, intel.model, context.effectiveCategory],
      htmlContent: rawBlog.htmlContent,
      cleanPlainTextExcerpt: rawBlog.cleanPlainTextExcerpt || thesis.centralArgument
    };
  }

  // Generación fallback honesta: estructurada con rigor técnico SIN fabricar claims ni copiar el brief interno
  const comparativeTable = generateDynamicComparativeTableHtml(context.intel);
  const factsList = strategies.BLOG.productEvidence.map((f) => `<li>${f}</li>`).join("");

  const htmlContent = `
<article class="ecomshop-b2b-post">
  <p class="lead">${thesis.problem} En una instalación de conectividad B2B, una especificación nominal solo aporta valor cuando se contrasta con las demandas operativas y la topología de la red.</p>

  <h2>La decisión técnica en el despliegue</h2>
  <p>${thesis.centralArgument} Antes de fijar una referencia de catálogo, conviene determinar los requisitos reales de conmutación, ancho de banda, presupuesto PoE y latencia admisible.</p>

  <div class="audience-impact-block">
    <h3>Criterios de evaluación para ${decision.primaryAudience}</h3>
    <p>Para esta audiencia, el factor determinante es asegurar estabilidad operativa, interoperabilidad de interfaces y mantenimiento predecible sin sorpresas en campo.</p>
  </div>

  <h2>Criterios de análisis y arquitectura</h2>
  <p>${thesis.businessContext} El orden de decisión debe ser riguroso: primero se definen las restricciones de la infraestructura física y posteriormente se evalúa si las prestaciones documentadas cubren el escenario previsto.</p>
  <ul>
    ${factsList}
  </ul>

  <div class="comparative-table-container">
    ${comparativeTable}
  </div>

  <h2>Dimensionamiento y consideraciones operativas</h2>
  <p>Al proyectar el despliegue deben revisarse factores físicos y lógicos: longitudes de tirada, interfaces compatibles, absorción de tráfico troncal y disipación térmica en el entorno de instalación.</p>

  <h2>Aplicación técnica de ${productName}</h2>
  <p>La referencia ${sku} de ${intel.brand} debe valorarse a partir de sus especificaciones técnicas contrastadas en laboratorio. Su rol en la instalación responde a la necesidad de resolver conectividad fiable y predecible.</p>

  <h2>Comprobaciones previas y límites del escenario</h2>
  <p>${thesis.solutionApproach} No debe asumirse ninguna prestación que no figure expresamente documentada en la ficha técnica oficial. Es necesario validar la compatibilidad cruzada de transceptores y cables antes de cerrar la instalación.</p>

  <h2>Decisión técnica recomendada</h2>
  <p>${thesis.centralArgument} La selección final debe fundamentarse en datos contrastables y compatibilidad verificada con los requisitos de la red.</p>
</article>`.trim();

  return {
    title,
    metaDescription: `Análisis técnico consultivo de ${productName} para ${decision.primaryAudience}.`,
    slug,
    readingTimeMinutes: 5,
    targetKeywords: [sku, intel.model, context.effectiveCategory],
    htmlContent,
    cleanPlainTextExcerpt: thesis.centralArgument
  };
}

export function normalizeLinkedInChannel(
  rawLinkedin: Partial<ContentOutput["linkedin"]> | undefined,
  input: ChannelWriterInput
): ContentOutput["linkedin"] {
  const { context, strategies } = input;
  const strat = strategies.LINKEDIN;
  const sku = context.canonicalSku;
  const model = context.intel.model;

  if (rawLinkedin?.fullPostText && rawLinkedin.fullPostText.length >= 80) {
    return {
      hook: rawLinkedin.hook || `¿Cómo evitar cuellos de botella en ${context.effectiveCategory}?`,
      body: rawLinkedin.body || strat.primaryArgument,
      takeaways: rawLinkedin.takeaways || strat.productEvidence,
      callToAction: rawLinkedin.callToAction || strat.ctaObjective,
      hashtags: rawLinkedin.hashtags || ["#NetworkingB2B", "#Ingenieria", `#${sku}`],
      fullPostText: rawLinkedin.fullPostText
    };
  }

  const hook = `¿Seguimos dimensionando ${context.effectiveCategory} por especificación nominal en lugar de por arquitectura real?`;
  const body = `${strat.primaryArgument}\n\nEn despliegues reales, dimensionar sin contrastar la carga operativa genera cuellos de botella no previstos. Analizando referencias como ${context.intel.brand} ${model} (${sku}), la clave no es acumular funciones en papel, sino validar la estabilidad bajo demanda real.`;
  const callToAction = strat.ctaObjective;
  const hashtags = ["#NetworkingB2B", "#Telecomunicaciones", `#${sku}`, "#EcomShop"];
  const fullPostText = `${hook}\n\n${body}\n\n${strat.productEvidence.map((e) => `• ${e}`).join("\n")}\n\n${callToAction}\n\n${hashtags.join(" ")}`;

  return {
    hook,
    body,
    takeaways: strat.productEvidence,
    callToAction,
    hashtags,
    fullPostText
  };
}

export function normalizeWhatsAppChannel(
  rawWhatsapp: Partial<ContentOutput["whatsapp"]> | undefined,
  input: ChannelWriterInput
): ContentOutput["whatsapp"] {
  const { context, strategies } = input;
  const strat = strategies.WHATSAPP;
  const sku = context.canonicalSku;
  const model = context.intel.model;
  const url = context.productUrl || "https://ecomshop.es";

  if (rawWhatsapp?.formattedMessage && rawWhatsapp.formattedMessage.length >= 30) {
    return {
      headline: rawWhatsapp.headline || `${context.intel.brand} ${sku}`,
      formattedMessage: rawWhatsapp.formattedMessage,
      callToAction: rawWhatsapp.callToAction || strat.ctaObjective,
      targetUrl: rawWhatsapp.targetUrl || url
    };
  }

  const headline = `*Criterio técnico: ${context.intel.brand} ${model} (${sku})*`;
  const formattedMessage = `${headline}\n\n${strat.primaryArgument}\n\n✓ ${strat.supportingArguments[0]}\n✓ Ficha oficial y especificaciones verificadas.\n\n🔗 ${strat.ctaObjective}: ${url}`;

  return {
    headline: `${context.intel.brand} ${sku}`,
    formattedMessage,
    callToAction: strat.ctaObjective,
    targetUrl: url
  };
}

export function normalizeMailchimpChannel(
  rawMailchimp: Partial<ContentOutput["mailchimp"]> | undefined,
  input: ChannelWriterInput
): ContentOutput["mailchimp"] {
  const { context, decision, strategies } = input;
  const strat = strategies.MAILCHIMP;
  const sku = context.canonicalSku;
  const model = context.intel.model;
  const url = context.productUrl || "https://ecomshop.es";

  if (rawMailchimp?.newsletterHtml && rawMailchimp.newsletterHtml.length >= 100) {
    return {
      subjectA: rawMailchimp.subjectA || `${model} (${sku}): Datos para defender tu proyecto`,
      subjectB: rawMailchimp.subjectB || `Criterio técnico de aprovisionamiento: ${sku}`,
      previewText: rawMailchimp.previewText || `Evaluación técnica de ${sku}.`,
      ctaButtonText: rawMailchimp.ctaButtonText || "Consultar documentación técnica",
      ctaUrl: rawMailchimp.ctaUrl || url,
      newsletterHtml: rawMailchimp.newsletterHtml,
      plainText: rawMailchimp.plainText || rawMailchimp.newsletterHtml.replace(/<[^>]+>/g, " ").trim()
    };
  }

  const subjectA = `${model} (${sku}): argumentos técnicos para justificar tu instalación`;
  const subjectB = `Criterio de ingeniería: evaluación de ${sku} para tus proyectos`;
  const previewText = `Cómo evitar sobrecostes y dimensionar con solvencia técnica.`;

  const newsletterHtml = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
  <h2 style="color: #0f172a;">${decision.thesis.problem}</h2>
  <p>${strat.primaryArgument}</p>
  <p>${strat.supportingArguments[0]}</p>
  <ul style="padding-left: 20px;">
    ${strat.productEvidence.map((fact) => `<li>${fact}</li>`).join("")}
  </ul>
  <p style="margin-top: 24px;">
    <a href="${url}" style="background-color: #0284c7; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
      ${strat.ctaObjective}
    </a>
  </p>
</div>`.trim();

  const plainText = `${subjectA}\n\n${strat.primaryArgument}\n\n${strat.supportingArguments.join("\n")}\n\n${strat.ctaObjective}: ${url}`;

  return {
    subjectA,
    subjectB,
    previewText,
    ctaButtonText: strat.ctaObjective,
    ctaUrl: url,
    newsletterHtml,
    plainText
  };
}

export function normalizeGeoChannel(
  rawGeo: Partial<ContentOutput["geo"]> | undefined,
  input: ChannelWriterInput
): ContentOutput["geo"] {
  const { context, decision, strategies } = input;
  const strat = strategies.GEO;
  const sku = context.canonicalSku;
  const model = context.intel.model;
  const brand = context.intel.brand;
  const url = context.productUrl || "https://ecomshop.es";
  const comparativeTable = generateDynamicComparativeTableHtml(context.intel);

  const title = rawGeo?.title?.trim() || `${brand} ${model} (${sku}) — Respuestas técnicas de ingeniería`;
  const metaDescription = rawGeo?.metaDescription?.trim() || `Respuestas técnicas verificables y especificaciones oficiales para ${brand} ${model} (${sku}).`;

  const jsonLd = rawGeo?.jsonLd || JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${brand} ${model}`,
      sku,
      model,
      brand: { "@type": "Brand", name: brand },
      category: context.effectiveCategory,
      url,
      description: context.canonicalProduct.description
    },
    null,
    2
  );

  const htmlContent = rawGeo?.htmlContent && rawGeo.htmlContent.length >= 200
    ? rawGeo.htmlContent
    : `
<div class="geo-knowledge-article">
  <h2>¿Qué es ${brand} ${model} y para qué escenarios está diseñado?</h2>
  <p>${strat.primaryArgument}</p>

  <h2>Especificaciones clave verificadas</h2>
  ${comparativeTable}

  <h2>Pregunta técnica frecuente: ${decision.thesis.technicalQuestion}</h2>
  <p>${decision.thesis.solutionApproach}</p>
</div>`.trim();

  return {
    title,
    metaDescription,
    htmlContent,
    comparativeTableHtml: comparativeTable,
    jsonLd,
    markdownContent: `# ${title}\n\n${strat.primaryArgument}\n\n${comparativeTable}`
  };
}

// Aliases para compatibilidad con código existente
export const generateBlogChannel = normalizeBlogChannel;
export const generateLinkedInChannel = normalizeLinkedInChannel;
export const generateWhatsAppChannel = normalizeWhatsAppChannel;
export const generateMailchimpChannel = normalizeMailchimpChannel;
export const generateGeoChannel = normalizeGeoChannel;
