import { z } from "zod";

export const ClaimTypeEnum = z.enum([
  "TECHNICAL",
  "COMMERCIAL",
  "OPERATIONAL",
  "COMPATIBILITY"
]);
export type ClaimType = z.infer<typeof ClaimTypeEnum>;

export const ClaimStatusEnum = z.enum([
  "VERIFIED",
  "INFERRED",
  "UNKNOWN",
  "COMMERCIAL_UNVERIFIED"
]);
export type ClaimStatus = z.infer<typeof ClaimStatusEnum>;

export interface ProductEvidenceClaim {
  id: string;
  claim: string;
  source: string;
  sourceType: string;
  type: ClaimType;
  confidence: number; // 0.0 - 1.0
  status: ClaimStatus;
}

export interface BusinessTruth {
  hasStockInfo: boolean;
  hasOfficialWarranty: boolean;
  hasCustomCommercialConditions: boolean;
  commercialNotes: string[];
}

export interface ProductEvidencePack {
  sku: string;
  brand: string;
  model: string;
  category: string;
  productType: string;
  facts: string[];
  claims: ProductEvidenceClaim[];
  limitations: string[];
  sources: Array<{ id: string; title: string; url?: string; type: string }>;
  businessFacts: string[];
  businessTruth: BusinessTruth;
}

export interface ClaimPolicyEvaluation {
  allowed: boolean;
  rejectedClaims: Array<{ text: string; reason: string }>;
  verifiedClaimsCount: number;
}

export class ClaimPolicy {
  /**
   * Valida un texto frente a las afirmaciones comerciales no demostradas.
   * Si no hay BusinessTruth explícita, se prohíben términos inventados.
   */
  static evaluateText(
    text: string,
    evidencePack: ProductEvidencePack
  ): ClaimPolicyEvaluation {
    const lower = text.toLowerCase();
    const rejectedClaims: Array<{ text: string; reason: string }> = [];

    // Frases comerciales no demostradas (Mandato 5)
    const forbiddenCommercialPhrases = [
      { pattern: /entrega\s+24\/48h/i, label: "entrega 24/48h" },
      { pattern: /stock\s+inmediato/i, label: "stock inmediato" },
      { pattern: /disponibilidad\s+inmediata/i, label: "disponibilidad inmediata" },
      { pattern: /soporte\s+directo\s+de\s+ingenier[ií]a/i, label: "soporte directo de ingeniería" },
      { pattern: /sustituci[oó]n\s+avanzada/i, label: "sustitución avanzada" },
      { pattern: /unidad\s+de\s+prueba/i, label: "unidad de prueba" },
      { pattern: /precio\s+neto/i, label: "precio neto" }
    ];

    if (!evidencePack.businessTruth.hasCustomCommercialConditions) {
      for (const item of forbiddenCommercialPhrases) {
        if (item.pattern.test(lower)) {
          rejectedClaims.push({
            text: item.label,
            reason: `COMMERCIAL_UNVERIFIED: La frase comercial '${item.label}' no está documentada en BusinessTruth.`
          });
        }
      }
    }

    // Comprobación de precios numéricos inventados
    const priceMatch = text.match(/\b[1-9]\d*\s*(?:€|euros)\b/gi);
    if (priceMatch && priceMatch.length > 0) {
      rejectedClaims.push({
        text: priceMatch.join(", "),
        reason: "UNKNOWN_PRICING: Precios numéricos inventados no permitidos sin feed comercial expreso."
      });
    }

    return {
      allowed: rejectedClaims.length === 0,
      rejectedClaims,
      verifiedClaimsCount: evidencePack.facts.length
    };
  }
}
