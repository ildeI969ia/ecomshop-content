import { ContentOutput, EditorialThesis, SectionOutlineItem } from "@/lib/schema";
import { ChannelStrategy, MultichannelStrategyMap } from "@/lib/types/channel-strategy";
import type { GenerationContext } from "@/server/services/generation-context";
import type { EditorialDecision } from "@/lib/types/editorial-orchestrator";
import { generateDynamicComparativeTableHtml } from "@/lib/services/grounded-writer-comparative";

export interface ChannelWriterInput {
  context: GenerationContext;
  decision: EditorialDecision;
  strategies: MultichannelStrategyMap;
}

/**
 * Writers de canal independientes para ejecución desacoplada.
 * Principio: MISMA VERDAD, MISMA TESIS, DIFERENTE ARGUMENTACIÓN, DIFERENTE ESTRUCTURA, DIFERENTE CTA.
 * CHANNEL ≠ SUMMARY.
 */

export function generateBlogChannel(
  rawBlog: Partial<ContentOutput["blog"]> | undefined,
  input: ChannelWriterInput
): ContentOutput["blog"] {
  const { context, decision, strategies } = input;
  const strat = strategies.BLOG;
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

  // Generación con estructura profunda y consultiva alineada con el Quality Gate
  const comparativeTable = generateDynamicComparativeTableHtml(context.intel);

  const htmlContent = `
<article class="ecomshop-b2b-post">
  <p class="lead">${thesis.problem} En un proyecto B2B de conectividad y networking, una especificación aislada solo aporta valor cuando ayuda a resolver una decisión técnica concreta y puede contrastarse con las necesidades reales de la instalación.</p>

  <h2>${thesis.technicalQuestion}</h2>
  <p>${decision.selectedAngle.tension}. Por eso, antes de valorar una referencia conviene definir qué necesita realmente el proyecto, qué restricciones existen de ancho de banda, PoE, latencia y qué arquitectura de red debe mantenerse.</p>

  <div class="audience-impact-block">
    <h3>Impacto para ${decision.primaryAudience}</h3>
    <p>${decision.selectedAngle.readerPromise}</p>
  </div>

  <h2>Criterios técnicos que cambian la decisión</h2>
  <p>${thesis.businessContext} El orden importa: primero se define el escenario y después se comprueba si las capacidades documentadas de conmutación, VLAN, uplink y presupuesto PoE responden a ese escenario. Esto evita convertir el catálogo en el punto de partida de una decisión que debería ser técnica.</p>
  <p>En la práctica de ingeniería, los datos disponibles deben interpretarse según el impacto en la red local. ${strat.supportingArguments[0]}</p>
  <ul>
    ${strat.productEvidence.map((fact) => `<li><strong>Dato verificable de laboratorio:</strong> ${fact}</li>`).join("")}
  </ul>

  <div class="comparative-table-container">
    ${comparativeTable}
  </div>

  <h2>Cómo dimensionar y validar el despliegue</h2>
  <p>Para garantizar estabilidad sin cuellos de botella en el switch o AP, deben revisarse criterios operativos claros: compatibilidad de interfaces, presupuesto energético disponible, segmentación de tráfico mediante VLANs y capacidad de absorción de picos de tráfico en enlaces troncales.</p>
  <p>${strat.supportingArguments[1]}</p>

  <h2>Dónde encaja ${productName}</h2>
  <p>${decision.selectedAngle.readerPromise} ${thesis.centralArgument}</p>
  <p>La referencia ${sku} de ${intel.brand} debe valorarse exclusivamente a partir de sus especificaciones verificadas en EcomShop. Su integración permite resolver la conectividad con fiabilidad empresarial y soporte directo.</p>

  <h2>Qué debe verificarse antes del despliegue y limitaciones</h2>
  <p>${thesis.solutionApproach} No debe asumirse ninguna prestación que la ficha técnica oficial no documente expresamente. Las limitaciones del escenario, la distancia de cableado estructurado, la disipación térmica en el rack y la compatibilidad con transceptores deben comprobarse antes de la instalación definitiva.</p>

  <h2>Decisión profesional</h2>
  <p>${thesis.centralArgument} El criterio final consiste en comprobar que las capacidades necesarias están cubiertas por datos verificables y que las condiciones del proyecto son compatibles con ellos. Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h.</p>
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

export function generateLinkedInChannel(
  rawLinkedin: Partial<ContentOutput["linkedin"]> | undefined,
  input: ChannelWriterInput
): ContentOutput["linkedin"] {
  const { context, decision, strategies } = input;
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

  const hook = `¿Seguimos dimensionando ${context.effectiveCategory} por especificación máxima en lugar de por arquitectura real?`;
  const body = `${strat.primaryArgument}\n\nEn despliegues reales, ${strat.supportingArguments[0]} Analizando equipos como ${context.intel.brand} ${model} (${sku}), la clave no es acumular funciones, sino comprobar que la conectividad y la gestión responden a la carga diaria.`;
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

export function generateWhatsAppChannel(
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

  const headline = `*Novedad B2B: ${context.intel.brand} ${model} (${sku})*`;
  const formattedMessage = `${headline}\n\n${strat.primaryArgument}\n\n✓ ${strat.supportingArguments[0]}\n✓ Stock y soporte directo de ingeniería en España.\n\n🔗 ${strat.ctaObjective}: ${url}`;

  return {
    headline: `${context.intel.brand} ${sku}`,
    formattedMessage,
    callToAction: strat.ctaObjective,
    targetUrl: url
  };
}

export function generateMailchimpChannel(
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
      previewText: rawMailchimp.previewText || `Evaluación técnica y TCO de ${sku}.`,
      ctaButtonText: rawMailchimp.ctaButtonText || "Solicitar documentación / prueba",
      ctaUrl: rawMailchimp.ctaUrl || url,
      newsletterHtml: rawMailchimp.newsletterHtml,
      plainText: rawMailchimp.plainText || rawMailchimp.newsletterHtml.replace(/<[^>]+>/g, " ").trim()
    };
  }

  const subjectA = `${model} (${sku}): argumentos para justificar tu instalación`;
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
  <p>${strat.supportingArguments[1]}</p>
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

export function generateGeoChannel(
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

  const title = rawGeo?.title?.trim() || `${brand} ${model} (${sku}) — Ficha técnica y respuestas de ingeniería`;
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
