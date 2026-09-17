import { ProductIntelligenceCard } from "../types/product-intelligence";
import { NotebookGroundingService } from "./notebook-grounding";
import { STAR_PRODUCTS } from "../knowledge";

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
   * Obtiene el perfil enriquecido de un producto a partir de su SKU y su tarjeta de inteligencia
   */
  async getProductBrainProfile(sku: string, intelligenceCard?: ProductIntelligenceCard): Promise<ProductBrainProfile> {
    const cleanSku = sku.trim().toUpperCase();
    const star = STAR_PRODUCTS.find(p => p.model.toUpperCase() === cleanSku || p.id.toUpperCase() === cleanSku);
    const notebookData = await this.notebookService.queryNotebookContext(`${cleanSku} EnGenius EcomShop`);

    const isAP = cleanSku.startsWith("ECW") || (star && star.category === "wifi") || (star && star.category === "engenius");
    const isSwitch = cleanSku.startsWith("ECS") || (star && star.category === "switches");

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
        pitchIn30Seconds: `Rendimiento Multi-Gigabit de grado industrial sin coste de suscripción obligatoria a 3 años. Ahorra hasta el 42% en TCO frente a Cisco Meraki.`,
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

    // Gestión de Objeciones en 30 segundos
    const objectionLedger: ObjectionHandler[] = [
      {
        objection: "¿Es compatible con la red existente de mi cliente si usan otra marca (Cisco, Ubiquiti, MikroTik)?",
        counterArgument: "Totalmente compatible mediante estándares abiertos IEEE 802.3 y VLANs 802.1Q. Permite una migración escalonada sede por sede sin cambiar la electrónica de red previa.",
        evidenceRef: "Datasheet Estándares IEEE & Whitepaper EcomSpain Interoperabilidad"
      },
      {
        objection: "¿Qué pasa si dejamos de pagar la suscripción Cloud?",
        counterArgument: "Con EnGenius Cloud en EcomShop no hay suscripción obligatoria. El hardware nunca se bloquea ni apaga sus funciones si decides gestionar localmente.",
        evidenceRef: "Estudio Comparativa TCO 2026: EnGenius Cloud vs Modelos de Suscripción"
      },
      {
        objection: "¿El ancho de banda de Wi-Fi 7 / 2.5G realmente se aprovecha con conexiones estándar?",
        counterArgument: "El cuello de botella no es la fibra del operador sino la contención de tráfico local y la latencia entre dispositivos. El canal de 320 MHz y MLO elimina la congestión en horas punta.",
        evidenceRef: "Guía de Despliegue Wi-Fi 7 de Alta Densidad EcomShop"
      }
    ];

    // Ecosistema & Cross-Selling
    const ecosystem: ProductEcosystemBundle = isAP ? {
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

    return {
      sku: cleanSku,
      brand: star ? "EnGenius" : (intelligenceCard?.product.brand || "EnGenius"),
      model: star ? star.model : (intelligenceCard?.product.model || cleanSku),
      ean: intelligenceCard?.product.ean,
      category: star ? star.category : (intelligenceCard?.product.category || "wifi"),
      storeUrl: star ? star.url : (intelligenceCard?.product.url || `https://www.ecomshop.es/${cleanSku.toLowerCase()}`),
      priceEur: isAP ? 599 : isSwitch ? 689 : 149,
      stockStatus: (intelligenceCard?.product.stockStatus || "IN_STOCK") as any,
      hardware: {
        standards: intelligenceCard?.technicalSpecs.standards || ["Wi-Fi 7 (802.11be)", "PoE++ (802.3bt)", "IEEE 802.3at"],
        uplinkInterface: isAP ? "1x 2.5GbE / 10GbE RJ45" : "4x 10G SFP+ Uplinks",
        powerConsumptionWatts: isAP ? 25 : 410,
        poeType: isAP ? "802.3bt" : isSwitch ? "802.3at" : "802.3af",
        managementMode: "Cloud"
      },
      buyerPersonas,
      objectionLedger,
      ecosystem,
      masterNotebookId: notebookData.notebookId,
      notebookEvidenceChunks: notebookData.matchedChunks.map(c => ({
        id: c.id,
        title: c.title,
        content: c.content
      })),
      lastUpdated: new Date().toISOString()
    };
  }
}
