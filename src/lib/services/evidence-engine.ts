import { ProductIntelligenceCard } from "../types/product-intelligence";
import { aiClient, getGenAIClient, getActiveGeminiModel } from "../genai-client";
import { NotebookGroundingService } from "./notebook-grounding";
import { findCatalogProduct } from "../catalog";

export interface EvidenceAuditResult {
  sanitizedContent: string;
  factCheckScore: number; // 0 - 100
  unverifiedClaims: string[];
  passedQualityGate: boolean;
  officialCitation?: {
    sourceId: string;
    title: string;
    type: string;
    url?: string;
  };
}

/**
 * EvidenceEngine: Audita borradores de marketing contra la ProductIntelligenceCard, el EvidenceLedger,
 * el catálogo oficial ECOMSHOP_CATALOG y el Master Notebook de EcomShop (podando afirmaciones técnicas
 * incorrectas de puertos, PoE, Wi-Fi en gateways, etc.)
 */
export async function verifyAndSanitizeContent(
  draft: string,
  channel: string,
  card: ProductIntelligenceCard,
  apiKeyOverride?: string
): Promise<EvidenceAuditResult> {
  const client = apiKeyOverride ? getGenAIClient(apiKeyOverride) : aiClient;

  // Consultar catálogo oficial y notebookSource verificado
  const catalogItem = findCatalogProduct(card.product.sku || card.product.model);
  const notebookService = new NotebookGroundingService();
  const notebookData = await notebookService.queryNotebookContext(
    `${card.product.brand} ${card.product.model} ${card.technicalSpecs.standards.join(" ")}`
  );

  const officialCitation = catalogItem?.notebookCitation ? {
    sourceId: catalogItem.notebookCitation.sourceId,
    title: catalogItem.notebookCitation.title,
    type: catalogItem.notebookCitation.type,
    url: catalogItem.notebookCitation.url
  } : undefined;

  const prompt = `
Actúa como Inspector de Calidad de Ingeniería y Fact-Checker para EcomSpain B2B.
Tu tarea es auditar rigurosamente el siguiente borrador de marketing para el canal '${channel}' contrastándolo contra los datos técnicos verificados de la ProductIntelligenceCard, el catálogo oficial ECOMSHOP_CATALOG y el Master Notebook de EcomShop.

PRODUCT INTELLIGENCE CARD (VERDAD ABSOLUTA):
- Marca y Modelo: ${card.product.brand} ${card.product.model} (SKU: ${card.product.sku})
- Estándares: ${card.technicalSpecs.standards.join(", ")}
- Puertos Físicos: ${card.technicalSpecs.ports.join(", ")}
- Alimentación y PoE: ${card.technicalSpecs.powerRequirements}
- Tipo de Gestión: ${card.technicalSpecs.management}
- Diferenciadores: ${card.technicalSpecs.keyDifferentiators.join(" | ")}
${catalogItem?.antiHallucinationNotes && catalogItem.antiHallucinationNotes.length > 0 ? `
NORMAS ANTI-ALUCINACIÓN OBLIGATORIAS (CATÁLOGO OFICIAL):
${catalogItem.antiHallucinationNotes.map(n => `- ${n}`).join("\n")}
` : ""}
${catalogItem?.notebookCitation ? `- Fuente Documental Oficial: [${catalogItem.notebookCitation.type.toUpperCase()}] ${catalogItem.notebookCitation.title} (${catalogItem.notebookCitation.url || "EcomShop"})` : ""}
- Ledger de Evidencias:
${card.evidenceLedger.map(e => `  * ${e.claim} [${e.sourceType}]`).join("\n")}`;

  const fullPrompt = `${prompt}\n\nCORPUS OFICIAL DEL NOTEBOOK ECOMSHOP:\n${notebookData.groundingSummary}\n\nBORRADOR A AUDITAR (${channel.toUpperCase()}):\n"""
${draft}
"""
\nREGLAS DE SANITIZACIÓN TÉCNICA:\n1. HARDWARE BLACKLIST ESTRICTA: Queda TERMINANTEMENTE PROHIBIDO cualquier mención a "EnGenius Fit", "FitController", "FitXpress" o controladores locales obsoletos. Sustitúyelos inmediatamente por "EnGenius Cloud".
2. GATEWAYS SIN WI-FI: Si el equipo es un gateway (ej. ESG510 o ESG610) y el borrador afirma o insinúa que tiene "Wi-Fi integrado", "antena Wi-Fi" o que "emite señal inalámbrica", CORRÍGELO inmediatamente recalcando que es un gateway cableado que requiere APs EnGenius ECW para dar Wi-Fi.
3. POE Y ENERGÍA: Si es un AP Wi-Fi 7 de alta potencia como el ECW536, verifica que no afirme que funciona al 100% con PoE de 15W. Requiere PoE++ 802.3bt.
4. PUERTOS FÍSICOS: Si el borrador menciona especificaciones inventadas o exageradas (ejemplo: puertos 10G en equipos de 2.5G), corrígelo para que coincida con la ficha técnica.
5. Conserva el formato, estilos y estructura HTML o de texto del borrador.
6. Calcula un factCheckScore (0 a 100) en base a la veracidad inicial del borrador.
7. Lista cualquier unverifiedClaims que tuviste que corregir o eliminar.
\nResponde ÚNICAMENTE en formato JSON con la siguiente estructura:\n{\n  "sanitizedContent": "Texto o HTML corregido",
  "factCheckScore": 95,
  "unverifiedClaims": ["afirmación corregida 1", "afirmación corregida 2"]
}\n`;

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
      passedQualityGate: factCheckScore >= 75,
      officialCitation
    };
  } catch (err) {
    console.warn("[EvidenceEngine] Fallo en auditoría automática de Gemini, aplicando reglas deterministas:", err);
    return {
      ...deterministicAuditFallback(draft, card),
      officialCitation
    };
  }
}

