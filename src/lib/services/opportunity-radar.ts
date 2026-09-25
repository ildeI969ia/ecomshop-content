import { ContentRepository, ProductRepository } from "@/server/repositories";
import { ProductEntity, ContentItem } from "@/server/domain/types";
import { ProductBrainService, ProductBrainProfile } from "./product-brain";
import { EditorialControls, BusinessGoal } from "../types/editorial-controls";
import { OFFICIAL_NOTEBOOK } from "../notebooklm";
import { ECOMSHOP_FULL_CATALOG, CatalogProduct } from "../data/ecomshop-catalog";


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

  /**
   * Catálogo unificado obtenido directamente desde la fuente canónica ECOMSHOP_FULL_CATALOG
   */
  private get MASTER_CATALOG_DEFINITIONS(): Array<{
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
    catalogItem: CatalogProduct;
  }> {
    return ECOMSHOP_FULL_CATALOG.map(item => {
      // 1. Título de acción dinámico si es genérico
      let dynamicActionTitle = item.actionTitle;
      if (!dynamicActionTitle || dynamicActionTitle.startsWith("Despliegue y Solución B2B con")) {
        if (item.deviceType === "ROUTER_CELLULAR" || item.category === "cellular") {
          dynamicActionTitle = `Conectividad Celular 4G/5G y Doble SIM para Flotas o M2M con ${item.model}`;
        } else if (item.deviceType === "ACCESS_POINT" || item.category === "wifi") {
          const isOutdoor = item.name.toLowerCase().includes("outdoor") || item.specs.some(s => s.toLowerCase().includes("ip67"));
          dynamicActionTitle = isOutdoor
            ? `Cobertura Wi-Fi Exterior IP67 y Alta Densidad con ${item.brand} ${item.model}`
            : `Cobertura Wi-Fi Corporativa y Roaming de Alta Densidad con ${item.brand} ${item.model}`;
        } else if (item.deviceType === "SWITCH" || item.category === "switches") {
          dynamicActionTitle = `Infraestructura de Conmutación Multi-Gigabit y PoE++ con ${item.brand} ${item.model}`;
        } else if (item.deviceType === "GATEWAY" || item.category === "gateways") {
          dynamicActionTitle = `Seguridad Perimetral, SD-WAN y VPN Corporativa con ${item.brand} ${item.model}`;
        } else if (item.deviceType === "TESTER" || item.category === "testers") {
          dynamicActionTitle = `Auditoría, Certificación de Red y Diagnóstico Preventa con ${item.brand} ${item.model}`;
        } else if (item.deviceType === "ACCESSORY" || item.category === "poe_injectors") {
          dynamicActionTitle = `Alimentación PoE Dedicada y Protección Eléctrica con ${item.brand} ${item.model}`;
        } else {
          dynamicActionTitle = `Solución de Networking B2B Homologada con ${item.brand} ${item.model}`;
        }
      }

      // 2. Bundle dinámico coherente si el bundle configurado es genérico SFP-10G-SR-KIT para productos incompatibles
      let accessorySku = item.bundleDetails?.sku || item.recommendedBundle.sku;
      let accessoryName = item.bundleDetails?.name || item.recommendedBundle.name || accessorySku;
      let rationale = item.bundleDetails?.rationale || item.recommendedBundle.rationale;

      if (accessorySku === "SFP-10G-SR-KIT" || rationale === "Accesorios e interconexión recomendados para este equipo.") {
        if (item.deviceType === "ROUTER_CELLULAR" || item.category === "cellular") {
          accessorySku = "ANT-4G-LTE-MAG";
          accessoryName = "Kit Antenas Celulares Magnéticas de Alta Ganancia 4G/LTE (SMA)";
          rationale = "Antenas exteriores de alta ganancia para maximizar la cobertura en entornos metálicos o remotos.";
        } else if (item.deviceType === "ACCESSORY" || item.category === "poe_injectors" || item.sku.startsWith("EPA")) {
          accessorySku = "PATCH-CAT6A-2M";
          accessoryName = "Latiguillo de Red Cat6A SFTP 500MHz Blindado (2m)";
          rationale = "Latiguillo apantallado homologado para transporte PoE sin pérdidas ni interferencias EMI.";
        } else if (item.deviceType === "ACCESS_POINT" || item.category === "wifi") {
          const reqPoe = item.poeType === "802.3bt" ? "EPA5006GAT" : "POE30Gv2";
          accessorySku = reqPoe;
          accessoryName = reqPoe === "EPA5006GAT" ? "Inyector Ultra PoE 60W Gigabit (EPA5006GAT)" : "Inyector PoE+ 30W Gigabit (POE30Gv2)";
          rationale = `Alimentación PoE dedicada para despliegue directo de APs en obra sin cambiar la electrónica previa.`;
        }
      }

      return {
        sku: item.sku,
        model: item.model,
        category: (item.category === "wifi" ? "wifi" :
                  item.category === "switches" ? "switches" :
                  item.category === "gateways" ? "gateways" :
                  item.category === "fibra" ? "fibra" : "accesorios") as "wifi" | "switches" | "gateways" | "fibra" | "accesorios",
        brand: item.brand,
        priceEur: item.priceEur,
        url: item.url,
        actionTitle: dynamicActionTitle,
        targetSegment: item.targetSegment,
        defaultAngle: item.defaultAngle,
        suggestedBundle: {
          accessorySku,
          accessoryName,
          rationale
        },
        sourceIds: [item.notebookSourceId || item.notebookSource?.sourceId, ...(item.additionalSourceIds || [])].filter((s): s is string => Boolean(s)),
        sectorAffinity: item.sectorAffinity,
        businessGoalAffinity: item.businessGoalAffinity,
        catalogItem: item
      };
    });
  }

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

      // Extraer citas de NotebookLM priorizando el notebookSource oficial
      const notebookCitations: NotebookCitation[] = [];
      if (def.catalogItem?.notebookCitation) {
        notebookCitations.push({
          id: def.catalogItem.notebookCitation.sourceId,
          title: def.catalogItem.notebookCitation.title,
          type: def.catalogItem.notebookCitation.type,
          url: def.catalogItem.notebookCitation.url,
          rationale: def.catalogItem.notebookCitation.rationale
        });
      }
      for (const srcId of def.sourceIds) {
        if (!notebookCitations.some(c => c.id === srcId)) {
          const found = OFFICIAL_NOTEBOOK.sources.find(s => s.id === srcId);
          notebookCitations.push({
            id: srcId,
            title: found ? found.title : `Fuente Documental ${srcId}`,
            type: found ? found.type : "datasheet",
            url: found?.url,
            rationale: found ? found.description : "Validación técnica en cuaderno maestro EcomShop."
          });
        }
      }

      // Hilo conductor narrativo canónico con salvaguardas anti-alucinación por categoría y marca
      let defaultPitch = `El equipo ${def.brand} ${def.sku} ofrece rendimiento B2B homologado con entrega rápida desde almacén EcomSpain y soporte preventa directo.`;
      let defaultObjection = `¿Qué garantía y soporte de integración ofrece ${def.brand} para este equipo?`;
      let defaultCounterArgument = `Soporte de ingeniería en España por EcomSpain con sustitución avanzada en 24h e interoperabilidad bajo estándares abiertos.`;

      const isCellular = def.catalogItem?.deviceType === "ROUTER_CELLULAR" || def.category === "cellular" as any || def.sku.startsWith("RUT") || def.sku.startsWith("TRB");
      const isInjector = def.catalogItem?.deviceType === "ACCESSORY" || def.category === "accesorios" || def.sku.startsWith("EPA") || def.sku.startsWith("POE");
      const isSwitch = def.catalogItem?.deviceType === "SWITCH" || def.category === "switches";
      const isTester = def.catalogItem?.deviceType === "TESTER" || def.sku.includes("LINK") || def.sku.includes("SCOPE") || def.sku.includes("CHECK");

      if (isCellular) {
        defaultPitch = `El router industrial ${def.brand} ${def.sku} garantiza conectividad celular 4G/5G crítica para entornos M2M, movilidad y conectividad remota ininterrumpida.`;
        defaultObjection = `¿Es adecuado ${def.sku} para despliegues de misión crítica en vehículos o ubicaciones remotas sin línea fija?`;
        defaultCounterArgument = `Sí, cuenta con chasis reforzado de aluminio, rango térmico extendido, gestión RMS remota y failover inteligente Dual-SIM / WAN.`;
      } else if (isInjector) {
        defaultPitch = `El inyector PoE ${def.brand} ${def.sku} proporciona alimentación limpia y alta potencia a puntos de acceso y cámaras sin necesidad de cambiar el switch de red.`;
        defaultObjection = `¿Es compatible el inyector ${def.sku} con equipos PoE de cualquier fabricante?`;
        defaultCounterArgument = `Totalmente compatible con estándares IEEE 802.3af/at/bt e inyección pasiva de alta eficiencia con protección contra sobretensiones.`;
      } else if (isSwitch) {
        defaultPitch = `El switch ${def.brand} ${def.sku} proporciona conmutación de alta densidad Multi-Gigabit/10G y presupuesto PoE optimizado para backbone corporativo.`;
        defaultObjection = `¿Cómo gestiona ${def.brand} los picos de potencia PoE y los uplinks saturados?`;
        defaultCounterArgument = `Soporta balanceo dinámico de energía PoE+/PoE++, enlaces de fibra SFP+ 10G y VLANs avanzadas L2+/L3.`;
      } else if (isTester) {
        defaultPitch = `El certificador/tester ${def.brand} ${def.sku} diagnostica redes de cobre, fibra y Wi-Fi en segundos para acelerar certificaciones de cableado e instalaciones IT.`;
        defaultObjection = `¿Permite ${def.sku} generar informes de auditoría profesional para entregar al cliente final?`;
        defaultCounterArgument = `Genera reportes técnicos detallados exportables en PDF/Cloud listos para la firma del proyecto.`;
      } else if (def.category === "wifi") {
        defaultPitch = `El AP ${def.brand} ${def.sku} se aprovisiona en 2 minutos con código QR. Cobertura de alta densidad sin cuotas de licencias obligatorias.`;
        defaultObjection = "¿Qué ventaja tiene frente a marcas con suscripción cloud obligatoria?";
        defaultCounterArgument = "Con EnGenius Cloud en EcomShop no hay suscripción obligatoria. Ahorro de hasta el 42% en TCO a 3 años frente a marcas con licencias recurrentes.";
      } else if (def.category === "gateways" || def.sku.startsWith("ESG")) {
        defaultPitch = `El gateway ${def.sku} ofrece seguridad 2.5 GbE con doble WAN y VPN WireGuard nativa sin suscripción obligatoria. Ahorra más del 40% en TCO.`;
        defaultObjection = `¿Tiene el gateway ${def.sku} antena o punto de acceso Wi-Fi integrado para la oficina?`;
        defaultCounterArgument = `No, el ${def.sku} es un gateway y firewall perimetral exclusivamente cableado (cero Wi-Fi integrado). Se complementa con APs Wi-Fi alimentados por switch PoE.`;
      }

      const groundedClaimsPreview: string[] = [
        (def.catalogItem?.rawSpecs || def.catalogItem?.specs)?.[0] || `Stock físico garantizado con entrega en 24/48h desde almacén EcomSpain`,
        def.catalogItem?.keyAdvantages[0] || `Tarifa distribuidor profesional con margen protegido: consultar en ecomshop.es`,
        def.catalogItem?.antiHallucinationNotes?.[0] || `Cero cuotas obligatorias con gestión nativa en EnGenius Cloud`
      ];

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
        groundedClaimsPreview,
        notebookCitations,
        editorialFit: editorialFitReason
      });
    }

    // Ordenar por totalScore descendente con rotación si shuffleSeed > 0 o empates en totalScore
    scoredOpportunities.sort((a, b) => {
      const diff = b.scores.totalScore - a.scores.totalScore;
      if (Math.abs(diff) > 0.001) {
        return diff;
      }
      // En caso de empate en totalScore o si shuffleSeed > 0, rotar determinísticamente entre los 43 productos
      if (shuffleSeed > 0) {
        const hashA = (a.sku.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * shuffleSeed) % 100;
        const hashB = (b.sku.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * shuffleSeed) % 100;
        return hashB - hashA;
      }
      return a.sku.localeCompare(b.sku);
    });

    if (shuffleSeed > 0 && scoredOpportunities.length > limitCount) {
      // Rotar entre los productos con puntuación afín (rango cercano al máximo) para mostrar diversidad
      const maxScore = scoredOpportunities[0]?.scores.totalScore || 100;
      const topCandidates = scoredOpportunities.filter(o => maxScore - o.scores.totalScore <= 10);
      if (topCandidates.length > limitCount) {
        topCandidates.sort((a, b) => {
          const seedA = (a.sku.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * shuffleSeed) % 100;
          const seedB = (b.sku.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * shuffleSeed) % 100;
          return seedB - seedA;
        });

        const rest = scoredOpportunities.filter(o => !topCandidates.some(t => t.sku === o.sku));
        scoredOpportunities.length = 0;
        scoredOpportunities.push(...topCandidates, ...rest);
      }
    }

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
