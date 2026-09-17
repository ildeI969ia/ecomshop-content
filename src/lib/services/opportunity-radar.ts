import { ContentRepository, ProductRepository } from "@/server/repositories";
import { ProductEntity, ContentItem } from "@/server/domain/types";
import { STAR_PRODUCTS } from "../knowledge";
import { ProductBrainService, ProductBrainProfile } from "./product-brain";

export interface OpportunityScoreBreakdown {
  stockScore: number;       // 0-25: Disponibilidad inmediata en almacén EcomSpain
  contentGapScore: number;  // 0-25: Días sin contenido reciente o sin campañas activas
  marketTrendScore: number; // 0-25: Demanda de mercado (Wi-Fi 7, 2.5G/10G, PoE++)
  bundleScore: number;      // 0-25: Potencial de venta cruzada de accesorios y switches
  totalScore: number;       // 0-100
}

export interface ProductOpportunityRecord {
  id: string;
  sku: string;
  brand: string;
  model: string;
  category: string;
  url: string;
  priceEur: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  scores: OpportunityScoreBreakdown;
  actionTitle: string;
  recommendedAngle: "ROI" | "PERFORMANCE" | "OPERATIONS";
  targetSegment: string;
  suggestedBundle: {
    mainSku: string;
    accessorySku: string;
    accessoryName: string;
    rationale: string;
  };
  groundedClaimsPreview: string[];
  productBrainProfile?: ProductBrainProfile;
}

export class OpportunityRadarService {
  private contentRepo = new ContentRepository();
  private productRepo = new ProductRepository();
  private productBrain = new ProductBrainService();

