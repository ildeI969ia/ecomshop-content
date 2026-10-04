import { ContentOutput } from "@/lib/schema";
import { MultichannelStrategyMap } from "@/lib/types/channel-strategy";
import { checkProductContamination } from "@/lib/quality/editorial-quality-gate";

export interface CrossChannelReport {
  thesisConsistency: number;
  productTruthConsistency: number;
  audienceAlignment: Record<string, number>;
  channelDiversity: number;
  semanticSimilarity: Record<string, number>;
  strategyCompliance: Record<string, boolean>;
  forbiddenOverlap: string[];
  publishable: boolean;
  reasons: string[];
}

function normalizeTokens(text: string): Set<string> {
  const clean = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9\s]/g, " ");
  return new Set(clean.split(/\s+/).filter((t) => t.length >= 4));
}

function jaccardSimilarity(textA: string, textB: string): number {
  const setA = normalizeTokens(textA);
  const setB = normalizeTokens(textB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Number((intersection / union).toFixed(3));
}

export class CrossChannelCritic {
  evaluate(
    content: ContentOutput,
    strategies: MultichannelStrategyMap,
    requestedSku: string
  ): CrossChannelReport {
    const reasons: string[] = [];
    const targetSku = requestedSku.trim().toUpperCase();

    // 1. Product Truth Consistency & Strict SKU Lock
    const contamination = checkProductContamination(content, targetSku);
    const productTruthConsistency = contamination.passed ? 1.0 : 0.0;
    if (!contamination.passed) {
      reasons.push(
        `Contaminación de SKU detectada: ${contamination.detectedUnrelatedSkus.join(", ")}`
      );
    }

    // 2. Extraer textos de cada canal
    const blogText = content.blog?.htmlContent || "";
    const linkedinText = content.linkedin?.fullPostText || "";
    const whatsappText = content.whatsapp?.formattedMessage || "";
    const mailchimpText = content.mailchimp?.plainText || content.mailchimp?.newsletterHtml || "";
    const geoText = content.geo?.htmlContent || "";

    // Verificar presencia de SKU en todos los canales activos
    const channelsMissingSku: string[] = [];
    if (blogText && !blogText.toUpperCase().includes(targetSku)) channelsMissingSku.push("BLOG");
    if (linkedinText && !linkedinText.toUpperCase().includes(targetSku)) channelsMissingSku.push("LINKEDIN");
    if (whatsappText && !whatsappText.toUpperCase().includes(targetSku)) channelsMissingSku.push("WHATSAPP");
    if (mailchimpText && !mailchimpText.toUpperCase().includes(targetSku)) channelsMissingSku.push("MAILCHIMP");
    if (geoText && !geoText.toUpperCase().includes(targetSku)) channelsMissingSku.push("GEO");

    if (channelsMissingSku.length > 0) {
      reasons.push(`Canales que no mencionan el SKU canónico ${targetSku}: ${channelsMissingSku.join(", ")}`);
    }

    // 3. Similitud semántica entre pares de canales (detectar copias o resúmenes directos)
    const pairs: Array<{ name: string; textA: string; textB: string }> = [
      { name: "Blog ↔ LinkedIn", textA: blogText, textB: linkedinText },
      { name: "Blog ↔ WhatsApp", textA: blogText, textB: whatsappText },
      { name: "Blog ↔ Mailchimp", textA: blogText, textB: mailchimpText },
      { name: "LinkedIn ↔ WhatsApp", textA: linkedinText, textB: whatsappText },
      { name: "LinkedIn ↔ Mailchimp", textA: linkedinText, textB: mailchimpText },
      { name: "WhatsApp ↔ Mailchimp", textA: whatsappText, textB: mailchimpText }
    ];

    const semanticSimilarity: Record<string, number> = {};
    const forbiddenOverlapDetected: string[] = [];

    for (const pair of pairs) {
      const sim = jaccardSimilarity(pair.textA, pair.textB);
      semanticSimilarity[pair.name] = sim;
      // Umbral de similitud: por encima de 0.55 se considera canal clonado/resumen
      if (sim > 0.55) {
        forbiddenOverlapDetected.push(
          `Canales con similitud excesiva (${pair.name}: ${(sim * 100).toFixed(1)}%). Cada canal debe tener argumentación y JTBD propios.`
        );
      }
    }

    // 4. Diversidad global entre canales
    const simValues = Object.values(semanticSimilarity);
    const avgSimilarity = simValues.length > 0 ? simValues.reduce((a, b) => a + b, 0) / simValues.length : 0;
    // Canal diversity es inverso a la similitud promedio normalizado a 100
    const channelDiversity = Math.round(Math.max(0, Math.min(100, (1 - avgSimilarity) * 100)));

    // 5. Consistencia de la Tesis Editorial (comparten conceptos centrales de la tesis)
    const thesis = content.editorialThesis;
    let thesisConsistency = 1.0;
    if (thesis) {
      const coreTokens = normalizeTokens(`${thesis.technicalQuestion} ${thesis.centralArgument}`);
      const channelsToCheck = [
        { name: "BLOG", text: blogText },
        { name: "LINKEDIN", text: linkedinText },
        { name: "MAILCHIMP", text: mailchimpText }
      ];

      let matchingChannels = 0;
      for (const ch of channelsToCheck) {
        const tokens = normalizeTokens(ch.text);
        let hits = 0;
        for (const t of coreTokens) {
          if (tokens.has(t)) hits += 1;
        }
        if (hits >= 2) matchingChannels += 1;
      }
      thesisConsistency = Number((matchingChannels / channelsToCheck.length).toFixed(2));
      if (thesisConsistency < 0.6) {
        reasons.push("La tesis editorial no se refleja de forma consistente en los canales principales.");
      }
    }

    // 6. Alineación de Audiencia y Estrategia por Canal
    const audienceAlignment: Record<string, number> = {
      BLOG: blogText.length >= 600 ? 100 : 50,
      LINKEDIN: linkedinText.length >= 80 && linkedinText.length <= 1500 ? 100 : 60,
      WHATSAPP: whatsappText.length >= 30 && whatsappText.length <= 600 ? 100 : 50,
      MAILCHIMP: mailchimpText.length >= 100 ? 100 : 50,
      GEO: geoText.length >= 200 ? 100 : 60
    };

    const strategyCompliance: Record<string, boolean> = {
      BLOG: blogText.length >= 600 && !forbiddenOverlapDetected.some((f) => f.includes("Blog")),
      LINKEDIN: linkedinText.length >= 60 && !forbiddenOverlapDetected.some((f) => f.includes("LinkedIn")),
      WHATSAPP: whatsappText.length >= 30,
      MAILCHIMP: mailchimpText.length >= 80,
      GEO: geoText.length >= 150
    };

    // 7. Veredicto de Publicabilidad
    const publishable =
      productTruthConsistency === 1.0 &&
      channelsMissingSku.length === 0 &&
      forbiddenOverlapDetected.length === 0 &&
      thesisConsistency >= 0.6 &&
      channelDiversity >= 50 &&
      !content.fallbackUsed;

    if (content.fallbackUsed) {
      reasons.push("Se utilizó fallback de contingencia; requiere revisión humana explícita antes de publicación.");
    }

    return {
      thesisConsistency,
      productTruthConsistency,
      audienceAlignment,
      channelDiversity,
      semanticSimilarity,
      strategyCompliance,
      forbiddenOverlap: forbiddenOverlapDetected,
      publishable,
      reasons: [...reasons, ...forbiddenOverlapDetected]
    };
  }
}
