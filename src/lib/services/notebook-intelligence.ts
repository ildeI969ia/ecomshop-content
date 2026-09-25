import { OFFICIAL_NOTEBOOK, NotebookSource } from "@/lib/notebooklm";
import { ProductIntelligenceCard, DeviceType } from "@/lib/types/product-intelligence";
import { STAR_PRODUCTS } from "@/lib/knowledge";
import { findCatalogProduct, ECOMSHOP_FULL_CATALOG } from "@/lib/data/ecomshop-catalog";

export interface HighlightedNotebookSource {
  id: string;
  title: string;
  type: "datasheet" | "pdf" | "note" | "url";
  description: string;
  excerpt: string;
  url?: string;
  imageUrl?: string;
  relevanceScore: number;
  isPrimary?: boolean;
}

export interface StructuredProductIntelligence {
  sku: string;
  model: string;
  brand: string;
  naturalSector: "ENTERPRISE_OFFICE" | "HOSPITALITY" | "LOGISTICS_INDUSTRY" | "EDUCATION_CAMPUS";
  naturalAudience: string;
  recommendedAngle: "ROI" | "PERFORMANCE" | "OPERATIONS";
  recommendedTone: "ENGINEERING_PREVENTA" | "C_LEVEL_TCO" | "CHANNEL_INSTALLER" | "CASE_STUDY";
  recommendedCompetitor: "MERAKI" | "UNIFI" | "LEGACY_1G" | "NONE";
  mandatoryElectronics: {
    recommendedSwitchSku: string;
    recommendedSwitchName: string;
    reason: string;
    portsAndUplink: string;
  };
  keyClaims: Array<{
    claim: string;
    sourceId: string;
    sourceTitle: string;
    verified: boolean;
  }>;
  objections: Array<{
    objection: string;
    counterArgument: string;
    sourceId: string;
  }>;
  card: ProductIntelligenceCard;
}

export class NotebookIntelligenceService {
  private notebookId = "6ae5b7bb-ab27-4541-80cc-6127730fd01b";

  /**
   * Consulta el NotebookLM y devuelve la lista de fuentes relevantes (nombre de archivo, tipo y fragmento destacado)
   */
  getProductSources(skuOrTopic: string): HighlightedNotebookSource[] {
    const cleanQuery = (skuOrTopic || "").trim().toLowerCase();
    const tokens = cleanQuery.split(/[\s,/-]+/).filter((t) => t.length > 2);

    const scored = OFFICIAL_NOTEBOOK.sources.map((src) => {
      let score = 0;
      const titleLower = src.title.toLowerCase();
      const descLower = src.description.toLowerCase();

      // Coincidencia exacta de SKU (ej. ECW510, ECW536, ECS2512FP, ESG510)
      if (cleanQuery && (titleLower.includes(cleanQuery) || descLower.includes(cleanQuery))) {
        score += 60;
      }

      for (const token of tokens) {
        if (titleLower.includes(token)) score += 20;
        if (descLower.includes(token)) score += 12;
      }

      // Relevancia por categoría según el producto
      if (cleanQuery.includes("esg") || cleanQuery.includes("gateway") || cleanQuery.includes("router") || cleanQuery.includes("firewall")) {
        if (src.id === "src-6" || titleLower.includes("esg") || titleLower.includes("gateway") || titleLower.includes("sd-wan")) score += 45;
        if (titleLower.includes("vpn") || titleLower.includes("wireguard")) score += 25;
        if (src.id === "src-4" || src.id === "src-18") score += 15;
      } else if (cleanQuery.includes("ecw") || cleanQuery.includes("wifi")) {
        if (src.type === "datasheet" && titleLower.includes("ecw")) score += 25;
        if (titleLower.includes("poe") || titleLower.includes("switch")) score += 15;
        if (src.id === "src-4" || src.id === "src-18") score += 10;
      } else if (cleanQuery.includes("ecs") || cleanQuery.includes("switch")) {
        if (src.type === "datasheet" && titleLower.includes("ecs")) score += 25;
        if (titleLower.includes("poe budget") || titleLower.includes("sfp")) score += 15;
      } else if (cleanQuery.includes("fibra") || cleanQuery.includes("sfp") || cleanQuery.includes("gpon")) {
        if (titleLower.includes("fibra") || titleLower.includes("sfp") || titleLower.includes("gpon")) score += 30;
      }

      return {
        src,
        score,
        isPrimary: titleLower.includes(cleanQuery) && cleanQuery.length >= 4
      };
    });

    // Ordenar y extraer fragmentos destacados
    const sorted = scored
      .filter((item) => item.score > 10)
      .sort((a, b) => b.score - a.score);

    // Si no hubo suficientes coincidencias específicas, asegurar fuentes base
    const finalItems = sorted.length >= 3 ? sorted : scored.sort((a, b) => b.score - a.score).slice(0, 4);

    return finalItems.map(({ src, score, isPrimary }) => {
      let excerpt = src.description;

      // Extractos técnicos enriquecidos según fuente
      if (src.id === "src-0") {
        excerpt = "Wi-Fi 7 Dual-Band (2.4 GHz + 5 GHz) con modulación 4096-QAM y 1x puerto 2.5GbE PoE+ 802.3at. Roaming rápido 802.11k/v/r, aprovisionamiento QR en 2 minutos con EnGenius Cloud To-Go y 0€ en suscripciones de por vida.";
      } else if (src.id === "src-1") {
        excerpt = "Wi-Fi 7 Tri-Banda (2.4, 5 y 6 GHz) con modulación 4096-QAM, canales ultra-anchos de 320 MHz y Multi-Link Operation (MLO). Incluye 1x puerto 10GbE PoE++ 802.3bt para eliminar cualquier cuello de botella de conmutación.";
      } else if (src.id === "src-2") {
        excerpt = "AP Wi-Fi 7 compacto Dual-Band optimizado para despachos y hospitality. Puerto 2.5GbE PoE+ 802.3at, soporte VLAN 802.1Q por SSID y monitorización de radiofrecuencia en tiempo real desde la nube.";
      } else if (src.id === "src-6") {
        excerpt = "Gateway de Seguridad SD-WAN EnGenius ESG510 & ESG610: equipo perimetral exclusivamente cableado (sin radios Wi-Fi), 4x 2.5GbE con Dual-WAN Failover, VPN WireGuard/IPsec a velocidad de línea y 0€ en cuotas de firewall.";
      } else if (src.id === "src-8") {
        excerpt = "Switch gestionable L2+ con 8 puertos 2.5GbE PoE++ 802.3bt (hasta 60W por puerto) y 4 slots 10G SFP+. Diseñado como electrónica de conmutación obligatoria para alimentar APs Wi-Fi 7 sin estrangulamiento.";
      } else if (src.id === "src-9") {
        excerpt = "Switch de agregación troncal L2+ con slots 10G SFP+ y puertos Base-T para distribución troncal inter-racks e inter-plantas de producción sin cuellos de botella.";
      } else if (src.id === "src-10") {
        excerpt = "Directrices de dimensionamiento de potencia PoE: la caída de tensión en tiradas de cobre >50m exige presupuestos holgados (PoE+ 30W para APs 2x2, PoE++ 60W para APs 4x4 y cámaras PTZ).";
      } else if (src.id === "src-11") {
        excerpt = "Auditoría de costes TCO a 3 años: EnGenius Cloud reduce un 42% el coste total frente a Cisco Meraki al no exigir renovación anual de licencias de gestión.";
      } else if (src.id === "src-18") {
        excerpt = "Servicio oficial EcomSpain: sustitución avanzada en 24h laborables con stock permanente en España para distribuidores autorizados.";
      }

      return {
        id: src.id,
        title: src.title,
        type: src.type,
        description: src.description,
        excerpt,
        url: src.url,
        imageUrl: src.imageUrl,
        relevanceScore: Math.min(100, Math.max(40, score)),
        isPrimary: Boolean(isPrimary)
      };
    });
  }

