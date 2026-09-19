import { ContentRepository, ProductRepository } from "@/server/repositories";
import { ProductEntity, ContentItem } from "@/server/domain/types";
import { STAR_PRODUCTS } from "../knowledge";
import { ProductBrainService, ProductBrainProfile } from "./product-brain";
import { OFFICIAL_NOTEBOOK } from "../notebooklm";
import { EditorialControls, BusinessGoal } from "../types/editorial-controls";

export interface OpportunityScoreBreakdown {
  stockScore: number;       // 0-25: Disponibilidad inmediata en almacén EcomSpain
  contentGapScore: number;  // 0-25: Días sin contenido reciente o sin campañas activas
  marketTrendScore: number; // 0-25: Demanda de mercado (Wi-Fi 7, 2.5G/10G, PoE++)
  bundleScore: number;      // 0-25: Potencial de venta cruzada de accesorios y switches
  editorialScore?: number;  // 0-20: Ajuste dinámico por sector y controles editoriales
  totalScore: number;       // 0-100
}

export interface NotebookCitation {
  id: string;
  title: string;
  type: string;
  url?: string;
  rationale: string;
}

export interface OpportunityAlternative {
  sku: string;
  model: string;
  category: string;
  actionTitle: string;
  recommendedAngle: "ROI" | "PERFORMANCE" | "OPERATIONS";
  pitchPreview: string;
  reason: string;
}

export interface ProductOpportunityRecord {
  id: string;
  sku: string;
  brand: string;
  model: string;
  category: string;
  url: string;
  pricingCondition: string;
  priceEur?: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  scores: OpportunityScoreBreakdown;
  actionTitle: string;
  recommendedAngle: "ROI" | "PERFORMANCE" | "OPERATIONS";
  targetSegment: string;
  businessGoal?: BusinessGoal;
  narrativeAnchor?: {
    pitch30s: string;
    commercialObjection: string;
    counterArgument: string;
    targetSegment: string;
  };
  suggestedBundle: {
    mainSku: string;
    accessorySku: string;
    accessoryName: string;
    rationale: string;
  };
  groundedClaimsPreview: string[];
  productBrainProfile?: ProductBrainProfile;
  notebookCitations?: NotebookCitation[];
  editorialFit?: string;
  alternativeOptions?: OpportunityAlternative[];
}

export interface OpportunityRadarFilterOptions {
  limitCount?: number;
  businessGoal?: BusinessGoal;
  editorialControls?: EditorialControls;
  excludedSkus?: string[];
  preferredAngle?: "ROI" | "PERFORMANCE" | "OPERATIONS";
  customDirective?: string;
  replaceSku?: string;
  shuffleSeed?: number;
}

export class OpportunityRadarService {
  private contentRepo = new ContentRepository();
  private productRepo = new ProductRepository();
  private productBrain = new ProductBrainService();

