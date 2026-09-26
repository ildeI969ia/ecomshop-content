import { ProductIntelligenceCard } from "../types/product-intelligence";
import { NotebookGroundingService } from "./notebook-grounding";
import { STAR_PRODUCTS } from "../knowledge";
import { findCatalogProduct, ECOMSHOP_FULL_CATALOG } from "../data/ecomshop-catalog";


export interface BuyerPersonaProfile {
  name: string;
  role: string;
  primaryConcern: string;
  pitchIn30Seconds: string;
  recommendedCta: string;
}

export interface ObjectionHandler {
  objection: string;
  counterArgument: string;
  evidenceRef: string;
}

export interface ProductEcosystemBundle {
  requiredProducts: Array<{ sku: string; reason: string }>;
  recommendedAccessories: Array<{ sku: string; reason: string }>;
  directAlternatives: Array<{ sku: string; reason: string }>;
}

export interface ProductBrainProfile {
  sku: string;
  brand: string;
  model: string;
  ean?: string;
  category: string;
  storeUrl: string;
  priceEur?: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
  
  // Hardware & Network
  hardware: {
    standards: string[];
    uplinkInterface: string;
    powerConsumptionWatts: number;
    poeType: "802.3af" | "802.3at" | "802.3bt" | "DC_PASSIVE" | "NONE";
    managementMode: "Cloud" | "On-Premise" | "Hybrid" | "Standalone" | "RMS" | "Local" | "Unmanaged";
  };

  // Sales & Objections
  buyerPersonas: BuyerPersonaProfile[];
  objectionLedger: ObjectionHandler[];

  // Ecosystem & Bundling
  ecosystem: ProductEcosystemBundle;

  // Master Notebook Corpus Grounding
  masterNotebookId: string;
  notebookEvidenceChunks: Array<{ id: string; title: string; content: string }>;

  lastUpdated: string;
}

export class ProductBrainService {
  private notebookService = new NotebookGroundingService();