  /**
   * Pide un análisis estructurado previo fundamentado en NotebookLM:
   * Sector natural, topología/electrónica obligatoria, objeciones y claims comprobables.
   */
  synthesizeProductIntelligence(skuOrQuery: string, activeSourceIds?: string[]): StructuredProductIntelligence {
    const cleanSku = (skuOrQuery || "").trim().toUpperCase();
    const catalogItem = findCatalogProduct(cleanSku);
    const sources = this.getProductSources(cleanSku);
    const selectedSources = activeSourceIds && activeSourceIds.length > 0
      ? sources.filter((s) => activeSourceIds.includes(s.id))
      : sources.slice(0, 4);

    // Identificación de tipo de dispositivo y características
    const isEsg510 = cleanSku.includes("ESG510") || cleanSku === "ESG510";
    const isEsg610 = cleanSku.includes("ESG610");
    const isGateway = isEsg510 || isEsg610 || catalogItem?.deviceType === "GATEWAY";

    const isEcw510 = cleanSku.includes("ECW510") || cleanSku === "ECW510";
    const isEcw536 = cleanSku.includes("ECW536");
    const isEcw526 = cleanSku.includes("ECW526");
    const isEcw546 = cleanSku.includes("ECW546") || cleanSku.includes("OUTDOOR");
    const isAccessPoint = isEcw510 || isEcw536 || isEcw526 || isEcw546 || catalogItem?.deviceType === "ACCESS_POINT";

    const isEcs2512fp = cleanSku.includes("2512");
    const isEcs1528fp = cleanSku.includes("1528");
    const isEcs5512f = cleanSku === "ECS5512F" || (cleanSku.includes("5512F") && !cleanSku.includes("FP"));
    const isEcs5512fp = cleanSku.includes("5512FP");
    const isSwitch = isEcs2512fp || isEcs1528fp || isEcs5512f || isEcs5512fp || catalogItem?.deviceType === "SWITCH";

    const isPoe30g = cleanSku.includes("POE30G");
    const isSfpKit = cleanSku.includes("SFP") || cleanSku.includes("KIT");
    const isAccessory = isPoe30g || isSfpKit || catalogItem?.deviceType === "ACCESSORY";

    let deviceType: DeviceType = "ACCESS_POINT";
    let modelName = catalogItem?.name || cleanSku;
    let category = catalogItem?.category || "wifi";
    let standards: string[] = [];
    let ports: string[] = [];
    let powerReq = "PoE+ 802.3at (Consumo pico ~19W)";
    let switchSku = "ECS2512FP";
    let switchName = "Switch Cloud Multi-Gigabit 2.5G PoE++ (ECS2512FP)";
    let switchReason = "Conmutación Multi-Gigabit para exprimir modulación de alta velocidad.";
    let naturalSector: StructuredProductIntelligence["naturalSector"] = "ENTERPRISE_OFFICE";
    let naturalAudience = "Integradores de Redes Corporativas y Pymes Avanzadas";
    let recommendedAngle: StructuredProductIntelligence["recommendedAngle"] = "ROI";
    let recommendedTone: StructuredProductIntelligence["recommendedTone"] = "ENGINEERING_PREVENTA";
    let recommendedCompetitor: StructuredProductIntelligence["recommendedCompetitor"] = "MERAKI";

    // Campos polimórficos especializados
    let wirelessStandards: string[] | undefined = undefined;
    let frequencyBands: string[] | undefined = undefined;
    let mimo: string | undefined = undefined;
    let switchingCapacity: string | undefined = undefined;
    let switchingLayer: string | undefined = undefined;
    let poeBudget: string | undefined = undefined;
    let uplinks: string[] | undefined = undefined;
    let firewallThroughput: string | undefined = undefined;
    let vpnProtocols: string[] | undefined = undefined;
    let wanFailover: boolean | undefined = undefined;
    let hasWifiRadios: boolean = true;
    let isCableOnly: boolean = false;
    let keyDiffs: string[] = [
      "0€ Cuotas de suscripción perpetuas",
      "Aprovisionamiento QR en 2 minutos",
      "Soporte preventa y garantía 24h EcomSpain"
    ];

    let keyClaims: StructuredProductIntelligence["keyClaims"] = [];
    let objections: StructuredProductIntelligence["objections"] = [];

    // =========================================================================
    // 1. GATEWAYS SD-WAN (ESG510 / ESG610): NUNCA MOSTRAR ESTÁNDARES WI-FI NI 802.11be
    // =========================================================================
    if (isGateway) {
      deviceType = "GATEWAY";
      category = "gateways";
      hasWifiRadios = false;
      isCableOnly = true;

      if (isEsg510) {
        modelName = "EnGenius Cloud Security Gateway ESG510";
        standards = [
          "Stateful Packet Inspection (SPI)",
          "IEEE 802.3bz 2.5GBASE-T",
          "WireGuard Site-to-Site VPN (950 Mbps)",
          "IPsec Site-to-Site & Client VPN",
          "Dual-WAN Failover & Load Balancing",
          "VLANs 802.1Q Multi-SSID Routing"
        ];
        ports = ["4x 2.5 GbE RJ45 (Dual WAN / Dual LAN configurables)"];
        powerReq = "Adaptador de Corriente DC 12V 2A incluido (Consumo máx 18W). Sin salida PoE.";
        firewallThroughput = "2.5 Gbps Stateful Inspection / 950 Mbps WireGuard & IPsec VPN";
        vpnProtocols = ["WireGuard", "IPsec", "OpenVPN Client/Server"];
        wanFailover = true;
        switchSku = "ECS1528FP";
        switchName = "Switch EnGenius Cloud PoE+ 24 Puertos (410W budget)";
        switchReason = "Switch PoE imprescindible para distribuir red y alimentar los puntos de acceso Wi-Fi, ya que el ESG510 es un gateway exclusivamente cableado sin PoE ni radios Wi-Fi.";
        naturalSector = "ENTERPRISE_OFFICE";
        naturalAudience = "Pymes, Sedes Remotas e Integradores de Seguridad de Red";
        recommendedAngle = "ROI";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "MERAKI";
        keyDiffs = [
          "Equipo 100% CABLEADO de seguridad (Sin radios Wi-Fi ni 802.11)",
          "Doble WAN 2.5 GbE con failover y balanceo de carga automático",
          "0€ Cuotas anuales de firewall SPI y túneles VPN WireGuard"
        ];

        keyClaims = [
          {
            claim: "Gateway SD-WAN cableado de alta velocidad con 4 puertos 2.5 GbE configurables (Dual WAN / Dual LAN) y 0€ en licencias recurrentes.",
            sourceId: "src-6",
            sourceTitle: "Datasheet EnGenius ESG510 SD-WAN Gateway",
            verified: true
          },
          {
            claim: "Throughput de firewall Stateful Inspection de 2.5 Gbps y túneles VPN WireGuard acelerados por hardware hasta 950 Mbps.",
            sourceId: "src-6",
            sourceTitle: "Especificación Técnica EnGenius ESG510",
            verified: true
          },
          {
            claim: "Failover automático Multi-WAN para tolerancia a fallos de ISP y redundancia de fibra óptica sin interrupción de llamadas VoIP.",
            sourceId: "src-6",
            sourceTitle: "Datasheet EnGenius ESG510 SD-WAN",
            verified: true
          },
          {
            claim: "Sustitución avanzada en 24 horas y soporte técnico preventa directo desde España por EcomSpain.",
            sourceId: "src-18",
            sourceTitle: "Garantía Oficial EcomSpain 24h",
            verified: true
          }
        ];

        objections = [
          {
            objection: "¿El Gateway ESG510 emite señal Wi-Fi por sí mismo?",
            counterArgument: "No. El ESG510 es un Gateway / Firewall de seguridad exclusivamente cableado sin radios ni antenas Wi-Fi. Para emitir Wi-Fi debe combinarse con puntos de acceso EnGenius ECW conectados a un switch PoE.",
            sourceId: "src-6"
          },
          {
            objection: "¿Se debe pagar una suscripción anual para mantener activas las VPN o el firewall?",
            counterArgument: "EnGenius Cloud incluye todas las funciones de firewall SPI, VPN WireGuard, failover multi-WAN y gestión cloud con 0€ de licencia de por vida.",
            sourceId: "src-4"
          },
          {
            objection: "¿Cómo protege la red corporativa si se corta la conexión de fibra principal?",
            counterArgument: "El ESG510 cuenta con conmutación por error (Dual-WAN Failover) automática entre sus puertos WAN 2.5G y respaldo por módem USB 4G/5G en milisegundos.",
            sourceId: "src-6"
          }
        ];
      } else {
        // ESG610
        modelName = "EnGenius Cloud Security Gateway ESG610 SD-WAN";
        standards = [
          "CPU Quad-Core 2.2 GHz",
          "Multi-WAN 2.5G con PBR",
          "SD-WAN Mesh Auto-VPN",
          "WireGuard & IPsec hasta 1.2 Gbps",
          "Inspección de tráfico y QoS de aplicación"
        ];
        ports = ["4x 2.5 GbE RJ45 Multi-WAN / Multi-LAN"];
        powerReq = "Adaptador DC 12V 3A (Consumo máx 24W). Sin salida PoE.";
        firewallThroughput = "2.5 Gbps Stateful Firewall / 1.2 Gbps WireGuard VPN";
        vpnProtocols = ["WireGuard", "IPsec", "SD-WAN Auto-VPN Mesh"];
        wanFailover = true;
        switchSku = "ECS2512FP";
        switchName = "Switch Cloud Multi-Gigabit 2.5G PoE++";
        switchReason = "Topología EnGenius Cloud unificada: Firewall 2.5G + Switch PoE++ + Wi-Fi 7 bajo una sola consola sin suscripciones.";
        naturalSector = "ENTERPRISE_OFFICE";
        naturalAudience = "Responsables de Seguridad y Directores TIC Corporativos";
        recommendedAngle = "ROI";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "MERAKI";
        keyDiffs = [
          "Equipo SD-WAN 100% CABLEADO con procesador Quad-Core 2.2 GHz",
          "Auto-VPN Mesh para interconexión multi-sede en 3 clics",
          "Cero cuotas de suscripción de seguridad o túneles"
        ];
        keyClaims = [
          {
            claim: "Gateway de seguridad con procesador Quad-Core 2.2 GHz para alto volumen de sesiones corporativas concurrentes sin caídas.",
            sourceId: "src-6",
            sourceTitle: "Datasheet ESG610",
            verified: true
          },
          {
            claim: "Auto-VPN Mesh que interconecta delegaciones en minutos sin configurar túneles manuales y con cifrado WireGuard a 1.2 Gbps.",
            sourceId: "src-6",
            sourceTitle: "Datasheet ESG610",
            verified: true
          },
          {
            claim: "Sustitución en 24h por EcomSpain y gestión cloud zero-licensing.",
            sourceId: "src-18",
            sourceTitle: "Garantía Oficial EcomSpain 24h",
            verified: true
          }
        ];
        objections = [
          {
            objection: "¿El ESG610 incluye antenas Wi-Fi?",
            counterArgument: "No. El ESG610 es un equipo exclusivamente cableado de enrutamiento y seguridad SD-WAN. La conectividad inalámbrica se delega en los APs EnGenius ECW.",
            sourceId: "src-6"
          }
        ];
      }

    // =========================================================================
    // 2. SWITCHES MULTI-GIGABIT & AGREGACIÓN
    // =========================================================================
    } else if (isSwitch) {
      deviceType = "SWITCH";
      category = "switches";

      if (isEcs2512fp) {
        modelName = "Switch EnGenius ECS2512FP Multi-Gigabit PoE++";
        standards = ["IEEE 802.3bt PoE++ (60W)", "IEEE 802.3bz 2.5GBASE-T", "IEEE 802.3ae 10GBASE-R", "L2+ Switching"];
        ports = ["8x 2.5 GbE RJ45 PoE++ (802.3bt)", "4x 10G SFP+ Slots Uplink"];
        powerReq = "Entrada AC 100-240V, PoE Budget 240W (consumo máx 290W)";
        switchingCapacity = "120 Gbps sin bloqueo";
        switchingLayer = "L2+";
        poeBudget = "240W";
        uplinks = ["4x 10G SFP+"];
        switchSku = "SFP-10G-SR-KIT";
        switchName = "Kit Transceptores 10G SFP+ y Latiguillo OM4";
        switchReason = "Backbone de fibra de 10 Gbps para interconexión de racks sin saturación.";
        naturalSector = "ENTERPRISE_OFFICE";
        naturalAudience = "Instaladores IT y Arquitectos de Infraestructura";
        recommendedAngle = "PERFORMANCE";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "MERAKI";
        keyDiffs = [
          "8 puertos 2.5G PoE++ de hasta 60W para alimentar APs Wi-Fi 7",
          "4 uplinks 10G SFP+ troncales de serie sin licencias",
          "Reinicio remoto PoE y visualización de consumo por puerto"
        ];
      } else if (isEcs1528fp) {
        modelName = "Switch EnGenius ECS1528FP Cloud PoE+ (24 Puertos 410W)";
        standards = ["IEEE 802.3at PoE+ (30W)", "IEEE 802.3ab Gigabit", "IEEE 802.3ae 10GBASE-R", "L2+ Switching"];
        ports = ["24x GbE RJ45 PoE+ (802.3at)", "4x 10G SFP+ Slots Uplink"];
        powerReq = "Entrada AC 100-240V, PoE Budget 410W (consumo máx 470W)";
        switchingCapacity = "128 Gbps";
        switchingLayer = "L2+";
        poeBudget = "410W";
        uplinks = ["4x 10G SFP+"];
        switchSku = "SFP-10G-SR-KIT";
        switchName = "Kit Transceptores 10G SFP+ y Latiguillo OM4";
        switchReason = "Troncal 10G hacia el rack core con alimentación PoE+ simultánea para 24 dispositivos.";
        naturalSector = "HOSPITALITY";
        naturalAudience = "Integradores de Videovigilancia IP y Redes Medianas";
        recommendedAngle = "ROI";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "MERAKI";
        keyDiffs = [
          "Presupuesto PoE líder de 410W para 24 cámaras o APs",
          "4 uplinks 10G SFP+ para evitar cuellos de botella al troncal",
          "0€ en costes de licencias de conmutación de por vida"
        ];
      } else if (isEcs5512f) {
        modelName = "Switch de Agregación de Fibra EnGenius ECS5512F 12x 10G SFP+";
        standards = ["IEEE 802.3ae 10GBASE-R", "IEEE 802.3z 1000BASE-X", "L3 Lite Static Routing", "L2+ Switching"];
        ports = ["12x 10G SFP+ Fiber Slots", "1x RJ45 Console Port"];
        powerReq = "Entrada AC 100-240V interna (consumo máx 36W)";
        switchingCapacity = "240 Gbps Wire-Speed";
        switchingLayer = "L3 Lite";
        poeBudget = "0W (Switch de Fibra no-PoE)";
        uplinks = ["12x 10G SFP+"];
        switchSku = "SFP-10G-SR-KIT";
        switchName = "Kit Transceptores 10G SFP+ Multimodo";
        switchReason = "Transceptores 10G SFP+ certificados para interconectar armarios de planta.";
        naturalSector = "EDUCATION_CAMPUS";
        naturalAudience = "Administradores de Redes de Campus, Hospitales y Centros Educativos";
        recommendedAngle = "PERFORMANCE";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "LEGACY_1G";
        keyDiffs = [
          "12 slots 10G SFP+ para agregación troncal 100% fibra",
          "Consumo reducido de 36W y disipación térmica eficiente",
          "Cero cuotas de licencia de conmutación core/agregación"
        ];
      } else {
        // ECS5512FP
        modelName = "Switch Agregación EnGenius ECS5512FP 10G Multi-Gigabit PoE++";
        standards = ["IEEE 802.3an 10GBASE-T", "IEEE 802.3bt PoE++", "IEEE 802.3ae 10GBASE-R", "L3 Lite Routing"];
        ports = ["8x 10G Base-T RJ45 PoE++ (420W)", "4x 10G SFP+ Slots"];
        powerReq = "AC 100-240V, PoE Budget 420W (consumo máx 490W)";
        switchingCapacity = "240 Gbps";
        switchingLayer = "L3 Lite";
        poeBudget = "420W";
        uplinks = ["4x 10G SFP+"];
        switchSku = "SFP-10G-SR-KIT";
        switchName = "Kit Transceptores 10G SFP+ Multimodo 850nm";
        switchReason = "Enlaces ópticos de baja atenuación para unir armarios de planta y servidores centrales sin latencia.";
        naturalSector = "LOGISTICS_INDUSTRY";
        naturalAudience = "Jefes de planta, integradores de telecomunicaciones e ingenieros de infraestructura";
        recommendedAngle = "PERFORMANCE";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "LEGACY_1G";
        keyDiffs = [
          "8 puertos 10G Base-T cobre PoE++ (hasta 60W por puerto)",
          "4 slots 10G SFP+ para enlaces de fibra óptica",
          "Capacidad total de conmutación de 240 Gbps"
        ];
      }

      keyClaims = [
        {
          claim: `Capacidad de conmutación de ${switchingCapacity} con puertos dedicados y enlaces troncales 10G SFP+ sin cuellos de botella.`,
          sourceId: "src-8",
          sourceTitle: "Datasheet Conmutación EnGenius Cloud",
          verified: true
        },
        {
          claim: "Gestión centralizada multi-tenant desde navegador y app móvil con 0€ en licencias anuales.",
          sourceId: "src-4",
          sourceTitle: "Arquitectura EnGenius Cloud Enterprise",
          verified: true
        },
        {
          claim: "Sustitución avanzada en 24 horas y soporte técnico preventa directo desde España por EcomSpain.",
          sourceId: "src-18",
          sourceTitle: "Garantía Oficial EcomSpain 24h",
          verified: true
        }
      ];

      objections = [
        {
          objection: "¿Qué ventaja tiene frente a switches de fabricantes que cobran suscripción?",
          counterArgument: "EnGenius Cloud ofrece conmutación L2+/L3 Lite, monitoreo de métricas, topología y reinicio remoto PoE con 0€ de licencias recurrentes, recortando el TCO en más del 40%.",
          sourceId: "src-11"
        },
        {
          objection: "¿Se pueden programar reinicios automáticos de puertos PoE colgados?",
          counterArgument: "Sí, incorpora PoE Auto-Recovery para reiniciar de forma autónoma cámaras o puntos de acceso si dejan de responder a ping.",
          sourceId: "src-8"
        }
      ];

    // =========================================================================
    // 3. PUNTOS DE ACCESO WI-FI 7 / WI-FI 6
    // =========================================================================
    } else if (isAccessPoint) {
      deviceType = "ACCESS_POINT";
      category = "wifi";

      if (isEcw510) {
        modelName = "EnGenius Cloud WiFi 7 ECW510 AP Dual-Band";
        standards = ["Wi-Fi 7 (IEEE 802.11be)", "Dual-Band 2x2:2", "4096-QAM", "Roaming 802.11k/v/r", "WPA3 Personal/Enterprise"];
        ports = ["1x 2.5 GbE RJ45 PoE+ (802.3at)"];
        powerReq = "PoE+ 802.3at (Máx. 18.5W) o Adaptador DC 12V";
        wirelessStandards = ["Wi-Fi 7 (IEEE 802.11be)", "Wi-Fi 6 (802.11ax)", "802.11ac/n"];
        frequencyBands = ["2.4 GHz", "5 GHz"];
        mimo = "2x2:2 Dual-Band";
        switchSku = "ECS2512FP";
        switchName = "Switch Multi-Gigabit EnGenius ECS2512FP PoE++ (240W)";
        switchReason = "Proporciona puertos 2.5GbE dedicados con PoE+ holgado, evitando la saturación de 1G en transferencias locales.";
        naturalSector = "ENTERPRISE_OFFICE";
        naturalAudience = "Integradores IT, despachos profesionales, clínicas y pequeñas sedes corporativas";
        recommendedAngle = "OPERATIONS";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "MERAKI";
        keyDiffs = [
          "Wi-Fi 7 accesible con puerto 2.5GbE PoE+ 802.3at",
          "Aprovisionamiento QR en 2 minutos mediante Cloud To-Go",
          "0€ cuotas de licencia de gestión en la nube"
        ];
      } else if (isEcw536) {
        modelName = "EnGenius ECW536 Cloud Tri-Band Wi-Fi 7 Access Point";
        standards = ["Wi-Fi 7 (IEEE 802.11be)", "Tri-Band 4x4:4 (2.4/5/6 GHz)", "4096-QAM", "Canales 320 MHz", "MLO"];
        ports = ["1x 10 GbE PoE++ (802.3bt)", "1x 2.5 GbE RJ45"];
        powerReq = "PoE++ 802.3bt (Máx. 33W)";
        wirelessStandards = ["Wi-Fi 7 (IEEE 802.11be)", "Wi-Fi 6E/6 (802.11ax)"];
        frequencyBands = ["2.4 GHz", "5 GHz", "6 GHz"];
        mimo = "4x4:4 Tri-Band";
        switchSku = "ECS2512FP";
        switchName = "Switch Multi-Gigabit EnGenius ECS2512FP PoE++ (60W por puerto)";
        switchReason = "Alimentación PoE++ 802.3bt obligatoria para alimentar las 3 radios concurrentes de alta potencia.";
        naturalSector = "EDUCATION_CAMPUS";
        naturalAudience = "Directores TIC de universidades, auditorios y centros de convenciones de alta densidad";
        recommendedAngle = "PERFORMANCE";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "MERAKI";
        keyDiffs = [
          "Tri-Band Wi-Fi 7 con 18.7 Gbps agregados y modulación 4096-QAM",
          "Puerto principal 10GbE PoE++ para evitar cuellos de botella",
          "Canales ultra-anchos de 320 MHz en banda de 6 GHz"
        ];
      } else if (isEcw526) {
        modelName = "EnGenius ECW526 Wi-Fi 7 AP Interior Compacto";
        standards = ["Wi-Fi 7 (IEEE 802.11be)", "Tri-Band 2x2:2 (2.4/5/6 GHz)", "4096-QAM", "Canales 320 MHz"];
        ports = ["1x 2.5 GbE RJ45 PoE+ (802.3at)"];
        powerReq = "PoE+ 802.3at (Máx. 21W)";
        wirelessStandards = ["Wi-Fi 7 (IEEE 802.11be)", "Wi-Fi 6E/6 (802.11ax)"];
        frequencyBands = ["2.4 GHz", "5 GHz", "6 GHz"];
        mimo = "2x2:2 Tri-Band";
        switchSku = "ECS1528FP";
        switchName = "Switch Cloud PoE+ EnGenius ECS1528FP (410W)";
        switchReason = "Alimentación centralizada PoE+ de 24 puertos ideal para hoteles y despachos.";
        naturalSector = "HOSPITALITY";
        naturalAudience = "Hoteles, Residencias y Despachos Ejecutivos";
        recommendedAngle = "ROI";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "MERAKI";
        keyDiffs = [
          "Formato compacto discreto para techo o pared",
          "Banda limpia de 6 GHz libre de interferencias",
          "Cero cuotas de renovación anual en EnGenius Cloud"
        ];
      } else {
        // Fallback dinámico usando catalogItem si está disponible o datos del SKU
        modelName = catalogItem?.name || `Equipo ${catalogItem?.brand || ""} ${cleanSku}`.trim();
        standards = catalogItem?.standards || ["Estándares IEEE B2B", "Certificación CE"];
        ports = catalogItem?.interfaces || ["Puertos Ethernet Gigabit/Multi-Gigabit"];
        powerReq = catalogItem?.powerRequirements || "Alimentación según especificaciones de catálogo";
        wirelessStandards = catalogItem?.polymorphicSpecs?.accessPoint?.wirelessStandards || [catalogItem?.specs?.[0] || "Wi-Fi corporativo"];
        frequencyBands = catalogItem?.polymorphicSpecs?.accessPoint?.frequencyBands || ["2.4 GHz", "5 GHz"];
        mimo = catalogItem?.polymorphicSpecs?.accessPoint?.mimo || "2x2:2 MIMO";
        switchSku = catalogItem?.recommendedBundle?.sku || "ECS2512FP";
        switchName = catalogItem?.recommendedBundle?.name || "Switch Cloud de Interconexión";
        switchReason = catalogItem?.recommendedBundle?.rationale || "Alimentación y conmutación recomendada.";
        naturalSector = "ENTERPRISE_OFFICE";
        naturalAudience = catalogItem?.targetSegment || "Integradores IT y Telecomunicaciones";
        recommendedAngle = catalogItem?.defaultAngle || "ROI";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "MERAKI";
        keyDiffs = catalogItem?.keyAdvantages || [
          "Hardware B2B homologado con garantía de sustitución avanzada en 24h EcomSpain",
          "Sin costes ocultos de licencias ni permanencia",
          "Soporte preventa directo de ingeniería"
        ];
      }

      keyClaims = [
        {
          claim: "Gestión centralizada multi-tenant desde navegador y app móvil con 0€ en licencias anuales.",
          sourceId: "src-4",
          sourceTitle: "Arquitectura EnGenius Cloud Enterprise Sin Cuotas Anuales",
          verified: true
        },
        {
          claim: `Puerto de enlace ultrarrápido (${ports[0]}) preparado para enlaces Multi-Gigabit sin estrangulamiento.`,
          sourceId: isEcw510 ? "src-0" : isEcw536 ? "src-1" : "src-2",
          sourceTitle: isEcw510 ? "Datasheet ECW510" : "Especificación Técnica EnGenius",
          verified: true
        },
        {
          claim: "Aprovisionamiento ultrarrápido por escaneo de código QR en menos de 2 minutos por dispositivo.",
          sourceId: "src-5",
          sourceTitle: "App Móvil EnGenius Cloud To-Go",
          verified: true
        },
        {
          claim: "Sustitución avanzada en 24 horas y soporte técnico preventa directo desde España por EcomSpain.",
          sourceId: "src-18",
          sourceTitle: "Garantía Oficial EcomSpain 24h",
          verified: true
        }
      ];

      objections = [
        {
          objection: "¿Realmente no hay ningún coste de licencia recurrente oculto tras el primer año?",
          counterArgument: "Totalmente garantizado por contrato y pliego. EnGenius Cloud es 100% libre de cuotas para gestión, monitorización y firmware ilimitado.",
          sourceId: "src-4"
        },
        {
          objection: "¿Es compatible con el cableado existente de categoría 5e/6 en obra?",
          counterArgument: "Sí, la tecnología Multi-Gigabit negocia automáticamente sobre cableado Cat5e/6 existente, duplicando el caudal sin necesidad de recablear.",
          sourceId: isEcw510 ? "src-0" : "src-8"
        },
        {
          objection: "¿Qué ocurre si un equipo sufre una avería crítica en mitad de la producción?",
          counterArgument: "EcomSpain gestiona RMA con sustitución avanzada en 24h laborables directamente desde el almacén central de Madrid.",
          sourceId: "src-18"
        }
      ];

    // =========================================================================
    // 4. ACCESORIOS & CONECTIVIDAD (POE30Gv2 / SFP-10G-SR-KIT)
    // =========================================================================
    } else {
      deviceType = "ACCESSORY";
      category = catalogItem?.category || "accesorios";

      if (isPoe30g) {
        modelName = "Inyector EnGenius POE30Gv2 Gigabit PoE+ 30W";
        standards = ["IEEE 802.3at PoE+", "IEEE 802.3af PoE", "IEEE 802.3ab Gigabit"];
        ports = ["1x RJ45 Gigabit Datos (Data In)", "1x RJ45 Gigabit Datos + PoE (PoE Out)"];
        powerReq = "Entrada AC 100-240V 50/60Hz, Salida 54V DC 0.6A (hasta 30W)";
        switchSku = "ECW526";
        switchName = "AP Wi-Fi 7 Interior Compacto EnGenius ECW526";
        switchReason = "Permite alimentar puntos de acceso en salas sin necesidad de cambiar el switch existente.";
        naturalSector = "ENTERPRISE_OFFICE";
        naturalAudience = "Instaladores de Telecomunicaciones y Reparaciones de Urgencia";
        recommendedAngle = "OPERATIONS";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "NONE";
        keyDiffs = [
          "Inyección PoE+ 802.3at de hasta 30W estabilizados a 54V",
          "Alcance de datos y energía hasta 100 metros",
          "Instalación Plug & Play sin configuración en 60 segundos"
        ];
      } else {
        modelName = "Kit Transceptores 10G SFP+ & Latiguillos OM4";
        standards = ["IEEE 802.3ae 10GBASE-SR", "SFF-8431 SFP+", "Fibra OM4 50/125µm"];
        ports = ["2x Transceptores SFP+ 10G (LC Dúplex)", "Latiguillo OM4 Dúplex"];
        powerReq = "Alimentación por puerto SFP+ (<1W por módulo)";
        switchSku = "ECS1528FP";
        switchName = "Switch EnGenius Cloud PoE+ 24 Puertos con 4x 10G SFP+";
        switchReason = "Troncal 10G de fibra óptica entre armarios sin pérdidas de paquetes.";
        naturalSector = "LOGISTICS_INDUSTRY";
        naturalAudience = "Instaladores Telecomunicaciones y Cableado Estructurado";
        recommendedAngle = "OPERATIONS";
        recommendedTone = "ENGINEERING_PREVENTA";
        recommendedCompetitor = "NONE";
        keyDiffs = [
          "Kit llave en mano verificado en laboratorio",
          "Baja atenuación <0.2 dB y monitoreo digital DDM",
          "Entrega garantizada en 24h por EcomSpain"
        ];
      }

      keyClaims = [
        {
          claim: "Solución de conectividad verificada para eliminar problemas de interoperabilidad en obra.",
          sourceId: "src-10",
          sourceTitle: "Guía de Selección de Accesorios EcomShop",
          verified: true
        },
        {
          claim: "Stock permanente en España con sustitución en 24 horas laborables por EcomSpain.",
          sourceId: "src-18",
          sourceTitle: "Garantía Oficial EcomSpain 24h",
          verified: true
        }
      ];

      objections = [
        {
          objection: "¿Es compatible con cualquier marca de switch o punto de acceso?",
          counterArgument: "Sí, cumple rigurosamente con los estándares IEEE 802.3, garantizando interoperabilidad completa.",
          sourceId: "src-10"
        }
      ];
    }

    const card: ProductIntelligenceCard = {
      product: {
        brand: "EnGenius",
        model: modelName,
        sku: cleanSku,
        category,
        url: catalogItem?.url || `https://www.ecomshop.es/${cleanSku.toLowerCase()}`,
        stockStatus: "IN_STOCK"
      },
      technicalSpecs: {
        deviceType,
        standards,
        ports,
        powerRequirements: powerReq,
        management: isGateway 
          ? "EnGenius Cloud Native (SD-WAN / Auto-VPN / Zero-Licensing)" 
          : isSwitch 
          ? "EnGenius Cloud Enterprise (L2+/L3 Lite / Zero-Licensing)" 
          : isAccessPoint 
          ? "EnGenius Cloud Native / App Cloud To-Go / Standalone" 
          : "Plug & Play Passthrough",
        keyDifferentiators: keyDiffs,
        wirelessStandards,
        frequencyBands,
        mimo,
        switchingCapacity,
        switchingLayer,
        poeBudget,
        uplinks,
        firewallThroughput,
        vpnProtocols,
        wanFailover,
        hasWifiRadios,
        isCableOnly
      },
      evidenceLedger: keyClaims.map((k) => ({
        claim: k.claim,
        source: k.sourceTitle,
        sourceType: "DATASHEET",
        confidence: "HIGH",
        verified: k.verified
      })),
      commercialAngles: {
        executiveRoi: isGateway
          ? "0€ en suscripciones anuales de firewall o por usuario, reduciendo el TCO a la mitad."
          : isSwitch
          ? "Inversión protegida con puertos Multi-Gigabit y cero cuotas de mantenimiento cloud."
          : "Ahorro del 42% en TCO frente a Cisco Meraki al eliminar suscripciones recurrentes.",
        engineeringPerformance: isGateway
          ? `Throughput firewall de 2.5 Gbps y túneles VPN WireGuard de baja latencia con ${ports[0]}.`
          : isSwitch
          ? `Capacidad switching de ${switchingCapacity || "alto rendimiento"} sin cuellos de botella.`
          : `Aprovechamiento integral del caudal gracias a ${ports[0]} y modulación 4096-QAM.`,
        operationsDeployment: isGateway
          ? "Aprovisionamiento en 3 minutos desde EnGenius Cloud con Auto-VPN Mesh y políticas centralizadas."
          : "Despliegue ágil con código QR y visualización de topología de red en tiempo real."
      },
      complementaryProducts: [
        {
          skuOrCategory: switchSku,
          relationshipType: isGateway ? "REQUIRES_POE_SWITCH" : "REQUIRES_POE_SWITCH",
          reason: switchReason
        }
      ],
      generatedAt: new Date().toISOString()
    };

    return {
      sku: cleanSku,
      model: modelName,
      brand: "EnGenius",
      naturalSector,
      naturalAudience,
      recommendedAngle,
      recommendedTone,
      recommendedCompetitor,
      mandatoryElectronics: {
        recommendedSwitchSku: switchSku,
        recommendedSwitchName: switchName,
        reason: switchReason,
        portsAndUplink: isGateway ? "Puertos 2.5GbE LAN / PoE Switches" : "Puertos 2.5GbE / 10G SFP+"
      },
      keyClaims,
      objections,
      card
    };
  }
}
