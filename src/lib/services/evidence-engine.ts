import { ProductIntelligenceCard } from "../types/product-intelligence";
import { aiClient, getGenAIClient, getActiveGeminiModel } from "../genai-client";

export interface EvidenceAuditResult {
  sanitizedContent: string;
  factCheckScore: number | null;
  unverifiedClaims: string[];
  passedQualityGate: boolean;
  status: "PASS" | "WARN" | "BLOCKED";
  reason?: string;
  officialCitation?: {
    sourceId: string;
    title: string;
    type: string;
    url?: string;
  };
}

/**
 * Audita contenido exclusivamente contra ProductIntelligenceCard.
 * ProductIntelligenceCard procede del feed de EcomShop en el flujo canónico.
 * No consulta NotebookLM ni catálogos globales durante la auditoría.
 */
export async function verifyAndSanitizeContent(
  draft: string,
  channel: string,
  card: ProductIntelligenceCard,
  apiKeyOverride?: string
): Promise<EvidenceAuditResult> {
  const client = apiKeyOverride ? getGenAIClient(apiKeyOverride) : aiClient;
  const primaryEvidence = card.evidenceLedger[0];

  const officialCitation = primaryEvidence
    ? {
        sourceId: primaryEvidence.source,
        title: `Feed EcomShop — ${card.product.sku}`,
        type: primaryEvidence.sourceType,
        url: primaryEvidence.source
      }
    : undefined;

  const prompt = `
Actúa como Inspector de Calidad de Ingeniería y Fact-Checker para EcomSpain B2B.

Audita el borrador del canal "${channel}" EXCLUSIVAMENTE contra esta ProductIntelligenceCard,
que representa la ficha del producto seleccionado en el feed de EcomShop.

PRODUCT TRUTH:
- Marca: ${card.product.brand}
- Modelo: ${card.product.model}
- SKU: ${card.product.sku}
- Categoría: ${card.product.category}
- Estándares: ${card.technicalSpecs.standards.join(", ")}
- Puertos: ${card.technicalSpecs.ports.join(", ")}
- Alimentación: ${card.technicalSpecs.powerRequirements}
- Gestión: ${card.technicalSpecs.management}
- Diferenciadores: ${card.technicalSpecs.keyDifferentiators.join(" | ")}

EVIDENCIA DEL FEED:
${card.evidenceLedger.map((e) => `- ${e.claim} [${e.sourceType}] ${e.source}`).join("\n")}

REGLAS:
1. No introduzcas ningún SKU, modelo, marca o especificación que no pertenezca al producto seleccionado.
2. No sustituyas el producto seleccionado por otro producto del catálogo.
3. No inventes puertos, estándares, potencia, gestión, rendimiento, precios o funcionalidades.
4. Si el borrador contiene un dato no respaldado por la tarjeta, elimínalo o corrígelo usando únicamente datos de la tarjeta.
5. Conserva el formato HTML/texto del borrador.
6. Calcula factCheckScore de 0 a 100.
7. Lista en unverifiedClaims las afirmaciones corregidas o eliminadas.

Devuelve ÚNICAMENTE JSON:
{
  "sanitizedContent": "...",
  "factCheckScore": 95,
  "unverifiedClaims": []
}
`;

  const fullPrompt = `${prompt}

BORRADOR A AUDITAR:
"""
${draft}
"""
`;

  try {
    const generatePromise = client.models.generateContent({
      model: getActiveGeminiModel(apiKeyOverride),
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("[EvidenceEngine] Timeout excedido en auditoría (25s)")), 25000)
    );

    const res = await Promise.race([generatePromise, timeoutPromise]);
    const raw = (res.text || "{}").replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(raw);

    const factCheckScore = typeof parsed.factCheckScore === "number" ? parsed.factCheckScore : null;
    const sanitizedContent = typeof parsed.sanitizedContent === "string" ? parsed.sanitizedContent : draft;
    const unverifiedClaims = Array.isArray(parsed.unverifiedClaims)
      ? parsed.unverifiedClaims.filter((v: unknown): v is string => typeof v === "string")
      : [];

    const passed = factCheckScore !== null && factCheckScore >= 75;

    return {
      sanitizedContent,
      factCheckScore,
      unverifiedClaims,
      passedQualityGate: passed,
      status: passed ? "PASS" : "BLOCKED",
      reason: passed ? undefined : "FACT_CHECK_SCORE_INSUFFICIENT",
      officialCitation
    };
  } catch (err) {
    console.warn("[EvidenceEngine] Fallo en auditoría automática; usando validación determinista:", err);
    return {
      ...deterministicAuditFallback(draft, card),
      officialCitation
    };
  }
}

function deterministicAuditFallback(
  draft: string,
  card: ProductIntelligenceCard
): Omit<EvidenceAuditResult, "officialCitation"> {
  let sanitized = draft;
  const unverified: string[] = [];
  const cleanSku = card.product.sku.toUpperCase();

  if (card.technicalSpecs.isCableOnly === true || card.technicalSpecs.hasWifiRadios === false) {
    if (/wi-fi\s+integrado|wifi\s+integrado|antenas?\s+wi-fi|emite\s+wi-fi/i.test(sanitized)) {
      sanitized = sanitized.replace(
        /wi-fi\s+integrado|wifi\s+integrado|antenas?\s+wi-fi|emite\s+wi-fi/gi,
        `conectividad no inalámbrica según la ficha de ${card.product.model}`
      );
      unverified.push(`El borrador atribuía radios Wi-Fi a ${card.product.model}, dato no presente en el feed.`);
    }
  }

  if (card.technicalSpecs.powerRequirements && /poe/i.test(card.technicalSpecs.powerRequirements)) {
    if (/poe\s+est[aá]ndar\s+802\.3af|poe\s+de\s+15w/i.test(sanitized) &&
        !/802\.3af|802\.3at|802\.3bt/i.test(card.technicalSpecs.powerRequirements)) {
      sanitized = sanitized.replace(
        /poe\s+est[aá]ndar\s+802\.3af|poe\s+de\s+15w/gi,
        card.technicalSpecs.powerRequirements
      );
      unverified.push(`Corrección de alimentación de ${card.product.model} según el feed.`);
    }
  }

  const has10G = card.technicalSpecs.ports.some((p) => /10\s*g/i.test(p));
  if (!has10G && /\b10\s*gbps\b|\b10gbe\b|\b10g\b/i.test(sanitized)) {
    sanitized = sanitized.replace(/\b10\s*Gbps\b|\b10GbE\b|\b10G\b/gi, card.technicalSpecs.ports[0] || "la interfaz publicada en EcomShop");
    unverified.push(`Se eliminó una capacidad 10G no respaldada para ${cleanSku}.`);
  }

  const score = unverified.length === 0 ? 95 : Math.max(50, 90 - unverified.length * 10);

  return {
    sanitizedContent: sanitized,
    factCheckScore: score,
    unverifiedClaims: unverified,
    passedQualityGate: score >= 75,
    status: score >= 75 ? "PASS" : "BLOCKED",
    reason: score >= 75 ? undefined : "UNVERIFIED_CLAIMS_IN_CONTENT"
  };
}
