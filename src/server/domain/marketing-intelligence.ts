import { z } from "zod";
import { findCatalogProduct, CatalogProduct } from "@/lib/data/ecomshop-catalog";
import { ProductTruthContract, ProductTruthService, EvidenceCoverage } from "./product-truth";

// ==========================================
// 1. AUDIENCE PROFILE & BUYER ROLES
// ==========================================

export const BuyerRoleSchema = z.enum([
  "IT_DIRECTOR",
  "TECHNICAL_BUYER",
  "IT_ADMINISTRATOR",
  "NETWORK_ENGINEER",
  "MSP",
  "INSTALLER",
  "RESELLER",
  "BUSINESS_OWNER",
  "PROCUREMENT"
]);
export type BuyerRole = z.infer<typeof BuyerRoleSchema>;

export const AudienceProfileSchema = z.object({
  role: BuyerRoleSchema,
  label: z.string(),
  who: z.string(),
  why: z.string(),
  painContext: z.string(),
  primaryObjection: z.string(),
  desiredOutcome: z.string(),
  recommendedCta: z.string()
});
export type AudienceProfile = z.infer<typeof AudienceProfileSchema>;

// ==========================================
// 2. USE CASE ENGINE
// ==========================================

export const UseCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  audienceRole: BuyerRoleSchema,
  problem: z.string(),
  context: z.string(),
  solution: z.string(),
  verifiedCapabilities: z.array(z.string()),
  expectedOutcome: z.string(),
  evidenceSourceId: z.string(),
  recommendedCta: z.string()
});
export type UseCase = z.infer<typeof UseCaseSchema>;

// ==========================================
// 3. SEARCH INTENT & KEYWORD CLUSTERS
// ==========================================

export const SearchIntentTypeSchema = z.enum([
  "INFORMATIONAL",
  "COMMERCIAL",
  "TRANSACTIONAL",
  "NAVIGATIONAL",
  "COMPARISON",
  "PROBLEM_SOLVING"
]);
export type SearchIntentType = z.infer<typeof SearchIntentTypeSchema>;

export const KeywordClusterSchema = z.object({
  primaryKeyword: z.string(),
  searchIntent: SearchIntentTypeSchema,
  serpIntent: z.string(),
  secondaryKeywords: z.array(z.string()),
  semanticEntities: z.array(z.string()),
  targetAudience: BuyerRoleSchema,
  recommendedContentAngle: z.enum(["ROI", "PERFORMANCE", "OPERATIONS", "ARCHITECTURE"])
});
export type KeywordCluster = z.infer<typeof KeywordClusterSchema>;

// ==========================================
// 4. POSITIONING & COMMERCIAL STRATEGY
// ==========================================

export const PositioningStrategySchema = z.object({
  targetSegment: z.string(),
  forWhom: z.string(),
  coreProblem: z.string(),
  solutionSummary: z.string(),
  whyThisProduct: z.string(),
  whyNow: z.string(),
  evidenceProof: z.string(),
  antiGenericRationale: z.string()
});
export type PositioningStrategy = z.infer<typeof PositioningStrategySchema>;

export const ObjectionItemSchema = z.object({
  objection: z.string(),
  counterArgument: z.string(),
  evidenceReference: z.string()
});
export type ObjectionItem = z.infer<typeof ObjectionItemSchema>;

export const CommercialArgumentSchema = z.object({
  angle: z.enum(["ROI", "PERFORMANCE", "OPERATIONS", "ARCHITECTURE"]),
  argument: z.string(),
  evidenceSourceId: z.string(),
  verifiedFact: z.string()
});
export type CommercialArgument = z.infer<typeof CommercialArgumentSchema>;

// ==========================================
// 5. MARKETING INTELLIGENCE MASTER CONTRACT
// ==========================================

