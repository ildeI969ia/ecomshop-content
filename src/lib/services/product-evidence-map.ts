import { ProductType, ProductEvidenceMap } from "@/lib/types/editorial-intelligence";
import { StructuredProductIntelligence } from "./notebook-intelligence";

/**
 * Detecta el tipo exacto de producto (Product Type Engine)
 */
export function detectProductType(sku: string, category = "", deviceType = ""): ProductType {
  const cleanSku = (sku || "").trim().toUpperCase();
  const cat = (category || "").toLowerCase();
  const dev = (deviceType || "").toUpperCase();

  if (cleanSku.includes("DAC")) return "DAC";
  if (cleanSku.includes("SFP") && (cleanSku.includes("KIT") || cleanSku.includes("SR") || cleanSku.includes("LR"))) return "OPTICAL_TRANSCEIVER";
  if (cleanSku.includes("OM4") || cleanSku.includes("LC-LC") || cleanSku.includes("FIBRA")) return "FIBER_CABLE";
  
  if (dev === "SWITCH" || cleanSku.includes("ECS") || cleanSku.includes("ST3116") || cat.includes("switch")) return "SWITCH";
  if (dev === "ACCESS_POINT" || cleanSku.includes("ECW") || cat.includes("wifi")) return "ACCESS_POINT";
  if (dev === "ROUTER_CELLULAR" || cleanSku.includes("RUT") || cleanSku.includes("TRB") || cat.includes("cellular")) return "ROUTER";
  if (dev === "GATEWAY" || cleanSku.includes("ESG") || cat.includes("firewall")) return "FIREWALL";
  if (cleanSku.includes("POE30G") || cleanSku.includes("INYECTOR") || cleanSku.includes("ACC")) return "ACCESSORY";

  return "ACCESSORY";
}

/**
 * Construye el mapa estricto de evidencias permitidas y prohibidas (Product Evidence Map)
 */
export function buildProductEvidenceMap(
  sku: string,
  intel: StructuredProductIntelligence
): ProductEvidenceMap {
  const cleanSku = (sku || intel.sku || "").trim().toUpperCase();
  const productType = detectProductType(cleanSku, intel.card?.product?.category, intel.card?.technicalSpecs?.deviceType);

  const verifiedFacts: string[] = [];
  const technicalImplications: string[] = [];
  const commercialFacts: string[] = [];
  const unknownFacts: string[] = [];
  const claimsNotAllowed: string[] = [];

  // Mapear specs verificadas
  if (intel.card?.technicalSpecs?.ports?.length) {
    verifiedFacts.push(`Puertos: ${intel.card.technicalSpecs.ports.join(", ")}`);
    technicalImplications.push("Permite tasa de transferencia directa sin estrangulamiento de velocidad.");
  }
  if (intel.card?.technicalSpecs?.standards?.length) {
    verifiedFacts.push(`Estándares: ${intel.card.technicalSpecs.standards.join(", ")}`);
  }
  if (intel.card?.technicalSpecs?.powerRequirements) {
    verifiedFacts.push(`Alimentación: ${intel.card.technicalSpecs.powerRequirements}`);
  }

  // Hechos comerciales verificados de EcomSpain
  commercialFacts.push("Garantía oficial y soporte preventa directo de ingeniería EcomSpain.");
  commercialFacts.push("Consultar tarifa distribuidor y condiciones por volumen en ecomshop.es con entrega 24/48h.");

  // Prohibiciones de invención (Claims Not Allowed)
  claimsNotAllowed.push("No afirmar márgenes de beneficio o porcentajes de rentabilidad comercial no documentados.");
  claimsNotAllowed.push("No inventar precios numéricos en euros.");
  claimsNotAllowed.push("No atribuir especificaciones de Wi-Fi 7 / 802.11be a switches, cables DAC o gateways exclusivamente cableados.");
  claimsNotAllowed.push("No mencionar marcas o modelos de productos no solicitados (anti-contaminación).");
  claimsNotAllowed.push("No crear competidores imaginarios con nombres genéricos tipo 'Alternativa Comercial Genérica'.");

  if (productType === "DAC") {
    claimsNotAllowed.push("No afirmar que un cable pasivo DAC de 3m funciona para tiradas de más de 7 metros o interconexión de edificios.");
    unknownFacts.push("Latencia exacta por debajo de 0.1ns en entornos de alta interferencia EMI sin apantallamiento.");
  } else if (productType === "ACCESS_POINT") {
    claimsNotAllowed.push("No afirmar que el punto de acceso funciona sin switch de conmutación ascendente PoE.");
  }

  return {
    sku: cleanSku,
    productType,
    verifiedFacts,
    technicalImplications,
    commercialFacts,
    unknownFacts,
    claimsNotAllowed
  };
}