  private readonly MASTER_CATALOG_DEFINITIONS: Array<{
    sku: string;
    model: string;
    category: "wifi" | "switches" | "gateways" | "fibra" | "accesorios";
    brand: string;
    priceEur: number;
    url: string;
    actionTitle: string;
    targetSegment: string;
    defaultAngle: "ROI" | "PERFORMANCE" | "OPERATIONS";
    suggestedBundle: {
      accessorySku: string;
      accessoryName: string;
      rationale: string;
    };
    sourceIds: string[];
    sectorAffinity: Record<string, number>;
    businessGoalAffinity: Record<BusinessGoal, number>;
  }> = [
    {
      sku: "ECW536",
      model: "ECW536 Cloud Tri-Band Wi-Fi 7",
      category: "wifi",
      brand: "EnGenius",
      priceEur: 599,
      url: "https://www.ecomshop.es/engenius-ecw536",
      actionTitle: "Oportunidad Wi-Fi 7 Tri-Band: Despliegue de Alta Densidad ECW536",
      targetSegment: "Oficinas Corporativas, Auditorios y Sedes Centrales",
      defaultAngle: "PERFORMANCE",
      suggestedBundle: {
        accessorySku: "ECS2512FP",
        accessoryName: "Switch Cloud Multi-Gigabit 2.5G PoE++",
        rationale: "Puerto 10GbE del AP alimentado a 60W PoE++ 802.3bt para eliminar cuellos de botella."
      },
      sourceIds: ["src-1", "src-4", "src-8"],
      sectorAffinity: { ENTERPRISE_OFFICE: 25, EDUCATION_CAMPUS: 24, HOSPITALITY: 18, LOGISTICS_INDUSTRY: 15 },
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 25,
        WIFI7_MULTIGIG_EXPANSION: 30,
        HOSPITALITY_SOLUTIONS: 18,
        SWITCHING_POE_BACKBONE: 15,
        STOCK_CLEARANCE_PROMO: 10
      }
    },
    {
      sku: "ECW510",
      model: "ECW510 Cloud Dual-Band Wi-Fi 7",
      category: "wifi",
      brand: "EnGenius",
      priceEur: 389,
      url: "https://www.ecomshop.es/engenius-ecw510",
      actionTitle: "Oportunidad Wi-Fi 7 Eficiente: ECW510 con Aprovisionamiento QR 2min",
      targetSegment: "Integradores de Redes Corporativas y Pymes Avanzadas",
      defaultAngle: "OPERATIONS",
      suggestedBundle: {
        accessorySku: "ECS2512FP",
        accessoryName: "Switch Cloud Multi-Gigabit 2.5G PoE++",
        rationale: "Uplink Multi-Gigabit 2.5G garantizado para tráfico concurrente y videoconferencias."
      },
      sourceIds: ["src-1", "src-5", "src-18"],
      sectorAffinity: { ENTERPRISE_OFFICE: 22, HOSPITALITY: 23, LOGISTICS_INDUSTRY: 18, EDUCATION_CAMPUS: 19 },
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 24,
        WIFI7_MULTIGIG_EXPANSION: 28,
        HOSPITALITY_SOLUTIONS: 22,
        SWITCHING_POE_BACKBONE: 14,
        STOCK_CLEARANCE_PROMO: 24
      }
    },
    {
      sku: "ECW526",
      model: "ECW526 Wi-Fi 7 AP Interior Compacto",
      category: "wifi",
      brand: "EnGenius",
      priceEur: 299,
      url: "https://www.ecomshop.es/engenius-ecw526",
      actionTitle: "Oportunidad Hospitality: Cobertura In-Room y Despachos con ECW526",
      targetSegment: "Hoteles, Residencias y Despachos Ejecutivos",
      defaultAngle: "ROI",
      suggestedBundle: {
        accessorySku: "ECS1528FP",
        accessoryName: "Switch Cloud PoE+ 24 Puertos (410W)",
        rationale: "Alimentación centralizada para decenas de APs por planta sin ruido y con bajo consumo."
      },
      sourceIds: ["src-2", "src-4", "src-11"],
      sectorAffinity: { HOSPITALITY: 25, ENTERPRISE_OFFICE: 20, EDUCATION_CAMPUS: 22, LOGISTICS_INDUSTRY: 12 },
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 22,
        WIFI7_MULTIGIG_EXPANSION: 20,
        HOSPITALITY_SOLUTIONS: 30,
        SWITCHING_POE_BACKBONE: 12,
        STOCK_CLEARANCE_PROMO: 25
      }
    },
    {
      sku: "ECW546",
      model: "ECW546 Outdoor Wi-Fi 7 IP67",
      category: "wifi",
      brand: "EnGenius",
      priceEur: 649,
      url: "https://www.ecomshop.es/engenius-ecw546-outdoor",
      actionTitle: "Oportunidad Industrial & Terrazas: Cobertura Robusta IP67 con ECW546",
      targetSegment: "Naves Logísticas, Campings, Terrazas y Zonas Portuarias",
      defaultAngle: "OPERATIONS",
      suggestedBundle: {
        accessorySku: "ECS2512FP",
        accessoryName: "Switch Cloud Multi-Gigabit PoE++ 60W",
        rationale: "Protección contra sobretensiones y alimentación PoE++ para exteriores con clima extremo."
      },
      sourceIds: ["src-3", "src-10", "src-18"],
      sectorAffinity: { LOGISTICS_INDUSTRY: 25, HOSPITALITY: 24, EDUCATION_CAMPUS: 18, ENTERPRISE_OFFICE: 14 },
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 23,
        WIFI7_MULTIGIG_EXPANSION: 22,
        HOSPITALITY_SOLUTIONS: 29,
        SWITCHING_POE_BACKBONE: 14,
        STOCK_CLEARANCE_PROMO: 12
      }
    },
    {
      sku: "ECS2512FP",
      model: "ECS2512FP Multi-Gigabit PoE++ (8x 2.5G + 4x 10G SFP+)",
      category: "switches",
      brand: "EnGenius",
      priceEur: 689,
      url: "https://www.ecomshop.es/engenius-ecs2512fp",
      actionTitle: "Oportunidad Switching Multi-Gigabit: ECS2512FP para Troncales Wi-Fi 7",
      targetSegment: "Instaladores IT y Arquitectos de Infraestructura",
      defaultAngle: "PERFORMANCE",
      suggestedBundle: {
        accessorySku: "SFP-10G-SR-KIT",
        accessoryName: "Transceptores 10G SFP+ y Latiguillo OM4",
        rationale: "Backbone de fibra de 10 Gbps para interconexión de racks sin saturación."
      },
      sourceIds: ["src-8", "src-10", "src-14"],
      sectorAffinity: { ENTERPRISE_OFFICE: 24, LOGISTICS_INDUSTRY: 23, HOSPITALITY: 21, EDUCATION_CAMPUS: 23 },
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 25,
        WIFI7_MULTIGIG_EXPANSION: 28,
        HOSPITALITY_SOLUTIONS: 20,
        SWITCHING_POE_BACKBONE: 30,
        STOCK_CLEARANCE_PROMO: 16
      }
    },
    {
      sku: "ECS1528FP",
      model: "ECS1528FP Cloud PoE+ (24 Puertos 410W + 4x 10G)",
      category: "switches",
      brand: "EnGenius",
      priceEur: 549,
      url: "https://www.ecomshop.es/engenius-ecs1528fp",
      actionTitle: "Oportunidad Switching 24 Puertos: ECS1528FP 410W con 0€ Licencias",
      targetSegment: "Integradores de Videovigilancia IP y Redes Medianas",
      defaultAngle: "ROI",
      suggestedBundle: {
        accessorySku: "SFP-10G-SR-KIT",
        accessoryName: "Kit Transceptores Ópticos 10G SFP+ y Fibra OM4",
        rationale: "Troncal 10G entre armarios secundarios con PoE+ simultáneo para cámaras y telefonía."
      },
      sourceIds: ["src-7", "src-11", "src-13"],
      sectorAffinity: { HOSPITALITY: 24, ENTERPRISE_OFFICE: 23, LOGISTICS_INDUSTRY: 22, EDUCATION_CAMPUS: 24 },
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 24,
        WIFI7_MULTIGIG_EXPANSION: 18,
        HOSPITALITY_SOLUTIONS: 27,
        SWITCHING_POE_BACKBONE: 29,
        STOCK_CLEARANCE_PROMO: 28
      }
    },
    {
      sku: "ECS5512FP",
      model: "ECS5512FP Switch Agregación Fibra 10G",
      category: "switches",
      brand: "EnGenius",
      priceEur: 1190,
      url: "https://www.ecomshop.es/engenius-ecs5512fp",
      actionTitle: "Oportunidad Core 10G: Agregación Troncal ECS5512FP para Campus",
      targetSegment: "Directores TIC y MSPs Multi-Edificio",
      defaultAngle: "PERFORMANCE",
      suggestedBundle: {
        accessorySku: "SFP-10G-SR-KIT",
        accessoryName: "Módulos Transceptores 10G SFP+ Multimodo",
        rationale: "Distribución de red de fibra óptica inter-edificios con redundancia STP/LACP."
      },
      sourceIds: ["src-9", "src-14", "src-15"],
      sectorAffinity: { EDUCATION_CAMPUS: 25, ENTERPRISE_OFFICE: 24, LOGISTICS_INDUSTRY: 20, HOSPITALITY: 19 },
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 21,
        WIFI7_MULTIGIG_EXPANSION: 20,
        HOSPITALITY_SOLUTIONS: 14,
        SWITCHING_POE_BACKBONE: 30,
        STOCK_CLEARANCE_PROMO: 10
      }
    },
    {
      sku: "ESG610",
      model: "ESG610 Gateway SD-WAN Cloud Security",
      category: "gateways",
      brand: "EnGenius",
      priceEur: 479,
      url: "https://www.ecomshop.es/engenius-esg610",
      actionTitle: "Oportunidad Cloud Total: Gateway ESG610 + VPN Multi-Sede sin Cuotas",
      targetSegment: "Responsables de Seguridad y Directores TIC",
      defaultAngle: "ROI",
      suggestedBundle: {
        accessorySku: "ECS1528FP",
        accessoryName: "Switch Cloud PoE+ 24 Puertos",
        rationale: "Topología EnGenius Cloud unificada: Firewall + Switching + Wi-Fi en un solo panel."
      },
      sourceIds: ["src-6", "src-4", "src-11"],
      sectorAffinity: { ENTERPRISE_OFFICE: 25, HOSPITALITY: 22, EDUCATION_CAMPUS: 22, LOGISTICS_INDUSTRY: 21 },
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 22,
        WIFI7_MULTIGIG_EXPANSION: 18,
        HOSPITALITY_SOLUTIONS: 24,
        SWITCHING_POE_BACKBONE: 16,
        STOCK_CLEARANCE_PROMO: 15
      }
    },
    {
      sku: "SFP-10G-SR-KIT",
      model: "Kit Troncal Fibra 10G SFP+ y Cable OM4",
      category: "fibra",
      brand: "EcomSpain",
      priceEur: 89,
      url: "https://www.ecomshop.es/transceptores-sfp-10g",
      actionTitle: "Campaña Flash Conectividad: Kit Troncal Fibra 10G SFP+ Certificado",
      targetSegment: "Instaladores Telecomunicaciones Tipo A / Cableado Estructurado",
      defaultAngle: "OPERATIONS",
      suggestedBundle: {
        accessorySku: "ECS1528FP",
        accessoryName: "Switch EnGenius Cloud PoE+ 24 Puertos",
        rationale: "Garantiza el interlink a 10 Gbps entre racks sin atenuación ni errores CRC."
      },
      sourceIds: ["src-14", "src-17", "src-18"],
      sectorAffinity: { LOGISTICS_INDUSTRY: 23, ENTERPRISE_OFFICE: 22, HOSPITALITY: 20, EDUCATION_CAMPUS: 22 },
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 22,
        WIFI7_MULTIGIG_EXPANSION: 20,
        HOSPITALITY_SOLUTIONS: 18,
        SWITCHING_POE_BACKBONE: 30,
        STOCK_CLEARANCE_PROMO: 26
      }
    },
    {
      sku: "POE30Gv2",
      model: "POE30Gv2 Inyector PoE+ Gigabit 30W",
      category: "accesorios",
      brand: "EnGenius",
      priceEur: 39,
      url: "https://www.ecomshop.es/guias-poe",
      actionTitle: "Oportunidad Despliegue Rápido: Inyector POE30Gv2 para APs Individuales",
      targetSegment: "Instaladores de Telecomunicaciones y Reparaciones de Urgencia",
      defaultAngle: "OPERATIONS",
      suggestedBundle: {
        accessorySku: "ECW526",
        accessoryName: "AP Wi-Fi 7 Interior Compacto",
        rationale: "Permite instalar puntos de acceso en salas sin necesidad de cambiar el switch existente."
      },
      sourceIds: ["src-10", "src-18", "src-19"],
      sectorAffinity: { HOSPITALITY: 21, ENTERPRISE_OFFICE: 20, EDUCATION_CAMPUS: 18, LOGISTICS_INDUSTRY: 19 },
      businessGoalAffinity: {
        ALL_OPPORTUNITIES: 20,
        WIFI7_MULTIGIG_EXPANSION: 12,
        HOSPITALITY_SOLUTIONS: 22,
        SWITCHING_POE_BACKBONE: 15,
        STOCK_CLEARANCE_PROMO: 30
      }
    }
  ];

  /**
   * Calcula el radar de oportunidades diarias clasificadas por puntuación algorítmica y controles editoriales
   */
  async getDailyOpportunities(
    optionsOrLimit: OpportunityRadarFilterOptions | number = 3
  ): Promise<ProductOpportunityRecord[]> {
    const options: OpportunityRadarFilterOptions =
      typeof optionsOrLimit === "number" ? { limitCount: optionsOrLimit } : optionsOrLimit;

    const limitCount = options.limitCount ?? 3;
    const controls = options.editorialControls;
    const excludedSkus = (options.excludedSkus || []).map(s => s.toUpperCase());
    const preferredAngle = options.preferredAngle;
    const customDirective = (options.customDirective || "").toLowerCase();
    const shuffleSeed = options.shuffleSeed || 0;

    // 1. Obtener catálogo base desde Firestore si existe
    let dbProducts: ProductEntity[] = [];
    try {
      dbProducts = await this.productRepo.listAll(50);
    } catch {
      dbProducts = [];
    }

    // 2. Historial de contenidos para cálculo de Content Gap
    let recentContents: ContentItem[] = [];
    try {
      recentContents = await this.contentRepo.listRecent(50);
    } catch {
      recentContents = [];
    }

    const scoredOpportunities: ProductOpportunityRecord[] = [];

    for (const def of this.MASTER_CATALOG_DEFINITIONS) {
      const skuUpper = def.sku.toUpperCase();

      // Descartar si está en la lista de exclusión temporal
      if (excludedSkus.includes(skuUpper)) {
        continue;
      }

      const dbProd = dbProducts.find(p => p.sku.toUpperCase() === skuUpper);
      const stockStatus = (dbProd?.stockStatus === "OUT_OF_STOCK" ? "OUT_OF_STOCK" : "IN_STOCK") as "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

      // A. Puntuación de Stock (0-25)
      let stockScore = 20;
      if (stockStatus === "IN_STOCK") stockScore = 25;
      else if (stockStatus === "LOW_STOCK") stockScore = 15;
      else stockScore = 0;

      // B. Puntuación de Content Gap (0-25)
      const contentMatches = recentContents.filter(c => {
        const fullTxt = `${c.title} ${c.slug || ""}`.toUpperCase();
        return fullTxt.includes(skuUpper);
      });

      let contentGapScore = 24;
      if (contentMatches.length > 0) {
        const latestTime = new Date(contentMatches[0].createdAt).getTime();
        const daysSince = Math.max(0, (Date.now() - latestTime) / (1000 * 60 * 60 * 24));
        if (daysSince < 3) contentGapScore = 5;
        else if (daysSince < 7) contentGapScore = 12;
        else if (daysSince < 14) contentGapScore = 18;
        else contentGapScore = 23;
      }

      // C. Puntuación de Tendencia Tecnológica (0-25)
      let marketTrendScore = 18;
      if (def.category === "wifi") {
        marketTrendScore = def.sku.includes("536") || def.sku.includes("546") ? 25 : 23;
      } else if (def.category === "switches") {
        marketTrendScore = def.sku.includes("2512") ? 25 : 22;
      } else if (def.category === "gateways") {
        marketTrendScore = 21;
      } else {
        marketTrendScore = 19;
      }

      // D. Puntuación de Bundling / Sinergia (0-25)
      let bundleScore = 22;
      if (def.suggestedBundle) bundleScore = 25;

      // E. Ajuste Dinámico por Controles Editoriales y Objetivo Comercial (Fase 10)
      let editorialScore = 10;
      let angle = preferredAngle || def.defaultAngle;
      let editorialFitReason = "Excelente alineación con el catálogo general de networking.";

      // 0. Ponderación por Objetivo de Negocio (BusinessGoal)
      const activeGoal: BusinessGoal = options.businessGoal || controls?.businessGoal || "ALL_OPPORTUNITIES";
      if (activeGoal !== "ALL_OPPORTUNITIES") {
        const goalScore = def.businessGoalAffinity[activeGoal] || 15;
        editorialScore += Math.round((goalScore / 30) * 8);
        if (activeGoal === "WIFI7_MULTIGIG_EXPANSION" && def.category === "wifi") {
          editorialFitReason = "Prioridad estratégica: Expansión de Wi-Fi 7 Multi-Gigabit.";
        } else if (activeGoal === "HOSPITALITY_SOLUTIONS" && (def.sku === "ECW526" || def.sku === "ECW546" || def.sku === "ECS1528FP")) {
          editorialFitReason = "Prioridad estratégica: Solución llave en mano para Hospitality y Hoteles.";
        } else if (activeGoal === "SWITCHING_POE_BACKBONE" && (def.category === "switches" || def.category === "fibra")) {
          editorialFitReason = "Prioridad estratégica: Infraestructura Switching PoE++ y Troncal 10G.";
        } else if (activeGoal === "STOCK_CLEARANCE_PROMO" && (def.sku === "POE30Gv2" || def.sku === "ECS1528FP" || def.sku === "ECW510")) {
          editorialFitReason = "Prioridad estratégica: Promoción de stock disponible y rotación inmediata.";
        }
      }

      if (controls) {
        // 1. Sector Objetivo
        const sector = controls.targetSector || "ENTERPRISE_OFFICE";
        const affinity = def.sectorAffinity[sector] || 15;
        editorialScore += Math.round((affinity / 25) * 6);

        // 2. Tono Editorial
        if (controls.editorialTone === "ENGINEERING_PREVENTA") {
          if (def.sku === "ECW536" || def.sku === "ECS2512FP" || def.sku === "ECS5512FP") {
            editorialScore += 4;
            angle = "PERFORMANCE";
            editorialFitReason = "Máxima densidad técnica (Wi-Fi 7 MLO, enlaces 10G y 802.3bt).";
          }
        } else if (controls.editorialTone === "C_LEVEL_TCO") {
          if (def.sku === "ECW536" || def.sku === "ECS1528FP" || def.sku === "ESG610") {
            editorialScore += 4;
            angle = "ROI";
            editorialFitReason = "Enfoque TCO y 0€ en licencias cloud recurrentes para compras.";
          }
        } else if (controls.editorialTone === "CHANNEL_INSTALLER") {
          if (def.sku === "ECW510" || def.sku === "ECW526" || def.sku === "POE30Gv2" || def.sku === "SFP-10G-SR-KIT") {
            editorialScore += 4;
            angle = "OPERATIONS";
            editorialFitReason = "Facilidad de puesta en marcha (QR 2min) y sustitución 24h EcomSpain.";
          }
        }

        // 3. Competidor Focus
        if (controls.competitorFocus === "MERAKI") {
          if (def.sourceIds.includes("src-4") || def.sourceIds.includes("src-11")) {
            editorialScore += 3;
            editorialFitReason += " Destaca ahorro 42% TCO y cero bloqueo de hardware vs Cisco Meraki.";
          }
        } else if (controls.competitorFocus === "UNIFI") {
          if (def.sourceIds.includes("src-12") || def.sourceIds.includes("src-18")) {
            editorialScore += 3;
            editorialFitReason += " Destaca soporte telefónico preventa directo y stock garantizado en España.";
          }
        } else if (controls.competitorFocus === "LEGACY_1G") {
          if (def.sku.includes("2512") || def.sku.includes("10G") || def.sku.includes("536")) {
            editorialScore += 3;
            editorialFitReason += " Resuelve cuellos de botella de cableado y switches antiguos de 1G.";
          }
        }

        // 4. Énfasis en Uplinks y Switching
        if (controls.emphasizeUplinkSwitching) {
          if (def.category === "switches" || def.sku === "SFP-10G-SR-KIT") {
            editorialScore += 3;
          }
        }

        // 5. Precios / Condiciones B2B
        if (controls.includePricing) {
          editorialScore += 2;
        }

        // 6. Directiva personalizada del usuario (si contiene palabras clave)
        if (customDirective) {
          const skuLower = def.sku.toLowerCase();
          const catLower = def.category.toLowerCase();
          const titleLower = def.actionTitle.toLowerCase();
          if (
            customDirective.includes(skuLower) ||
            customDirective.includes(catLower) ||
            customDirective.split(" ").some(w => w.length > 3 && titleLower.includes(w))
          ) {
            editorialScore += 6;
            editorialFitReason = `Satisface la directiva específica: "${customDirective}"`;
          }
        }
      }

      // Variación controlada para barajado cuando el usuario regenera
      const seedVariation = shuffleSeed > 0 ? ((skuUpper.charCodeAt(0) * shuffleSeed) % 5) - 2 : 0;

      const rawTotal = stockScore + contentGapScore + marketTrendScore + bundleScore + editorialScore + seedVariation;
      const totalScore = Math.min(100, Math.max(50, rawTotal));

      // Extraer citas de NotebookLM
      const notebookCitations: NotebookCitation[] = def.sourceIds.map(srcId => {
        const found = OFFICIAL_NOTEBOOK.sources.find(s => s.id === srcId);
        return {
          id: srcId,
          title: found ? found.title : `Fuente Documental ${srcId}`,
          type: found ? found.type : "datasheet",
          url: found?.url,
          rationale: found ? found.description : "Validación técnica en cuaderno maestro EcomShop."
        };
      });

      // Hilo conductor narrativo canónico
      const defaultPitch = `El equipo ${def.sku} se aprovisiona en 2 minutos con código QR desde el móvil. Cero cuotas de licencias y sustitución en 24h de EcomSpain si falla en obra.`;
      const defaultObjection = def.category === "wifi"
        ? "¿Es compatible con la red existente de mi cliente si usan otra marca (Cisco, Ubiquiti, MikroTik)?"
        : "¿Qué ventaja tiene frente a marcas con suscripción cloud obligatoria?";
      const defaultCounterArgument = def.category === "wifi"
        ? "Totalmente compatible mediante estándares abiertos IEEE 802.3 y VLANs 802.1Q. Permite una migración escalonada sede por sede sin cambiar la electrónica previa."
        : "Con EnGenius Cloud en EcomShop no hay suscripción obligatoria. Ahorro de hasta el 42% en TCO a 3 años frente a Cisco Meraki sin cuotas recurrentes.";

      scoredOpportunities.push({
        id: `opp-${def.sku.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        sku: def.sku,
        brand: def.brand,
        model: def.model,
        category: def.category,
        url: def.url,
        pricingCondition: "Tarifa Distribuidor B2B (Consultar en ecomshop.es)",
        priceEur: undefined, // Bloqueado: Regla B2B Fase 10 anti-alucinación
        stockStatus,
        scores: {
          stockScore,
          contentGapScore,
          marketTrendScore,
          bundleScore,
          editorialScore,
          totalScore
        },
        actionTitle: def.actionTitle,
        recommendedAngle: angle,
        targetSegment: def.targetSegment,
        businessGoal: activeGoal,
        narrativeAnchor: {
          pitch30s: defaultPitch,
          commercialObjection: defaultObjection,
          counterArgument: defaultCounterArgument,
          targetSegment: def.targetSegment
        },
        suggestedBundle: {
          mainSku: def.sku,
          accessorySku: def.suggestedBundle.accessorySku,
          accessoryName: def.suggestedBundle.accessoryName,
          rationale: def.suggestedBundle.rationale
        },
        groundedClaimsPreview: [
          `Stock físico garantizado con entrega en 24/48h desde almacén EcomSpain`,
          `Tarifa distribuidor profesional con margen protegido: consultar en ecomshop.es`,
          `Cero cuotas obligatorias con gestión nativa en EnGenius Cloud`
        ],
        notebookCitations,
        editorialFit: editorialFitReason
      });
    }

    // Ordenar por totalScore descendente
    scoredOpportunities.sort((a, b) => b.scores.totalScore - a.scores.totalScore);

    const topOpportunities = scoredOpportunities.slice(0, limitCount);
    const availablePool = scoredOpportunities.slice(limitCount);

    // Enriquecer cada oportunidad top con ProductBrain y sincronizar narrativeAnchor
    for (const opp of topOpportunities) {
      try {
        opp.productBrainProfile = await this.productBrain.getProductBrainProfile(opp.sku);
        if (opp.productBrainProfile?.buyerPersonas?.[0]?.pitchIn30Seconds) {
          opp.narrativeAnchor = {
            pitch30s: opp.productBrainProfile.buyerPersonas[0].pitchIn30Seconds,
            commercialObjection: opp.productBrainProfile.objectionLedger?.[0]?.objection || opp.narrativeAnchor!.commercialObjection,
            counterArgument: opp.productBrainProfile.objectionLedger?.[0]?.counterArgument || opp.narrativeAnchor!.counterArgument,
            targetSegment: opp.productBrainProfile.buyerPersonas[0].name || opp.targetSegment
          };
        }
      } catch {
        // Fallback silencioso
      }

      // Adjuntar alternativas de reemplazo basadas en el pool disponible
      opp.alternativeOptions = availablePool.slice(0, 3).map(alt => ({
        sku: alt.sku,
        model: alt.model,
        category: alt.category,
        actionTitle: alt.actionTitle,
        recommendedAngle: alt.recommendedAngle,
        pitchPreview: alt.suggestedBundle.rationale,
        reason: alt.editorialFit || "Alternativa con alta sinergia técnica en el catálogo"
      }));
    }

    return topOpportunities;
  }

  /**
   * Obtiene una alternativa directa para reemplazar una oportunidad específica que no convenza al usuario
   */
  async getReplacementOpportunity(
    rejectedSku: string,
    currentDisplayedSkus: string[],
    controls?: EditorialControls,
    customDirective?: string
  ): Promise<ProductOpportunityRecord | null> {
    const allExcluded = [...currentDisplayedSkus, rejectedSku];
    const results = await this.getDailyOpportunities({
      limitCount: 1,
      editorialControls: controls,
      excludedSkus: allExcluded,
      customDirective,
      shuffleSeed: Math.floor(Math.random() * 50) + 1
    });

    return results[0] || null;
  }
}
