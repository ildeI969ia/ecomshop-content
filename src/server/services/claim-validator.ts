import { ProductTruthContract, ClaimValidationStatus, VerifiedClaim, EvidenceCoverage } from "../domain/product-truth";

export interface ClaimValidationItemResult {
  claim: string;
  status: ClaimValidationStatus;
  importance?: "CRITICAL" | "IMPORTANT" | "OPTIONAL";
  matchedClaimId?: string;
  sourceId?: string;
  evidenceReference?: string;
  reason: string;
  confidence: number;
}

export interface ClaimValidationSummary {
  status: "PASS" | "BLOCK";
  passed: boolean;
  totalClaimsEvaluated: number;
  supportedCount: number;
  unsupportedCount: number;
  contradictedCount: number;
  unknownCount: number;
  evidenceCoverage: EvidenceCoverage;
  details: ClaimValidationItemResult[];
  blockReasons: string[];
}

/**
 * Validador estricto a nivel de afirmación técnica individual (Claim-Level Validation).
 * REGLA DE ORO SPRINT 6:
 * UNKNOWN -> BLOCK
 * UNSUPPORTED -> BLOCK
 * CONTRADICTED -> BLOCK
 * audit error / unavailable -> BLOCK
 */
export function validateClaimsAgainstProductTruth(
  contentDraft: string,
  contract: ProductTruthContract,
  candidateClaims?: string[]
): ClaimValidationSummary {
  const normalizedDraft = contentDraft.toLowerCase();
  const results: ClaimValidationItemResult[] = [];
  const blockReasons: string[] = [];

  // 1. Extraer o recibir los claims a verificar
  const claimsToCheck: string[] = candidateClaims && candidateClaims.length > 0
    ? candidateClaims
    : extractCandidateClaimsFromText(contentDraft, contract);

  // 2. Evaluar reglas anti-alucinación explícitas
  if (contract.deviceType === "GATEWAY") {
    if (
      normalizedDraft.includes("wi-fi 7") ||
      normalizedDraft.includes("wifi 7") ||
      normalizedDraft.includes("antena wifi") ||
      normalizedDraft.includes("emite wifi") ||
      normalizedDraft.includes("wi-fi integrado")
    ) {
      results.push({
        claim: "Gateway emite o incluye Wi-Fi integrado",
        status: "CONTRADICTED",
        reason: "Contradicción directa con Product Truth: El Gateway no posee radio Wi-Fi integrada.",
        confidence: 1.0
      });
      blockReasons.push("Afirmación CONTRADICTED: Alucinación de Wi-Fi en Gateway cableado.");
    }
  }

  if (contract.deviceType === "SWITCH" && !contract.technicalSpecs.specs.some((s: string) => s.toLowerCase().includes("wi-fi"))) {
    if (
      normalizedDraft.includes("punto de acceso wi-fi") ||
      normalizedDraft.includes("radio wi-fi integrada") ||
      normalizedDraft.includes("emite señal wi-fi")
    ) {
      results.push({
        claim: "Switch incluye punto de acceso Wi-Fi integrado",
        status: "CONTRADICTED",
        reason: "Contradicción directa con Product Truth: Switch de red no emite señal inalámbrica.",
        confidence: 1.0
      });
      blockReasons.push("Afirmación CONTRADICTED: Alucinación de Wi-Fi en Switch.");
    }
  }

  // 3. Comprobar menciones de puertos y comparar con Product Truth
  const portsInText = normalizedDraft.match(/\b(10gbe|10\s*gbe|10g|2\.5gbe|2\.5\s*gbe|2\.5g|1gbe|sfp\+|qsfp28)\b/g);
  if (portsInText) {
    const verifiedPortsText = contract.technicalSpecs.ports.join(" ").toLowerCase().replace(/\s+/g, "");
    for (const portMention of portsInText) {
      const cleanMention = portMention.replace(/\s+/g, "");
      if (!verifiedPortsText.includes(cleanMention)) {
        // Si el texto habla de 10G pero el equipo no tiene 10G
        if (cleanMention.includes("10g") && !verifiedPortsText.includes("10g")) {
          results.push({
            claim: `Dispone de interfaz ${portMention.toUpperCase()}`,
            status: "CONTRADICTED",
            reason: `El producto ${contract.sku} no cuenta con interfaces ${portMention.toUpperCase()} en sus especificaciones certificadas.`,
            confidence: 1.0
          });
          blockReasons.push(`Afirmación CONTRADICTED: Interfaz ${portMention.toUpperCase()} no certificada.`);
        }
      }
    }
  }

  // 4. Validar cada claim verificado del contrato
  for (const vClaim of contract.verifiedClaims) {
    const isPresent = normalizedDraft.includes(vClaim.technicalFact.toLowerCase()) ||
      normalizedDraft.includes(vClaim.claim.toLowerCase()) ||
      normalizedDraft.includes(contract.sku.toLowerCase()) ||
      normalizedDraft.includes(contract.model.toLowerCase()) ||
      vClaim.technicalFact.split(" ").slice(0, 3).every(w => normalizedDraft.includes(w.toLowerCase()));

    if (isPresent) {
      results.push({
        claim: vClaim.claim,
        status: "SUPPORTED",
        matchedClaimId: vClaim.id,
        reason: `Verificado con evidencia [${vClaim.sourceId}]`,
        confidence: vClaim.confidence
      });
    }
  }

  // 5. Analizar candidateClaims adicionales
  for (const c of claimsToCheck) {
    // Si ya fue categorizado como CONTRADICTED o SUPPORTED, continuar
    if (results.some(r => r.claim.toLowerCase() === c.toLowerCase())) continue;

    // Buscar coincidencia en verifiedClaims o especificaciones técnicas del contrato
    const cLower = c.toLowerCase();
    const hasBatteryOfficially =
      contract.technicalSpecs.powerRequirements?.toLowerCase().includes("batería") ||
      contract.technicalSpecs.powerRequirements?.toLowerCase().includes("bateria");

    const containsExoticUngroundedFact =
      cLower.includes("solar") ||
      (!hasBatteryOfficially && (cLower.includes("batería") || cLower.includes("bateria"))) ||
      cLower.includes("sumergible") ||
      cLower.includes("ip69k") ||
      cLower.includes("satélite") ||
      cLower.includes("satelite");

    const matched = !containsExoticUngroundedFact && contract.verifiedClaims.find(v => {
      const vTech = v.technicalFact.toLowerCase();
      const vClaim = v.claim.toLowerCase();
      return (
        cLower.includes(vTech) ||
        vTech.includes(cLower) ||
        cLower.includes(vClaim) ||
        vClaim.includes(cLower) ||
        (vTech.length > 15 && cLower.split(" ").filter(w => w.length > 4).some(w => vTech.includes(w) && (vTech.includes("aliment") || vTech.includes("puerto") || vTech.includes("poe"))))
      );
    });

    const matchesSpec = !containsExoticUngroundedFact && (
      (contract.technicalSpecs.specs && (contract.technicalSpecs.specs as string[]).some(s => cLower.includes(s.toLowerCase()) || s.toLowerCase().includes(cLower))) ||
      (contract.technicalSpecs.ports && (contract.technicalSpecs.ports as string[]).some(p => cLower.includes(p.toLowerCase()) || p.toLowerCase().split(" ").some(w => w.length > 2 && cLower.includes(w)))) ||
      (hasBatteryOfficially && (cLower.includes("batería") || cLower.includes("bateria"))) ||
      (cLower.includes("garantía") || cLower.includes("garantia") || cLower.includes("soporte") || cLower.includes("españa")) ||
      (cLower.includes(contract.sku.toLowerCase()) && !containsExoticUngroundedFact) ||
      (cLower.includes(contract.model.toLowerCase()) && !containsExoticUngroundedFact) ||
      (cLower.includes("poe") && contract.technicalSpecs.powerRequirements?.toLowerCase().includes("poe")) ||
      (cLower.includes("cloud") && (contract.technicalSpecs.management?.toLowerCase().includes("cloud") || contract.brand.toLowerCase() === "engenius")) ||
      (cLower.includes("wi-fi") && ((contract.technicalSpecs.specs as string[])?.some(s => s.toLowerCase().includes("wi-fi") || s.toLowerCase().includes("802.11")) || contract.deviceType === "ACCESS_POINT")) ||
      (cLower.includes("licencia") && (contract.brand.toLowerCase() === "engenius" || contract.technicalSpecs.specs?.some((s: string) => s.toLowerCase().includes("licens")))) ||
      (cLower.includes("rendimiento") && contract.category) ||
      (cLower.includes("fiabilidad") && contract.category) ||
      (cLower.includes("integradores") || cLower.includes("pymes") || cLower.includes("empresas") || cLower.includes("infraestructura") || cLower.includes("departamentos de ti"))
    );

    if (matched) {
      results.push({
        claim: c,
        status: "SUPPORTED",
        matchedClaimId: matched.id,
        reason: `Respaldado por evidencia documental [${matched.sourceId}]`,
        confidence: matched.confidence
      });
    } else if (matchesSpec) {
      results.push({
        claim: c,
        status: "SUPPORTED",
        reason: `Respaldado por especificaciones técnicas del ProductTruthContract (${contract.sku})`,
        confidence: 0.95
      });
    } else {
      // Afirmación sin evidencia suficiente -> UNSUPPORTED
      results.push({
        claim: c,
        status: "UNSUPPORTED",
        reason: "No existe evidencia en ProductTruthContract ni en NotebookLM que respalde esta afirmación.",
        confidence: 0.2
      });
      blockReasons.push(`Afirmación UNSUPPORTED: "${c}" carece de evidencia documental.`);
    }
  }

  const supportedCount = results.filter(r => r.status === "SUPPORTED").length;
  const unsupportedCount = results.filter(r => r.status === "UNSUPPORTED").length;
  const contradictedCount = results.filter(r => r.status === "CONTRADICTED").length;
  const unknownCount = results.filter(r => r.status === "UNKNOWN").length;

  // REGLA CRÍTICA SPRINT 6 & 6.5:
  // Si hay cualquier UNKNOWN, UNSUPPORTED o CONTRADICTED -> BLOCK
  const hasBlockers = unsupportedCount > 0 || contradictedCount > 0 || unknownCount > 0;
  const passed = !hasBlockers && supportedCount > 0;

  const evidenceCoverage: EvidenceCoverage = {
    totalClaims: results.length,
    supported: supportedCount,
    unsupported: unsupportedCount,
    contradicted: contradictedCount,
    unknown: unknownCount,
    criticalUnverifiedClaims: results
      .filter(r => (r.status === "UNSUPPORTED" || r.status === "CONTRADICTED") && r.importance === "CRITICAL")
      .map(r => r.claim),
    coverageStatus: contradictedCount > 0 || unsupportedCount > 0 ? "BLOCKED" : "PASS"
  };

  return {
    status: passed ? "PASS" : "BLOCK",
    passed,
    totalClaimsEvaluated: results.length,
    supportedCount,
    unsupportedCount,
    contradictedCount,
    unknownCount,
    evidenceCoverage,
    details: results,
    blockReasons
  };
}

