import { ContentOutput } from "@/lib/schema";

export interface GroundedClaimItem {
  text: string;
  sourceId: string;
  verified: boolean;
}

export interface UngroundedClaimItem {
  text: string;
  number: string;
  reason: string;
}

export interface GroundingValidationResult {
  isValid: boolean;
  claims: GroundedClaimItem[];
  ungroundedClaims: UngroundedClaimItem[];
}

/**
 * Validador de Grounding Obligatorio (Fase 6c):
 * Extrae todas las cifras numéricas clave (%, Gbps, Mbps, W, €, años) de los textos visibles del contenido
 * y verifica que cada una esté amparada en la lista de `claims` con un `sourceId` existente y válido.
 */
export function validateContentGrounding(
  content: ContentOutput,
  validSourceIds?: string[]
): GroundingValidationResult {
  const claims = content.claims || [];

  // Recopilar todo el texto plano del contenido generado
  const textBlocks: string[] = [];
  if (content.blog?.htmlContent) textBlocks.push(content.blog.htmlContent.replace(/<[^>]+>/g, " "));
  if (content.blog?.metaDescription) textBlocks.push(content.blog.metaDescription);
  if (content.mailchimp?.newsletterHtml) textBlocks.push(content.mailchimp.newsletterHtml.replace(/<[^>]+>/g, " "));
  if (content.whatsapp?.formattedMessage) textBlocks.push(content.whatsapp.formattedMessage);
  if (content.linkedin?.fullPostText) textBlocks.push(content.linkedin.fullPostText);

  const fullText = textBlocks.join(" ");

  // Extraer cifras numéricas clave: %, Gbps, Mbps, W, €, años
  const numberRegex = /\b(\d+(?:[\.,]\d+)?\s*(?:%|gbps|mbps|w|€|años?|año))\b/gi;

  const matches = Array.from(fullText.matchAll(numberRegex));
  const detectedFigures: Array<{ raw: string; value: string; sentence: string }> = [];

  for (const match of matches) {
    const raw = match[0].trim();
    const index = match.index || 0;
    const start = Math.max(0, index - 40);
    const end = Math.min(fullText.length, index + 40);
    const sentence = fullText.substring(start, end).trim();

    detectedFigures.push({ raw, value: raw.toLowerCase(), sentence });
  }

  // Deduplicar cifras por su valor numérico + unidad
  const uniqueFigures = new Map<string, { raw: string; sentence: string }>();
  for (const fig of detectedFigures) {
    if (!uniqueFigures.has(fig.value)) {
      uniqueFigures.set(fig.value, fig);
    }
  }

  const verifiedClaims: GroundedClaimItem[] = [];
  const ungroundedClaims: UngroundedClaimItem[] = [];

  // Evaluar cada cifra detectada contra la lista de claims con sourceId
  for (const [val, fig] of uniqueFigures.entries()) {
    const matchingClaim = claims.find((c) => {
      if (!c.text || !c.sourceId) return false;
      if (c.sourceId.trim() === "") return false;
      const textLower = c.text.toLowerCase();
      const numClean = fig.raw.toLowerCase().replace(/\s+/g, "");
      const textClean = textLower.replace(/\s+/g, "");
      return textLower.includes(fig.raw.toLowerCase()) || textClean.includes(numClean);
    });

    if (matchingClaim && matchingClaim.sourceId && matchingClaim.sourceId.trim() !== "") {
      verifiedClaims.push({
        text: matchingClaim.text,
        sourceId: matchingClaim.sourceId,
        verified: true
      });
    } else {
      ungroundedClaims.push({
        text: fig.sentence,
        number: fig.raw,
        reason: `La cifra "${fig.raw}" aparece en el texto sin fuente asociada.`
      });
    }
  }

  // Mapear el resto de claims informados
  for (const c of claims) {
    if (c.sourceId && !verifiedClaims.some((vc) => vc.sourceId === c.sourceId && vc.text === c.text)) {
      verifiedClaims.push({
        text: c.text,
        sourceId: c.sourceId,
        verified: Boolean(c.sourceId && c.sourceId.trim() !== "")
      });
    }
  }

  const isValid = ungroundedClaims.length === 0;

  return {
    isValid,
    claims: verifiedClaims,
    ungroundedClaims
  };
}