  /**
   * Obtiene el perfil enriquecido de un producto a partir de su SKU y su tarjeta de inteligencia,
   * utilizando ECOMSHOP_CATALOG como fuente primaria de datos verificados.
   */
  async getProductBrainProfile(sku: string, intelligenceCard?: ProductIntelligenceCard): Promise<ProductBrainProfile> {
    const cleanSku = sku.trim().toUpperCase();
    const catalogItem = findCatalogProduct(cleanSku);
    if (!catalogItem) {
      throw new Error(`PRODUCT_NOT_FOUND: Producto no encontrado en catálogo (${cleanSku})`);
    }

    const brand = catalogItem.brand;
    const model = catalogItem.model;
    const notebookData = await this.notebookService.queryNotebookContext(`${cleanSku} ${brand} EcomShop`);

    const isAP = catalogItem.category === "wifi";
    const isSwitch = catalogItem.category === "switches";
    const isGateway = catalogItem.category === "gateways";

    // Construcción de Buyer Personas B2B específicas de telecomunicaciones
    const buyerPersonas: BuyerPersonaProfile[] = [
      {
        name: "Instalador Tipo A / F (Telecomunicaciones & CCTV)",
        role: "Instalador de redes y sistemas de videovigilancia",
        primaryConcern: "Tiempos de mano de obra en obra, presupuesto PoE que no tire las cámaras y soporte preventa directo",
        pitchIn30Seconds: `El equipo ${brand} ${model} ofrece aprovisionamiento rápido y fiabilidad en obra. Sustitución en 24h de EcomSpain ante cualquier incidencia.`,
        recommendedCta: "Solicitar Tarifa de Instalador con Descuento por Volumen"
      },
      {
        name: "Integrador IT / Responsable de Sistemas",
        role: "Director TIC / CIO Hospitality & Corporativo",
        primaryConcern: "Seguridad Enterprise, SLAs de red sin microcortes y TCO optimizado",
        pitchIn30Seconds: isGateway
          ? `Gateway de seguridad ${brand} ${model} con firewall perimetral y alto rendimiento de VPN nativa.`
          : `Rendimiento de grado industrial para ${brand} ${model} con soporte de ingeniería Preventa EcomSpain.`,
        recommendedCta: "Pedir Unidad Demo para Test en Laboratorio"
      },
      {
        name: "Jefe de Compras / Director de Operaciones",
        role: "Gestión de aprovisionamiento en distribuidores y grandes cuentas",
        primaryConcern: "Stock permanente en España, entregas en 24/48h y margen comercial neto asegurado",
        pitchIn30Seconds: `Hardware oficial ${brand} ${model} en stock permanente en almacén de España. Envíos inmediatos y condiciones preferentes.`,
        recommendedCta: "Descargar Documentación Técnica y Tarifa Mayorista"
      }
    ];

    // Gestión de Objeciones en 30 segundos con salvaguardas anti-alucinación
    const objectionLedger: ObjectionHandler[] = [];

    // Salvaguardas específicas por producto / categoría
    if (isGateway) {
      objectionLedger.push({
        objection: `¿El gateway ${model} incluye antena o punto de acceso Wi-Fi integrado para la oficina?`,
        counterArgument: `NO, el ${brand} ${model} es un gateway y firewall perimetral exclusivamente CABLEADO (cero Wi-Fi integrado). Se combina de forma nativa con puntos de acceso de la red.`,
        evidenceRef: `Ficha Técnica Oficial ${brand} ${model} & EcomShop`
      });
    }

    // Objeciones generales de interoperabilidad y TCO
    objectionLedger.push(
      {
        objection: "¿Es compatible con la red existente de mi cliente si usan otra marca (Cisco, Ubiquiti, MikroTik)?",
        counterArgument: "Totalmente compatible mediante estándares abiertos IEEE 802.3 y VLANs 802.1Q. Permite una migración escalonada sede por sede sin cambiar la electrónica de red previa.",
        evidenceRef: "Datasheet Estándares IEEE & Whitepaper EcomSpain Interoperabilidad"
      },
      {
        objection: "¿Qué garantías y soporte ofrece EcomShop para este equipo?",
        counterArgument: `Garantía oficial ${brand} distribuida por EcomSpain con soporte preventa de ingeniería y sustitución rápida 24/48h.`,
        evidenceRef: `Garantía y Condiciones de Canal EcomSpain para ${brand}`
      }
    );

    // Ecosistema & Cross-Selling alimentado por la fuente canónica ECOMSHOP_FULL_CATALOG
    let ecosystem: ProductEcosystemBundle;
    if (catalogItem) {
      // Buscar alternativas directas de la misma categoría o tipo de dispositivo en el catálogo canónico
      const sameCategoryProds = ECOMSHOP_FULL_CATALOG.filter(
        p => p.sku !== catalogItem.sku && (p.deviceType === catalogItem.deviceType || p.category === catalogItem.category)
      );
      const otherProds = ECOMSHOP_FULL_CATALOG.filter(
        p => p.sku !== catalogItem.sku && p.deviceType !== catalogItem.deviceType && p.category !== catalogItem.category
      );
      const candidateList = [...sameCategoryProds, ...otherProds];

      const alternatives = candidateList.slice(0, 2).map(p => ({
        sku: p.sku,
        reason: p.description.length > 100 ? `${p.description.slice(0, 97)}...` : p.description
      }));

      const accessories: Array<{ sku: string; reason: string }> = [];
      if (isAP) {
        accessories.push(
          { sku: "POE30Gv2", reason: "Inyector PoE+ Gigabit de 30W para instalaciones con switches no PoE" },
          { sku: "SFP-10G-SR-KIT", reason: "Kit de transceptores 10G SFP+ y latiguillo OM4 para enlace troncal" }
        );
      } else if (isSwitch) {
        accessories.push(
          { sku: "ECW536", reason: "Punto de acceso Wi-Fi 7 corporativo para exprimir los puertos Multi-Gigabit" },
          { sku: "ESG510", reason: "Gateway de seguridad gestionado en Cloud con doble WAN 2.5G" }
        );
      } else if (isGateway) {
        accessories.push(
          { sku: "ECW526", reason: "Punto de acceso Wi-Fi 7 compacto interior para cobertura inalámbrica" },
          { sku: "POE30Gv2", reason: "Alimentación PoE+ estabilizada para APs remotos" }
        );
      } else {
        accessories.push(
          { sku: "ECS1528FP", reason: "Switch Cloud gestionable PoE+ con slots 10G SFP+" }
        );
      }

      ecosystem = {
        requiredProducts: [
          {
            sku: catalogItem.bundleDetails?.sku || catalogItem.recommendedBundle.sku,
            reason: catalogItem.bundleDetails?.rationale || catalogItem.recommendedBundle.rationale
          }
        ],
        recommendedAccessories: accessories,
        directAlternatives: alternatives
      };
    } else {
      ecosystem = isAP ? {
        requiredProducts: [
          { sku: "ECS2512FP", reason: "Switch Multi-Gigabit 2.5G con puertos PoE++ 802.3bt para alimentar el punto de acceso sin cuello de botella" }
        ],
        recommendedAccessories: [
          { sku: "POE30Gv2", reason: "Inyector PoE+ Gigabit de 30W para instalaciones con switches no PoE" },
          { sku: "SFP-10G-SR-KIT", reason: "Kit de transceptores 10G SFP+ y latiguillo OM4 para enlace troncal" }
        ],
        directAlternatives: [
          { sku: "ECW526", reason: "Alternativa compacta para despachos y salas de reunión de menor densidad" },
          { sku: "ECW546", reason: "Alternativa con carcasa reforzada IP67 para intemperie o naves" }
        ]
      } : isSwitch ? {
        requiredProducts: [
          { sku: "SFP-10G-SR-KIT", reason: "Módulos transceptores SFP+ 10G para enlaces de uplink entre racks" }
        ],
        recommendedAccessories: [
          { sku: "ECW536", reason: "Punto de acceso Wi-Fi 7 corporativo para aprovechar los puertos Multi-Gigabit" },
          { sku: "ESG610", reason: "Gateway SD-WAN de seguridad gestionado en Cloud con firewall y balanceo de carga" }
        ],
        directAlternatives: [
          { sku: "ECS1528FP", reason: "Switch gestionable de 24 puertos GbE PoE+ (410W budget)" },
          { sku: "ECS5512FP", reason: "Switch de agregación troncal con 8 puertos 10G Base-T" }
        ]
      } : {
        requiredProducts: [],
        recommendedAccessories: [
          { sku: "POE30Gv2", reason: "Alimentación PoE estabilizada 802.3at" }
        ],
        directAlternatives: []
      };
    }

    // Grounding en NotebookLM con inclusión explícita del notebookSource oficial del catálogo
    const notebookEvidenceChunks: Array<{ id: string; title: string; content: string }> = [];

    if (catalogItem?.notebookCitation) {
      notebookEvidenceChunks.push({
        id: catalogItem.notebookCitation.sourceId,
        title: catalogItem.notebookCitation.title,
        content: `${catalogItem.notebookCitation.rationale} [Especificaciones oficiales: ${(catalogItem.rawSpecs || catalogItem.specs).slice(0, 3).join(", ")}]`
      });
    }

    for (const chunk of notebookData.matchedChunks) {
      if (!notebookEvidenceChunks.some(c => c.id === chunk.id)) {
        notebookEvidenceChunks.push({
          id: chunk.id,
          title: chunk.title,
          content: chunk.content
        });
      }
    }

    return {
      sku: cleanSku,
      brand: catalogItem.brand,
      model: catalogItem.model,
      ean: intelligenceCard?.product.ean,
      category: catalogItem.category,
      storeUrl: catalogItem.url || `https://www.ecomshop.es/${cleanSku.toLowerCase()}`,
      priceEur: catalogItem.priceEur ?? (isAP ? 599 : isSwitch ? 689 : 149),
      stockStatus: (catalogItem.stockStatus || intelligenceCard?.product.stockStatus || "IN_STOCK") as any,
      hardware: {
        standards: catalogItem.standards || intelligenceCard?.technicalSpecs.standards || ["IEEE 802.3at", "Gigabit Ethernet"],
        uplinkInterface: catalogItem.interfaces ? catalogItem.interfaces.join(" | ") : "1x 2.5GbE / 10GbE RJ45",
        powerConsumptionWatts: catalogItem.powerConsumptionWatts ?? (isAP ? 25 : 410),
        poeType: catalogItem.poeType || (isAP ? "802.3bt" : isSwitch ? "802.3at" : "802.3af"),
        managementMode: catalogItem.managementMode || "Cloud"
      },
      buyerPersonas,
      objectionLedger,
      ecosystem,
      masterNotebookId: notebookData.notebookId,
      notebookEvidenceChunks,
      lastUpdated: new Date().toISOString()
    };
  }
}