  /**
   * Calcula el radar de oportunidades diarias clasificadas por puntuación algorítmica
   */
  async getDailyOpportunities(limitCount = 3): Promise<ProductOpportunityRecord[]> {
    // 1. Obtener catálogo base (Priorizar Firestore, con fallback garantizado a STAR_PRODUCTS enriquecidos)
    let dbProducts: ProductEntity[] = [];
    try {
      dbProducts = await this.productRepo.listAll(50);
    } catch {
      dbProducts = [];
    }

    // 2. Historial reciente de contenidos para cálculo de Content Gap
    let recentContents: ContentItem[] = [];
    try {
      recentContents = await this.contentRepo.listRecent(50);
    } catch {
      recentContents = [];
    }

    // Unificar SKUs a evaluar (Hardware Blacklist: Queda excluido Fit/FitController)
    const catalogCandidateSkus = [
      "ECW536",
      "ECW510",
      "ECS2512FP",
      "ECS1528FP",
      "ESG510",
      "SFP-10G-SR-KIT"
    ];

    if (dbProducts.length > 0) {
      for (const p of dbProducts) {
        if (!catalogCandidateSkus.includes(p.sku.toUpperCase())) {
          catalogCandidateSkus.push(p.sku.toUpperCase());
        }
      }
    }

    const scoredOpportunities: ProductOpportunityRecord[] = [];

    for (const sku of catalogCandidateSkus) {
      const star = STAR_PRODUCTS.find(
        p => p.model.toUpperCase() === sku || p.id.toUpperCase() === sku.toLowerCase()
      );
      const dbProd = dbProducts.find(p => p.sku.toUpperCase() === sku);

      const brand = dbProd?.brand || "EnGenius";
      const model = dbProd?.model || star?.model || sku;
      const category = dbProd?.category || star?.category || (sku.startsWith("ECW") ? "wifi" : "switches");
      const url = dbProd?.url || star?.url || `https://www.ecomshop.es/${sku.toLowerCase()}`;
      const priceEur = dbProd?.priceEur || (sku.startsWith("ECW536") ? 599 : sku.startsWith("ECS") ? 689 : 149);
      const stockStatus = (dbProd?.stockStatus === "OUT_OF_STOCK" ? "OUT_OF_STOCK" : "IN_STOCK") as "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

      // A. Puntuación de Stock (0-25)
      let stockScore = 20;
      if (stockStatus === "IN_STOCK") stockScore = 25;
      else if (stockStatus === "LOW_STOCK") stockScore = 15;
      else stockScore = 0;

      // B. Puntuación de Content Gap (0-25)
      const contentMatches = recentContents.filter(c => {
        const fullTxt = `${c.title} ${c.slug || ""}`.toUpperCase();
        return fullTxt.includes(sku);
      });

      let contentGapScore = 25;
      if (contentMatches.length > 0) {
        const latestTime = new Date(contentMatches[0].createdAt).getTime();
        const daysSince = Math.max(0, (Date.now() - latestTime) / (1000 * 60 * 60 * 24));
        if (daysSince < 3) contentGapScore = 5;
        else if (daysSince < 7) contentGapScore = 12;
        else if (daysSince < 14) contentGapScore = 18;
        else contentGapScore = 24;
      }

      // C. Puntuación de Market Trend (0-25)
      let marketTrendScore = 15;
      if (sku.includes("536") || sku.includes("510") || category === "wifi") {
        marketTrendScore = 25;
      } else if (sku.includes("2512") || sku.includes("1528") || category === "switches") {
        marketTrendScore = 23;
      } else if (sku.toLowerCase().includes("esg") || category === "gateways") {
        marketTrendScore = 21;
      }

      // D. Puntuación de Bundling / Cross-selling (0-25)
      let bundleScore = 20;
      let accessorySku = "POE30Gv2";
      let accessoryName = "Inyector PoE+ Gigabit 30W";
      let bundleRationale = "Alimentación dedicada para despliegues sin switches PoE.";
      let recommendedAngle: "ROI" | "PERFORMANCE" | "OPERATIONS" = "PERFORMANCE";
      let actionTitle = `Campaña Flash: Despliegue de ${model}`;
      let targetSegment = "Instaladores Telecomunicaciones Tipo A / Integradores IT";

      if (sku.startsWith("ECW")) {
        bundleScore = 25;
        accessorySku = "ECS2512FP";
        accessoryName = "Switch Cloud Multi-Gigabit 2.5G PoE++";
        bundleRationale = "Asegura el ancho de banda del uplink Multi-Gigabit y alimentación 802.3bt sin cuellos de botella.";
        recommendedAngle = "PERFORMANCE";
        actionTitle = `Oportunidad Wi-Fi 7: Impulsa el Pack ${model} + Switch 2.5G`;
        targetSegment = "Integradores de Redes Corporativas y Hospitality";
      } else if (sku.startsWith("ECS")) {
        bundleScore = 24;
        accessorySku = "SFP-10G-SR-KIT";
        accessoryName = "Transceptores 10G SFP+ y Latiguillo OM4";
        bundleRationale = "Backbone de fibra de 10 Gbps para interconexión de armarios rack.";
        recommendedAngle = "OPERATIONS";
        actionTitle = `Oportunidad Switching: ${model} con Troncal 10G`;
        targetSegment = "Instaladores de Infraestructuras y Videovigilancia IP";
      } else if (sku.toLowerCase().includes("esg") || sku.toLowerCase().includes("gateway")) {
        bundleScore = 23;
        accessorySku = "ECS1528FP";
        accessoryName = "Switch Cloud PoE+ 24 Puertos";
        bundleRationale = "Topología unificada EnGenius Cloud: Gateway seguro + Conmutación PoE para APs.";
        recommendedAngle = "ROI";
        actionTitle = `Oportunidad Cloud Total: Gateway ${model} + Switching 0€ Licencias`;
        targetSegment = "Directores de Sistemas y MSPs Multi-Sede";
      }

      const totalScore = stockScore + contentGapScore + marketTrendScore + bundleScore;

      scoredOpportunities.push({
        id: `opp-${sku.toLowerCase()}-${Date.now()}`,
        sku,
        brand,
        model,
        category,
        url,
        priceEur,
        stockStatus,
        scores: {
          stockScore,
          contentGapScore,
          marketTrendScore,
          bundleScore,
          totalScore
        },
        actionTitle,
        recommendedAngle,
        targetSegment,
        suggestedBundle: {
          mainSku: sku,
          accessorySku,
          accessoryName,
          rationale: bundleRationale
        },
        groundedClaimsPreview: [
          `Stock garantizado con entrega en 24h desde EcomSpain`,
          `Cumplimiento estricto de estándares IEEE y certificación CE`,
          `Soporte preventa y dimensionamiento de ingeniería para instaladores`
        ]
      });
    }

    scoredOpportunities.sort((a, b) => b.scores.totalScore - a.scores.totalScore);
    const topOpportunities = scoredOpportunities.slice(0, limitCount);

    for (const opp of topOpportunities) {
      try {
        opp.productBrainProfile = await this.productBrain.getProductBrainProfile(opp.sku);
      } catch {
        // Ignorar si falla grounding
      }
    }

    return topOpportunities;
  }
}