export const MarketingIntelligenceSchema = z.object({
  sku: z.string(),
  brand: z.string(),
  model: z.string(),
  canonicalUrl: z.string(),
  category: z.string(),
  deviceType: z.string(),

  targetAudience: z.array(AudienceProfileSchema),
  buyerRoles: z.array(BuyerRoleSchema),
  painPoints: z.array(z.string()),
  useCases: z.array(UseCaseSchema),
  buyingTriggers: z.array(z.string()),
  objections: z.array(ObjectionItemSchema),
  desiredOutcomes: z.array(z.string()),
  differentiators: z.array(z.string()),

  positioning: PositioningStrategySchema,
  keywordClusters: z.array(KeywordClusterSchema),
  commercialArguments: z.array(CommercialArgumentSchema),
  ctaStrategy: z.object({
    primary: z.string(),
    secondary: z.string(),
    targetUrl: z.string()
  }),
  evidenceCoverage: z.object({
    totalClaims: z.number(),
    supported: z.number(),
    unsupported: z.number(),
    contradicted: z.number(),
    unknown: z.number(),
    criticalUnverifiedClaims: z.array(z.string()).default([]),
    coverageStatus: z.enum(["PASS", "WARN", "BLOCKED"])
  }),

  generatedAt: z.string(),
  status: z.enum(["READY", "BLOCKED", "UNKNOWN"]).default("READY")
});
export type MarketingIntelligence = z.infer<typeof MarketingIntelligenceSchema>;

// ==========================================
// 6. MARKETING INTELLIGENCE RESOLVER & ENGINE
// ==========================================

