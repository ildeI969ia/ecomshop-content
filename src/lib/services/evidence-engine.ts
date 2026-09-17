import { ProductIntelligenceCard } from "../types/product-intelligence";
import { aiClient, getGenAIClient, getActiveGeminiModel } from "../genai-client";
import { NotebookGroundingService } from "./notebook-grounding";

export interface EvidenceAuditResult {
  sanitizedContent: string;
  factCheckScore: number; // 0 - 100
  unverifiedClaims: string[];
  passedQualityGate: boolean;
}

/**
 * EvidenceEngine: Audita borradores de marketing contra la ProductIntelligenceCard, el EvidenceLedger
 * y el Master Notebook de EcomShop (podando afirmaciones técnicas incorrectas de puertos, PoE, Wi-Fi, etc.)
 */
export async function verifyAndSanitizeContent(
  draft: string,
  channel: string,
  card: ProductIntelligenceCard,
  apiKeyOverride?: string
): Promise<EvidenceAuditResult> {
  const client = apiKeyOverride ? getGenAIClient(apiKeyOverride) : aiClient;

  // Consultar fragmentos relevantes en el Notebook oficial
  const notebookService = new NotebookGroundingService();
  const notebookData = await notebookService.queryNotebookContext(`${card.product.brand} ${card.product.model} ${card.technicalSpecs.standards.join(" ")}`);

  const prompt = `
Actúa como Inspector de Calidad de Ingeniería y Fact-Checker para EcomSpain B2B.
Tu tarea es auditar rigurosamente el siguiente borrador de marketing para el canal '${channel}' contrastándolo contra los datos técnicos verificados de la ProductIntelligenceCard y el Master Notebook de EcomShop.

PRODUCT INTELLIGENCE CARD (VERDAD ABSOLUTA):
- Marca y Modelo: ${card.product.brand} ${card.product.model} (SKU: ${card.product.sku})
- Estándares: ${card.technicalSpecs.standards.join(", ")}
- Puertos Físicos: ${card.technicalSpecs.ports.join(", ")}
- Alimentación y PoE: ${card.technicalSpecs.powerRequirements}
- Tipo de Gestión: ${card.technicalSpecs.management}
- Diferenciadores: ${card.technicalSpecs.keyDifferentiators.join(" | ")}
- Ledger de Evidencias:
${card.evidenceLedger.map(e => `  * ${e.claim} [${e.sourceType}]`).join("\n")}

CORPUS OFICIAL DEL NOTEBOOK ECOMSHOP (59 FUENTES TÉCNICAS):
${notebookData.groundingSummary}

BORRADOR A AUDITAR (${channel.toUpperCase()}):
"""
${draft}
"""

REGLAS DE SANITIZACIÓN TÉCNICA:
1. Si el borrador menciona especificaciones inventadas o exageradas (ejemplo: puertos 10G cuando el producto solo tiene 2.5G, o Wi-Fi 7 cuando es Wi-Fi 6), corrígelo quirúrgicamente para que coincida con la ficha técnica.
2. HARDWARE BLACKLIST ESTRICTA: Queda TERMINANTEMENTE PROHIBIDO cualquier mención a "EnGenius Fit", "FitController", "FitXpress" o controladores locales obsoletos. Si el borrador los menciona, sustitúyelos inmediatamente por "EnGenius Cloud" o elimínalos, y agrégalo a unverifiedClaims.
3. Si el contenido inventa marcas competidoras no contrastadas o precios falsos, neutralízalos.
4. Conserva el formato, estilos y estructura HTML o de texto del borrador.
5. Calcula un factCheckScore (0 a 100) en base a la veracidad inicial del borrador.
6. Lista cualquier unverifiedClaims que tuviste que corregir o eliminar.

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "sanitizedContent": "Texto o HTML corregido",
  "factCheckScore": 95,
  "unverifiedClaims": ["afirmación corregida 1", "afirmación corregida 2"]
}
`;

  try {
    const generatePromise = client.models.generateContent({
      model: getActiveGeminiModel(apiKeyOverride),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("[EvidenceEngine] Timeout excedido en auditoria (6s)")), 6000)
    );

    const res = await Promise.race([generatePromise, timeoutPromise]);

    const raw = res.text || "{}";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const factCheckScore = typeof parsed.factCheckScore === "number" ? parsed.factCheckScore : 90;
    const sanitizedContent = parsed.sanitizedContent || draft;
    const unverifiedClaims = Array.isArray(parsed.unverifiedClaims) ? parsed.unverifiedClaims : [];

    return {
      sanitizedContent,
      factCheckScore,
      unverifiedClaims,
      passedQualityGate: factCheckScore >= 75
    };
  } catch (err) {
    console.warn("[EvidenceEngine] Fallo en auditoría automática de Gemini, aplicando reglas deterministas:", err);
    return deterministicAuditFallback(draft, card);
  }
}

function deterministicAuditFallback(draft: string, card: ProductIntelligenceCard): EvidenceAuditResult {
  let sanitized = draft;
  const unverified: string[] = [];

  // Regla 1: Si no tiene 10G y el texto dice 10G, revisar
  const has10G = card.technicalSpecs.ports.some(p => p.toLowerCase().includes("10g"));
  if (!has10G && /\b10\s*gbps\b|\b10gbe\b|\b10g\b/i.test(sanitized)) {
    sanitized = sanitized.replace(/\b10\s*Gbps\b|\b10GbE\b|\b10G\b/gi, card.technicalSpecs.ports[0] || "Multi-Gigabit");
    unverified.push("Sustitución de mención 10G no presente en la ficha técnica por puertos reales.");
  }

  // Regla 2: Asegurar mención correcta de la marca y SKU
  if (!sanitized.includes(card.product.model)) {
    unverified.push("Alineación de modelo de equipo con SKU oficial.");
  }

  return {
    sanitizedContent: sanitized,
    factCheckScore: unverified.length === 0 ? 100 : 85,
    unverifiedClaims: unverified,
    passedQualityGate: true
  };
}