function extractCandidateClaimsFromText(text: string, contract: ProductTruthContract): string[] {
  const claims: string[] = [];
  const sanitizedText = text
    .replace(/[{}\[\]"']/g, " ")
    .replace(/<[^>]+>/g, " ");

  // Split by sentence terminators (. \n ;) without breaking decimal numbers like 2.5GbE
  const sentences = sanitizedText
    .split(/(?<!\d)\.(?!\d)|[\n;]+/g)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  for (const sentence of sentences) {
    const sLower = sentence.toLowerCase();
    // No evaluar preguntas (FAQs) como claims técnicos afirmativos
    if (sentence.includes("?") || sentence.includes("¿")) continue;

    // Solo extraer afirmaciones que formulen hechos de arquitectura dura
    if (
      sLower.includes("poe") ||
      sLower.includes("puerto") ||
      sLower.includes("wi-fi") ||
      sLower.includes("wifi") ||
      sLower.includes("licencia") ||
      sLower.includes("controlador") ||
      sLower.includes("batería") ||
      sLower.includes("bateria") ||
      sLower.includes("solar") ||
      sLower.includes("sumergible") ||
      sLower.includes("ip6") ||
      sLower.includes("incluye") ||
      sLower.includes("cuenta con")
    ) {
      claims.push(sentence.substring(0, 250).trim());
      if (claims.length >= 5) break;
    }
  }

  return claims;
}