function deterministicAuditFallback(draft: string, card: ProductIntelligenceCard): Omit<EvidenceAuditResult, "officialCitation"> {
  let sanitized = draft;
  const unverified: string[] = [];
  const cleanSku = card.product.sku.toUpperCase();

  // Regla 1: Gateway cableado sin Wi-Fi (ESG510 / ESG610)
  if (cleanSku === "ESG510" || cleanSku === "ESG610" || card.product.category === "gateways") {
    if (/wi-fi\s+integrado|wifi\s+integrado|antenas?\s+wi-fi|emite\s+wi-fi/i.test(sanitized)) {
      sanitized = sanitized.replace(/wi-fi\s+integrado|wifi\s+integrado|antenas?\s+wi-fi/gi, "conectividad cableada de seguridad (gateway sin Wi-Fi integrado)");
      unverified.push(`Eliminación de afirmación falsa: El gateway ${cleanSku} no cuenta con Wi-Fi integrado; se complementa con APs EnGenius ECW.`);
    }
  }

  // Regla 2: AP ECW536 requiere PoE++ 802.3bt
  if (cleanSku === "ECW536") {
    if (/poe\s+est[aá]ndar\s+802\.3af|poe\s+de\s+15w/i.test(sanitized)) {
      sanitized = sanitized.replace(/poe\s+est[aá]ndar\s+802\.3af|poe\s+de\s+15w/gi, "PoE++ 802.3bt (33W máx)");
      unverified.push("Corrección de alimentación: ECW536 requiere conmutación PoE++ 802.3bt para operar sus 3 bandas a máxima potencia.");
    }
  }

  // Regla 3: Si no tiene 10G y el texto dice 10G, revisar
  const has10G = card.technicalSpecs.ports.some(p => p.toLowerCase().includes("10g"));
  if (!has10G && /\b10\s*gbps\b|\b10gbe\b|\b10g\b/i.test(sanitized)) {
    sanitized = sanitized.replace(/\b10\s*Gbps\b|\b10GbE\b|\b10G\b/gi, card.technicalSpecs.ports[0] || "Multi-Gigabit");
    unverified.push("Sustitución de mención 10G no presente en la ficha técnica por puertos reales.");
  }

  // Regla 4: Blacklist controladores obsoletos Fit
  if (/engenius\s+fit|fitcontroller|fitxpress/i.test(sanitized)) {
    sanitized = sanitized.replace(/engenius\s+fit|fitcontroller|fitxpress/gi, "EnGenius Cloud");
    unverified.push("Sustitución de controlador local obsoleto por la plataforma oficial EnGenius Cloud.");
  }

  // Regla 5: Asegurar mención correcta de la marca y SKU
  if (!sanitized.includes(card.product.model)) {
    unverified.push("Alineación de modelo de equipo con SKU oficial.");
  }

  return {
    sanitizedContent: sanitized,
    factCheckScore: unverified.length === 0 ? 100 : Math.max(70, 95 - unverified.length * 10),
    unverifiedClaims: unverified,
    passedQualityGate: true
  };
}