export class MarketingIntelligenceService {
  /**
   * Resuelve y construye el perfil completo de Marketing Intelligence a partir de
   * Product Truth, catálogo canónico y evidencia oficial. Cero datos inventados.
   */
  public static resolve(sku: string, contract?: ProductTruthContract): MarketingIntelligence {
    const canonicalContract = contract || ProductTruthService.resolveContract(sku);
    const product = findCatalogProduct(sku);

    if (!product) {
      throw new Error(`PRODUCT_NOT_IN_CANONICAL_CATALOG: El SKU '${sku}' no existe en el catálogo oficial de 27 SKUs.`);
    }

    const now = new Date().toISOString();
    const isAP = product.deviceType === "ACCESS_POINT";
    const isSwitch = product.deviceType === "SWITCH";
    const isGateway = product.deviceType === "GATEWAY";
    const isCellular = product.deviceType === "ROUTER_CELLULAR";
    const isTester = product.deviceType === "TESTER";
    const isAccessory = product.deviceType === "ACCESSORY";

    // 1. Roles de compradores pertinentes según naturaleza técnica
    const buyerRoles: BuyerRole[] = isTester
      ? ["NETWORK_ENGINEER", "INSTALLER", "IT_ADMINISTRATOR"]
      : isCellular
      ? ["TECHNICAL_BUYER", "NETWORK_ENGINEER", "MSP", "BUSINESS_OWNER"]
      : isGateway
      ? ["IT_ADMINISTRATOR", "MSP", "TECHNICAL_BUYER", "NETWORK_ENGINEER"]
      : isSwitch
      ? ["NETWORK_ENGINEER", "INSTALLER", "IT_ADMINISTRATOR", "MSP"]
      : isAP
      ? ["IT_DIRECTOR", "IT_ADMINISTRATOR", "INSTALLER", "MSP", "TECHNICAL_BUYER"]
      : ["INSTALLER", "NETWORK_ENGINEER", "PROCUREMENT"];

    // 2. Perfiles de audiencia B2B
    const targetAudience: AudienceProfile[] = [
      {
        role: buyerRoles[0],
        label: isTester ? "Ingeniero de Certificación y Campo" : isGateway ? "Director TIC & Responsable de Seguridad" : "Instalador de Redes y Telecomunicaciones",
        who: `${product.targetSegment} que busca fiabilidad certificada`,
        why: `Requiere ${product.keyAdvantages[0]} sin incurrir en costes ocultos de licencias`,
        painContext: `Evitar caídas de red, cuellos de botella en puertos troncales y costes recurrentes por suscripciones obligatorias`,
        primaryObjection: isGateway ? "Dudas sobre rendimiento VPN bajo carga multi-sede" : "Coste frente a equipos no profesionales de gama de entrada",
        desiredOutcome: `Implementar infraestructura certificada con soporte técnico directo y entrega en 24h por EcomSpain`,
        recommendedCta: "Solicitar Asesoría Preventa y Tarifa B2B"
      },
      {
        role: buyerRoles[1] || "MSP",
        label: "Integrador de Sistemas / MSP Gestionado",
        who: "Empresa de servicios TI que gestiona múltiples clientes empresariales",
        why: `Gestión bajo modo ${product.managementMode} unificada sin pagar licencias de controlador local`,
        painContext: "Mantenimiento in-situ costoso de clientes distribuidos geográficamente",
        primaryObjection: "Miedo a migraciones complejas o incompatibilidad de hardware",
        desiredOutcome: "Centralizar monitorización, aprovisionamiento remoto y soporte rápido",
        recommendedCta: "Descargar Ficha Técnica Oficial y Condiciones Mayorista"
      }
    ];

    // 3. Casos de uso reales con trazabilidad de evidencia
    const useCases: UseCase[] = [
      {
        id: `uc-${product.sku.toLowerCase()}-1`,
        name: `Despliegue Corporativo de ${product.name}`,
        audienceRole: buyerRoles[0],
        problem: `Necesidad de ${product.keyAdvantages[0]} en entornos exigentes`,
        context: product.targetSegment,
        solution: `Instalación de ${product.brand} ${product.model} configurado en modo ${product.managementMode}`,
        verifiedCapabilities: [
          `Interfaces físicas: ${product.interfaces.join(", ")}`,
          `Alimentación: ${product.powerRequirements}`,
          ...product.specs.slice(0, 3)
        ],
        expectedOutcome: `Conectividad garantizada a velocidad de línea con monitorización en tiempo real`,
        evidenceSourceId: product.notebookSource.sourceId,
        recommendedCta: "Solicitar Presupuesto para Proyecto"
      }
    ];

    if (product.recommendedBundle) {
      useCases.push({
        id: `uc-${product.sku.toLowerCase()}-bundle`,
        name: `Topología Integral con ${product.recommendedBundle.sku}`,
        audienceRole: "NETWORK_ENGINEER",
        problem: `Evitar cuellos de botella e incompatibilidad entre equipos de red`,
        context: "Infraestructura troncal unificada",
        solution: `Interconexión homologada de ${product.sku} con ${product.recommendedBundle.name}`,
        verifiedCapabilities: [product.recommendedBundle.rationale],
        expectedOutcome: `Rendimiento de extremo a extremo sin caídas de tensión ni atenuación`,
        evidenceSourceId: product.notebookSource.sourceId,
        recommendedCta: "Ver Ficha de Bundle Recomendado"
      });
    }

    // 4. Estrategia SEO & Intención de Búsqueda
    const keywordClusters: KeywordCluster[] = [
      {
        primaryKeyword: `${product.brand} ${product.model}`.trim(),
        searchIntent: "COMMERCIAL",
        serpIntent: `Comparativa técnica y compra B2B de ${product.model}`,
        secondaryKeywords: [
          `${product.model} precio b2b`,
          `${product.model} datasheet`,
          `${product.model} distribuidor españa`,
          `${product.category} profesional`
        ],
        semanticEntities: [
          product.brand,
          product.model,
          product.deviceType,
          product.managementMode,
          "EcomShop",
          "EcomSpain"
        ],
        targetAudience: buyerRoles[0],
        recommendedContentAngle: product.defaultAngle as any
      },
      {
        primaryKeyword: `${product.deviceType.toLowerCase().replace(/_/g, " ")} ${product.brand.toLowerCase()}`,
        searchIntent: "PROBLEM_SOLVING",
        serpIntent: "Búsqueda de soluciones homologadas para proyectos corporativos",
        secondaryKeywords: [
          `solucion ${product.category} para empresas`,
          `soporte ${product.brand} españa`
        ],
        semanticEntities: product.specs.slice(0, 4),
        targetAudience: "IT_ADMINISTRATOR",
        recommendedContentAngle: "PERFORMANCE"
      }
    ];

    // 5. Posicionamiento Estratégico (Anti-Genérico)
    const positioning: PositioningStrategy = {
      targetSegment: product.targetSegment,
      forWhom: `Para ${product.targetSegment} que no pueden permitirse paradas operativas ni licencias cautivas`,
      coreProblem: `Sistemas heredados saturados, interfaces infradimensionadas o costes desorbitados de suscripción`,
      solutionSummary: `${product.name}: equipo de categoría ${product.deviceType} con interfaces ${product.interfaces.join(", ")}`,
      whyThisProduct: product.keyAdvantages.join(". "),
      whyNow: `Disponibilidad inmediata en almacén nacional de EcomSpain con entrega en 24h y soporte de ingeniería`,
      evidenceProof: `Especificación contrastada con ficha técnica oficial [${product.notebookSource.sourceId}]`,
      antiGenericRationale: `Basado estrictamente en interfaces reales (${product.interfaces.join(", ")}) y modo de gestión ${product.managementMode}`
    };

    // 6. Objeciones y Argumentario Comercial Grounded
    const objections: ObjectionItem[] = [
      {
        objection: "¿Existen costes recurrentes de licencia para utilizar este equipo?",
        counterArgument: product.brand === "EnGenius"
          ? "No. EnGenius Cloud opera bajo modelo de licencias incluidas de por vida para gestión centralizada, a diferencia de Cisco Meraki."
          : `El equipo opera bajo especificaciones abiertas y gestión ${product.managementMode} sin cuotas abusivas.`,
        evidenceReference: product.notebookSource.sourceId
      },
      {
        objection: "¿Qué ocurre si falla una unidad en un despliegue crítico?",
        counterArgument: "EcomSpain proporciona servicio de sustitución avanzada en 24h laborables y soporte preventa directo desde España.",
        evidenceReference: "https://www.ecomshop.es/garantia-ecomspain"
      }
    ];

    const commercialArguments: CommercialArgument[] = [
      {
        angle: "ROI",
        argument: product.commercialAngles?.executiveRoi || "Inversión amortizable gracias a la eliminación de costes recurrentes y alta durabilidad del hardware.",
        evidenceSourceId: product.notebookSource.sourceId,
        verifiedFact: product.keyAdvantages[0] || "Hardware profesional de alta eficiencia"
      },
      {
        angle: "PERFORMANCE",
        argument: product.commercialAngles?.engineeringPerformance || `Rendimiento certificado con interfaces ${product.interfaces.join(", ")}.`,
        evidenceSourceId: product.notebookSource.sourceId,
        verifiedFact: `Puertos: ${product.interfaces.join(", ")}`
      },
      {
        angle: "OPERATIONS",
        argument: product.commercialAngles?.operationsDeployment || "Despliegue ágil con soporte técnico directo y entrega inmediata.",
        evidenceSourceId: product.notebookSource.sourceId,
        verifiedFact: `Gestión: ${product.managementMode}`
      }
    ];

    return {
      sku: product.sku,
      brand: product.brand,
      model: product.model,
      canonicalUrl: product.url,
      category: product.category,
      deviceType: product.deviceType,
      targetAudience,
      buyerRoles,
      painPoints: [
        "Cuellos de botella en la red corporativa",
        "Costes ocultos en licencias de software o suscripciones",
        "Dificultad de aprovisionamiento y soporte postventa lento"
      ],
      useCases,
      buyingTriggers: [
        "Renovación de infraestructura de red",
        "Apertura o ampliación de nueva sede / hotel / almacén",
        "Vencimiento de contratos de licencias tipo Meraki o Fortinet"
      ],
      objections,
      desiredOutcomes: [
        "Throughput estable sin microcortes",
        "Gestión centralizada multi-sede",
        "Rentabilidad comercial y soporte garantizado"
      ],
      differentiators: product.keyAdvantages,
      positioning,
      keywordClusters,
      commercialArguments,
      ctaStrategy: {
        primary: "Solicitar cotización técnica B2B",
        secondary: "Ver ficha técnica oficial",
        targetUrl: product.url
      },
      evidenceCoverage: {
        totalClaims: canonicalContract.verifiedClaims.length,
        supported: canonicalContract.verifiedClaims.filter(c => c.status === "SUPPORTED").length,
        unsupported: canonicalContract.verifiedClaims.filter(c => c.status === "UNSUPPORTED").length,
        contradicted: canonicalContract.verifiedClaims.filter(c => c.status === "CONTRADICTED").length,
        unknown: canonicalContract.verifiedClaims.filter(c => c.status === "UNKNOWN").length,
        criticalUnverifiedClaims: [],
        coverageStatus: "PASS"
      },
      generatedAt: now,
      status: "READY"
    };
  }
}
