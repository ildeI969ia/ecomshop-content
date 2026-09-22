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
    managementMode: "Cloud" | "On-Premise" | "Hybrid" | "Standalone";
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
    const star = STAR_PRODUCTS.find(p => p.model.toUpperCase() === cleanSku || p.id.toUpperCase() === cleanSku);
    const notebookData = await this.notebookService.queryNotebookContext(`${cleanSku} EnGenius EcomShop`);

    const isAP = catalogItem?.category === "wifi" || cleanSku.startsWith("ECW") || (star && (star.category === "wifi" || star.category === "engenius"));
    const isSwitch = catalogItem?.category === "switches" || cleanSku.startsWith("ECS") || (star && star.category === "switches");
    const isGateway = catalogItem?.category === "gateways" || cleanSku.startsWith("ESG");

    // Construcción de Buyer Personas B2B específicas de telecomunicaciones
    const buyerPersonas: BuyerPersonaProfile[] = [
      {
        name: "Instalador Tipo A / F (Telecomunicaciones & CCTV)",
        role: "Instalador de redes y sistemas de videovigilancia",
        primaryConcern: "Tiempos de mano de obra en obra, presupuesto PoE que no tire las cámaras y soporte preventa directo",
        pitchIn30Seconds: `El equipo ${cleanSku} se aprovisiona en 2 minutos con código QR desde el móvil. Cero cuotas de licencias y sustitución en 24h de EcomSpain si falla en obra.`,
        recommendedCta: "Solicitar Tarifa de Instalador con Descuento por Volumen"
      },
      {
        name: "Integrador IT / Responsable de Sistemas",
        role: "Director TIC / CIO Hospitality & Corporativo",
        primaryConcern: "Seguridad WPA3 Enterprise, SLAs de red sin microcortes y costes recurrentes de licencias cloud",
        pitchIn30Seconds: isGateway
          ? `Gateway de seguridad 2.5 GbE con doble WAN y VPN WireGuard nativa sin suscripción obligatoria. Ahorra más del 40% en TCO frente a Cisco Meraki o Fortinet.`
          : `Rendimiento Multi-Gigabit de grado industrial sin coste de suscripción obligatoria a 3 años. Ahorra hasta el 42% en TCO frente a Cisco Meraki.`,
        recommendedCta: "Pedir Unidad Demo para Test en Laboratorio"
      },
      {
        name: "Jefe de Compras / Director de Operaciones",
        role: "Gestión de aprovisionamiento en distribuidores y grandes cuentas",
        primaryConcern: "Stock permanente en España, entregas en 24/48h y margen comercial neto asegurado",
        pitchIn30Seconds: `Hardware oficial en stock permanente en almacén de España. Envíos inmediatos y condiciones preferentes para proyectos licitados.`,
        recommendedCta: "Descargar Documentación Técnica y Tarifa Mayorista"
      }
    ];

    // Gestión de Objeciones en 30 segundos con salvaguardas anti-alucinación
    const objectionLedger: ObjectionHandler[] = [];

    // Salvaguardas específicas por producto / categoría
    if (cleanSku === "ESG510" || cleanSku === "ESG610" || isGateway) {
      objectionLedger.push({
        objection: `¿El gateway ${cleanSku} incluye antena o punto de acceso Wi-Fi integrado para la oficina?`,
        counterArgument: `NO, el ${cleanSku} es un gateway y firewall perimetral exclusivamente CABLEADO (cero Wi-Fi integrado). Se combina de forma nativa en EnGenius Cloud con puntos de acceso Wi-Fi 7 (ej. ECW526/ECW536) y switches PoE para distribuir la conectividad sin comprometer el rendimiento de seguridad.`,
        evidenceRef: `Ficha Técnica Oficial EnGenius ${cleanSku} & Master Notebook EcomShop (src-6)`
      });
    }

    if (cleanSku === "ECW536") {
      objectionLedger.push({
        objection: "¿Se puede alimentar el AP ECW536 con un switch PoE+ 802.3at de 30W tradicional?",
        counterArgument: "El ECW536 requiere alimentación PoE++ 802.3bt (hasta 33W máx) para operar sus 3 bandas simultáneas a pleno rendimiento de 18.7 Gbps. Si se alimenta con PoE+ estándar 802.3at, el equipo entrará en modo degradado limitando cadenas de radio. Por ello se recomienda el switch ECS2512FP.",
        evidenceRef: "Datasheet ECW536 & Guía PoE Budget 802.3bt (src-1, src-8)"
      });
    }

    if (cleanSku === "ECS2512FP") {
      objectionLedger.push({
        objection: "¿Es necesario invertir en puertos 2.5G PoE++ si la red actual es de 1 Gbps?",
        counterArgument: "Los puntos de acceso Wi-Fi 7 superan ampliamente 1 Gbps de caudal real. Conectarlos a switches de 1 GbE crea un cuello de botella severo. El ECS2512FP ofrece 8 puertos 2.5G con PoE++ de 60W y 4 uplinks 10G SFP+, garantizando la troncal sin sustituir el cableado Cat6.",
        evidenceRef: "Whitepaper EcomShop: Migración de Conmutación a 2.5G/10G para Wi-Fi 7 (src-8)"
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
        objection: "¿Qué pasa si dejamos de pagar la suscripción Cloud?",
        counterArgument: "Con EnGenius Cloud en EcomShop no hay suscripción obligatoria. El hardware nunca se bloquea ni apaga sus funciones si decides gestionar localmente.",
        evidenceRef: "Estudio Comparativa TCO 2026: EnGenius Cloud vs Modelos de Suscripción (src-4, src-11)"
      },
      {
        objection: "¿El ancho de banda de Wi-Fi 7 / 2.5G realmente se aprovecha con conexiones estándar?",
        counterArgument: "El cuello de botella no es la fibra del operador sino la contención de tráfico local y la latencia entre dispositivos. El canal de 320 MHz y MLO elimina la congestión en horas punta.",
        evidenceRef: "Guía de Despliegue Wi-Fi 7 de Alta Densidad EcomShop (src-1, src-10)"
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
      brand: catalogItem?.brand || star?.name.split(" ")[0] || intelligenceCard?.product.brand || "EnGenius",
      model: catalogItem?.model || star?.model || intelligenceCard?.product.model || cleanSku,
      ean: intelligenceCard?.product.ean,
      category: catalogItem?.category || star?.category || intelligenceCard?.product.category || "wifi",
      storeUrl: catalogItem?.url || star?.url || intelligenceCard?.product.url || `https://www.ecomshop.es/${cleanSku.toLowerCase()}`,
      priceEur: catalogItem?.priceEur ?? (isAP ? 599 : isSwitch ? 689 : 149),
      stockStatus: (catalogItem?.stockStatus || intelligenceCard?.product.stockStatus || "IN_STOCK") as any,
      hardware: {
        standards: catalogItem?.standards || intelligenceCard?.technicalSpecs.standards || ["Wi-Fi 7 (802.11be)", "PoE++ (802.3bt)", "IEEE 802.3at"],
        uplinkInterface: catalogItem ? catalogItem.interfaces.join(" | ") : (isAP ? "1x 2.5GbE / 10GbE RJ45" : "4x 10G SFP+ Uplinks"),
        powerConsumptionWatts: catalogItem?.powerConsumptionWatts ?? (isAP ? 25 : 410),
        poeType: catalogItem?.poeType || (isAP ? "802.3bt" : isSwitch ? "802.3at" : "802.3af"),
        managementMode: catalogItem?.managementMode || "Cloud"
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

