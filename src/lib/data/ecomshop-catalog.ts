import { BusinessGoal } from "../types/editorial-controls";

export type DeviceType = "ACCESS_POINT" | "SWITCH" | "GATEWAY" | "ACCESSORY";

export interface CatalogProductBundle {
  sku: string;
  name: string;
  relationshipType: "REQUIRES_POE_SWITCH" | "ACCESSORY" | "COMPATIBLE_TRANSCEIVER";
  rationale: string;
}

export interface CatalogNotebookSource {
  sourceId: string;
  title: string;
  type: "datasheet" | "pdf" | "note" | "url";
  url?: string;
  rationale: string;
}

export interface CatalogCommercialAngles {
  executiveRoi: string;
  engineeringPerformance: string;
  operationsDeployment: string;
}

// Especificaciones técnicas polimórficas
export interface AccessPointSpecs {
  wirelessStandards: string[];
  frequencyBands: string[];
  mimo: string;
  channelWidth?: string;
  modulation?: string;
  maxPhysicalRate?: string;
  mloSupport?: boolean;
  roamingStandards?: string[];
  poeInput: string;
  ethernetPorts: string[];
}

export interface SwitchSpecs {
  switchingCapacityGbps: number;
  forwardingRateMpps?: number;
  switchingLayer: "L2+" | "L3 Lite" | "L3";
  portDensity: string;
  poeStandard?: "802.3af" | "802.3at" | "802.3bt";
  poeBudgetWatts?: number;
  maxPowerPerPortWatts?: number;
  uplinkPorts: string[];
}

export interface GatewaySpecs {
  firewallThroughput: string;
  vpnThroughput: string;
  vpnProtocols: string[];
  wanPorts: string;
  lanPorts: string;
  wanFailover: boolean;
  routingFeatures: string[];
  hasWifiRadios: false; // estrictamente tipado false para evitar alucinaciones
}

export interface AccessorySpecs {
  powerOutputWatts?: number;
  voltageOutput?: string;
  poeStandardOutput?: string;
  networkInterfaces: string[];
  maxDistanceMeters?: number;
  protectionFeatures?: string[];
}

export interface PolymorphicSpecs {
  accessPoint?: AccessPointSpecs;
  switch?: SwitchSpecs;
  gateway?: GatewaySpecs;
  accessory?: AccessorySpecs;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  model: string;
  name: string;
  brand: string;
  deviceType: DeviceType;
  category: "wifi" | "switches" | "gateways" | "fibra" | "accesorios" | "engenius";
  description: string;
  url: string;
  imageUrl: string;
  priceEur: number;
  wholesalePriceEur?: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";

  // Especificaciones técnicas unificadas
  specs: string[];
  interfaces: string[];
  powerRequirements: string;
  poeType: "802.3af" | "802.3at" | "802.3bt" | "DC_PASSIVE" | "NONE";
  powerConsumptionWatts: number;
  poeBudgetWatts?: number;
  managementMode: "Cloud" | "On-Premise" | "Hybrid" | "Standalone";
  standards: string[];
  firewallThroughput?: string;
  fiberLinks?: string;
  keyAdvantages: string[];
  antiHallucinationNotes?: string[];

  // Detalle polimórfico tipado
  polymorphicSpecs?: PolymorphicSpecs;

  // Cross-selling & Bundling
  recommendedBundle: CatalogProductBundle;

  // Grounding oficial en NotebookLM
  notebookSource: CatalogNotebookSource;
  /** Alias de notebookSource usado por evidence-engine y product-brain */
  notebookCitation?: CatalogNotebookSource;
  /** ID directo de la fuente del notebook */
  notebookSourceId?: string;
  additionalSourceIds?: string[];

  // Cross-selling detallado (usado por opportunity-radar y product-intelligence-service)
  bundleDetails?: {
    sku: string;
    name: string;
    suggestedSku: string;
    suggestedName: string;
    relationshipType: "ACCESSORY" | "REQUIRES_POE_SWITCH" | "COMPATIBLE_TRANSCEIVER";
    rationale: string;
    estimatedUplift?: number;
  };

  // Especificaciones crudas para IA (usado por product-brain)
  rawSpecs?: string[];

  // Radar de Oportunidades & Afinidad comercial
  actionTitle: string;
  targetSegment: string;
  defaultAngle: "ROI" | "PERFORMANCE" | "OPERATIONS";
  commercialAngles: CatalogCommercialAngles;
  sectorAffinity: Record<string, number>;
  businessGoalAffinity: Record<BusinessGoal, number>;
}

export const ECOMSHOP_FULL_CATALOG: CatalogProduct[] = [
  // ==========================================
  // 1. PUNTOS DE ACCESO WI-FI 7 / WI-FI 6
  // ==========================================
  {
    id: "ecw536",
    sku: "ECW536",
    model: "ECW536",
    name: "EnGenius ECW536 Cloud Tri-Band Wi-Fi 7 Access Point",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Punto de acceso Tri-Band Wi-Fi 7 corporativo de ultra alta densidad gestionado 100% en EnGenius Cloud, con 18.7 Gbps agregados y puerto 10GbE PoE++.",
    url: "https://www.ecomshop.es/engenius-ecw536",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/ECW536-2.jpg?v=1745267297&width=1445",
    priceEur: 599,
    wholesalePriceEur: 429,
    stockStatus: "IN_STOCK",
    specs: [
      "Tri-Band Wi-Fi 7 simultáneo en 2.4 GHz, 5 GHz y 6 GHz",
      "Velocidad agregada ultra-alta de hasta 18.7 Gbps",
      "Puerto principal 10 GbE PoE++ (802.3bt) + Puerto secundario 2.5 GbE",
      "Canales ultra-anchos de 320 MHz y modulación 4096-QAM",
      "Multi-Link Operation (MLO) y Preamble Puncturing para cero latencia",
      "Gestión centralizada en EnGenius Cloud con zero-licensing"
    ],
    interfaces: ["1x 10 GbE RJ45 (PoE++ 802.3bt)", "1x 2.5 GbE RJ45 LAN"],
    powerRequirements: "Alimentación PoE++ (IEEE 802.3bt, hasta 33W) o adaptador de corriente 54V DC",
    poeType: "802.3bt",
    powerConsumptionWatts: 33,
    managementMode: "Cloud",
    standards: [
      "Wi-Fi 7 (IEEE 802.11be)",
      "Tri-Band 4x4:4 (2.4/5/6 GHz)",
      "IEEE 802.3bt PoE++",
      "WPA3 Enterprise",
      "Multi-Link Operation (MLO)",
      "Target Wake Time (TWT)"
    ],
    polymorphicSpecs: {
      accessPoint: {
        wirelessStandards: ["Wi-Fi 7 (IEEE 802.11be)", "Wi-Fi 6E/6 (802.11ax)", "802.11a/b/g/n/ac"],
        frequencyBands: ["2.4 GHz", "5 GHz", "6 GHz"],
        mimo: "4x4:4 Tri-Band",
        channelWidth: "Hasta 320 MHz (Banda 6 GHz)",
        modulation: "4096-QAM",
        maxPhysicalRate: "18.7 Gbps agregados",
        mloSupport: true,
        roamingStandards: ["802.11k", "802.11v", "802.11r"],
        poeInput: "PoE++ IEEE 802.3bt (33W máx)",
        ethernetPorts: ["1x 10 GbE RJ45", "1x 2.5 GbE RJ45"]
      }
    },
    keyAdvantages: [
      "Throughput de 18.7 Gbps para entornos con miles de clientes concurrentes (auditorios, hoteles, sedes)",
      "Puerto 10 GbE que erradica por completo los cuellos de botella de 1G/2.5G",
      "Cero costes de licencias recurrentes o suscripciones anuales",
      "Soporte preventa de ingeniería y sustitución avanzada en 24h por EcomSpain"
    ],
    antiHallucinationNotes: [
      "Requiere conmutación PoE++ 802.3bt (33W máx) para operar sus 3 bandas a máxima potencia. Con PoE+ 802.3at se limitan cadenas de RF.",
      "No incluye inyector ni switch en el embalaje base de serie."
    ],
    recommendedBundle: {
      sku: "ECS2512FP",
      name: "Switch Cloud Multi-Gigabit 2.5G PoE++ (8x 2.5G + 4x 10G SFP+)",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Puerto 10GbE del AP alimentado a 60W PoE++ 802.3bt para eliminar cuellos de botella y suministrar los 33W necesarios."
    },
    notebookSource: {
      sourceId: "src-1",
      title: "EnGenius Cloud WiFi 7 ECW536 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw536",
      rationale: "Ficha técnica oficial de EnGenius Cloud Wi-Fi 7 ECW536 en el catálogo oficial de EcomShop."
    },
    additionalSourceIds: ["src-4", "src-8"],
    actionTitle: "Oportunidad Wi-Fi 7 Tri-Band: Despliegue de Alta Densidad ECW536",
    targetSegment: "Oficinas Corporativas, Auditorios y Sedes Centrales",
    defaultAngle: "PERFORMANCE",
    commercialAngles: {
      executiveRoi: "Ahorro superior al 42% en TCO frente a Cisco Meraki al eliminar suscripciones obligatorias de gestión cloud.",
      engineeringPerformance: "Rendimiento máximo sin cuellos de botella con puerto 10GbE nativo, canales de 320 MHz y modulación 4096-QAM.",
      operationsDeployment: "Aprovisionamiento masivo de sedes en 2 minutos mediante escaneo QR y topología en tiempo real."
    },
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
    id: "ecw510",
    sku: "ECW510",
    model: "ECW510",
    name: "EnGenius Cloud WiFi 7 ECW510 AP Dual-Band",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Punto de acceso Wi-Fi 7 Dual-Band ultracompacto con puerto 2.5GbE PoE+, modulación 4096-QAM, roaming 802.11k/v/r y aprovisionamiento QR en 2 minutos.",
    url: "https://www.ecomshop.es/engenius-ecw510",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_Access_Point_InD_ECW526_Front_View_907d4351-407d-4679-8491-99e6307ad5d1.jpg",
    priceEur: 389,
    wholesalePriceEur: 279,
    stockStatus: "IN_STOCK",
    specs: [
      "Wi-Fi 7 Dual-Band concurrente (2.4 GHz + 5 GHz)",
      "Puerto 2.5 GbE RJ45 con PoE+ 802.3at",
      "Modulación 4096-QAM y canales de 160 MHz",
      "Roaming asistido 802.11k/v/r para movilidad fluida",
      "Aprovisionamiento instantáneo con app EnGenius Cloud To-Go"
    ],
    interfaces: ["1x 2.5 GbE RJ45 (PoE+ 802.3at)"],
    powerRequirements: "Alimentación PoE+ 802.3at (consumo máx 18W)",
    poeType: "802.3at",
    powerConsumptionWatts: 18,
    managementMode: "Cloud",
    standards: [
      "Wi-Fi 7 (IEEE 802.11be)",
      "Dual-Band 2x2:2 (2.4/5 GHz)",
      "IEEE 802.3at PoE+",
      "IEEE 802.3bz 2.5GBASE-T",
      "WPA3 Enterprise / Personal",
      "802.11k/v/r Fast Roaming"
    ],
    polymorphicSpecs: {
      accessPoint: {
        wirelessStandards: ["Wi-Fi 7 (IEEE 802.11be)", "Wi-Fi 6 (802.11ax)", "802.11ac/n"],
        frequencyBands: ["2.4 GHz", "5 GHz"],
        mimo: "2x2:2 Dual-Band",
        channelWidth: "Hasta 160 MHz",
        modulation: "4096-QAM",
        maxPhysicalRate: "Hasta 3.6 Gbps agregados",
        mloSupport: true,
        roamingStandards: ["802.11k", "802.11v", "802.11r"],
        poeInput: "PoE+ IEEE 802.3at (18W máx)",
        ethernetPorts: ["1x 2.5 GbE RJ45"]
      }
    },
    keyAdvantages: [
      "Coste optimizado para modernizar redes corporativas y pymes a Wi-Fi 7",
      "Puerto 2.5G que duplica el ancho de banda del estándar 1G tradicional",
      "Puesta en marcha express en 2 minutos mediante escaneo QR",
      "Gestión Cloud sin costes de renovación anual"
    ],
    antiHallucinationNotes: [
      "Es un equipo Dual-Band (2.4 y 5 GHz); para radio de 6 GHz dedicada se debe optar por ECW526 o ECW536 Tri-Band.",
      "Requiere alimentación PoE+ (18W) vía switch o inyector Gigabit."
    ],
    recommendedBundle: {
      sku: "ECS2512FP",
      name: "Switch Cloud Multi-Gigabit 2.5G PoE++",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Uplink Multi-Gigabit 2.5G garantizado para tráfico concurrente y videoconferencias sin saturación."
    },
    notebookSource: {
      sourceId: "src-0",
      title: "EnGenius Cloud WiFi 7 ECW510 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw510",
      rationale: "Datasheet oficial de EnGenius ECW510 en el repositorio del Master Notebook de EcomShop."
    },
    additionalSourceIds: ["src-5", "src-18"],
    actionTitle: "Oportunidad Wi-Fi 7 Eficiente: ECW510 con Aprovisionamiento QR 2min",
    targetSegment: "Integradores de Redes Corporativas y Pymes Avanzadas",
    defaultAngle: "OPERATIONS",
    commercialAngles: {
      executiveRoi: "Paso directo a Wi-Fi 7 con presupuesto ajustado y cero cuotas de plataforma cloud.",
      engineeringPerformance: "Banda de 5 GHz con 4096-QAM y enlace 2.5 GbE para exprimir conexiones de fibra óptica modernas.",
      operationsDeployment: "Aprovisionamiento masivo de sedes remotas en 2 minutos mediante app móvil Cloud To-Go."
    },
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
    id: "ecw526",
    sku: "ECW526",
    model: "ECW526",
    name: "EnGenius ECW526 Wi-Fi 7 AP Interior Compacto",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Punto de acceso Wi-Fi 7 compacto Tri-Band 2x2x2 para despachos, hoteles y salas de reuniones con puerto 2.5GbE PoE+.",
    url: "https://www.ecomshop.es/engenius-ecw526",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_Access_Point_InD_ECW526_Front_View_907d4351-407d-4679-8491-99e6307ad5d1.jpg",
    priceEur: 299,
    wholesalePriceEur: 215,
    stockStatus: "IN_STOCK",
    specs: [
      "Tri-Band Wi-Fi 7 2x2x2 (2.4 GHz, 5 GHz y 6 GHz)",
      "Puerto 2.5 GbE RJ45 PoE+ (802.3at)",
      "Diseño ultra discreto para techo o pared",
      "Soporte Multi-Link Operation (MLO) y modulación 4096-QAM",
      "Monitoreo centralizado y zero-licensing en EnGenius Cloud"
    ],
    interfaces: ["1x 2.5 GbE RJ45 (PoE+ 802.3at)"],
    powerRequirements: "Alimentación PoE+ 802.3at (consumo máx 21W)",
    poeType: "802.3at",
    powerConsumptionWatts: 21,
    managementMode: "Cloud",
    standards: [
      "Wi-Fi 7 (IEEE 802.11be)",
      "Tri-Band 2x2:2 (2.4/5/6 GHz)",
      "IEEE 802.3at PoE+",
      "IEEE 802.3bz 2.5GBASE-T",
      "WPA3 Enterprise"
    ],
    polymorphicSpecs: {
      accessPoint: {
        wirelessStandards: ["Wi-Fi 7 (IEEE 802.11be)", "Wi-Fi 6E/6 (802.11ax)", "802.11ac"],
        frequencyBands: ["2.4 GHz", "5 GHz", "6 GHz"],
        mimo: "2x2:2 Tri-Band",
        channelWidth: "Hasta 320 MHz (Banda 6 GHz)",
        modulation: "4096-QAM",
        maxPhysicalRate: "Hasta 9.4 Gbps agregados",
        mloSupport: true,
        roamingStandards: ["802.11k", "802.11v", "802.11r"],
        poeInput: "PoE+ IEEE 802.3at (21W máx)",
        ethernetPorts: ["1x 2.5 GbE RJ45"]
      }
    },
    keyAdvantages: [
      "Formato compacto ideal para cobertura in-room en hoteles, residencias y despachos directivos",
      "Acceso a la banda limpia de 6 GHz libre de interferencias de radar o microondas",
      "Gestión remota multi-tenant sin pagar suscripciones a terceros"
    ],
    antiHallucinationNotes: [
      "Diseñado para interiores; no cuenta con certificación IP para intemperie (para exteriores usar ECW546).",
      "Funciona con PoE+ 802.3at (21W)."
    ],
    recommendedBundle: {
      sku: "ECS1528FP",
      name: "Switch Cloud PoE+ 24 Puertos (410W budget)",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Alimentación centralizada para decenas de APs por planta sin ruido y con bajo consumo."
    },
    notebookSource: {
      sourceId: "src-2",
      title: "EnGenius ECW526 WiFi 7 AP Interior Compacto",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw526",
      rationale: "Datasheet del AP compacto Tri-Band ECW526 en el catálogo oficial de EcomShop."
    },
    additionalSourceIds: ["src-4", "src-11"],
    actionTitle: "Oportunidad Hospitality: Cobertura In-Room y Despachos con ECW526",
    targetSegment: "Hoteles, Residencias y Despachos Ejecutivos",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Máxima rentabilidad por habitación hotelera con Wi-Fi 7 de última generación y cero costes recurrentes.",
      engineeringPerformance: "Banda de 6 GHz que elimina quejas de huéspedes y directivos por interferencias o cortes en streaming.",
      operationsDeployment: "Montaje empotrado ultra-rápido en techo o caja universal con aprovisionamiento por app."
    },
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
    id: "ecw546",
    sku: "ECW546",
    model: "ECW546",
    name: "EnGenius ECW546 Outdoor Wi-Fi 7 AP IP67",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Punto de acceso Tri-Band Wi-Fi 7 de exterior reforzado con protección IP67 y sobretensiones 6kV para naves, terrazas y recintos industriales.",
    url: "https://www.ecomshop.es/engenius-ecw546-outdoor",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/ECW536-2.jpg?v=1745267297&width=1445",
    priceEur: 649,
    wholesalePriceEur: 465,
    stockStatus: "IN_STOCK",
    specs: [
      "Wi-Fi 7 Tri-Band de exterior con chasis industrial de fundición",
      "Certificación estanca IP67 contra polvo, lluvia y salitre",
      "Protección contra sobretensiones y rayos integrada de 6kV",
      "Puerto 10 GbE PoE++ (802.3bt) + Puerto 2.5 GbE secundario",
      "Rango de temperatura operativa de -20ºC a +60ºC"
    ],
    interfaces: ["1x 10 GbE RJ45 (PoE++ 802.3bt)", "1x 2.5 GbE RJ45 LAN"],
    powerRequirements: "Alimentación PoE++ 802.3bt (consumo máx 35W)",
    poeType: "802.3bt",
    powerConsumptionWatts: 35,
    managementMode: "Cloud",
    standards: [
      "Wi-Fi 7 (IEEE 802.11be)",
      "Protección IP67",
      "Protección sobretensiones 6kV",
      "IEEE 802.3bt PoE++",
      "Multi-Link Operation (MLO)"
    ],
    polymorphicSpecs: {
      accessPoint: {
        wirelessStandards: ["Wi-Fi 7 (IEEE 802.11be)", "Wi-Fi 6E/6 (802.11ax)"],
        frequencyBands: ["2.4 GHz", "5 GHz", "6 GHz"],
        mimo: "4x4:4 Tri-Band Outdoor",
        channelWidth: "Hasta 320 MHz",
        modulation: "4096-QAM",
        maxPhysicalRate: "Hasta 18.7 Gbps agregados",
        mloSupport: true,
        roamingStandards: ["802.11k", "802.11v", "802.11r"],
        poeInput: "PoE++ IEEE 802.3bt (35W máx)",
        ethernetPorts: ["1x 10 GbE RJ45 IP67", "1x 2.5 GbE RJ45"]
      }
    },
    keyAdvantages: [
      "Diseñado para soportar inclemencias climatológicas severas en campings, puertos y naves",
      "Protección de sobretensión 6kV que previene averías costosas por tormentas eléctricas",
      "Puerto 10 GbE para alimentar backhauls inalámbricos y cientos de usuarios en exteriores"
    ],
    antiHallucinationNotes: [
      "Requiere PoE++ 802.3bt (35W) para alimentar los amplificadores de radiofrecuencia de alta potencia exterior.",
      "Debe instalarse con cable apantallado FTP/STP de exterior y toma de tierra para certificar los 6kV de protección."
    ],
    recommendedBundle: {
      sku: "ECS2512FP",
      name: "Switch Cloud Multi-Gigabit PoE++ 60W",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Protección contra sobretensiones y alimentación PoE++ para exteriores con clima extremo."
    },
    notebookSource: {
      sourceId: "src-3",
      title: "EnGenius ECW546 Outdoor WiFi 7 (Carcasa IP67)",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw546-outdoor",
      rationale: "Ficha técnica de punto de acceso exterior reforzado ECW546 en el catálogo oficial de EcomShop."
    },
    additionalSourceIds: ["src-10", "src-18"],
    actionTitle: "Oportunidad Industrial & Terrazas: Cobertura Robusta IP67 con ECW546",
    targetSegment: "Naves Logísticas, Campings, Terrazas y Zonas Portuarias",
    defaultAngle: "OPERATIONS",
    commercialAngles: {
      executiveRoi: "Reducción radical de costes de sustitución y servicio técnico en intemperie gracias a la protección 6kV e IP67.",
      engineeringPerformance: "Caudal Wi-Fi 7 para miles de metros cuadrados con radios de alta ganancia y puerto 10GbE.",
      operationsDeployment: "Aprovisionamiento en minutos mediante QR y diagnóstico de enlaces remotos sin desplazar técnicos a obra."
    },
    sectorAffinity: { LOGISTICS_INDUSTRY: 25, HOSPITALITY: 24, EDUCATION_CAMPUS: 18, ENTERPRISE_OFFICE: 14 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 23,
      WIFI7_MULTIGIG_EXPANSION: 22,
      HOSPITALITY_SOLUTIONS: 29,
      SWITCHING_POE_BACKBONE: 14,
      STOCK_CLEARANCE_PROMO: 12
    }
  },

  // ==========================================
  // 2. SWITCHES MULTI-GIGABIT & AGREGACIÓN
  // ==========================================
  {
    id: "ecs2512fp",
    sku: "ECS2512FP",
    model: "ECS2512FP",
    name: "Switch EnGenius ECS2512FP Multi-Gigabit PoE++",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "Switch L2+ gestionado en Cloud con 8 puertos 2.5GbE PoE++ (60W por puerto, 240W budget) y 4 uplinks 10G SFP+.",
    url: "https://www.ecomshop.es/engenius-ecs2512fp",
    imageUrl: "https://www.engeniustech.com/wp-content/uploads/2020/02/ecs2512fp-front-opt.jpg",
    priceEur: 689,
    wholesalePriceEur: 495,
    stockStatus: "IN_STOCK",
    specs: [
      "8 puertos 2.5 GbE RJ45 con PoE++ 802.3bt (hasta 60W por puerto)",
      "4 slots 10G SFP+ para uplinks de fibra y agregación troncal",
      "Presupuesto de potencia PoE total de 240W",
      "Capacidad de conmutación de 120 Gbps sin bloqueo",
      "Reinicio remoto de puertos PoE y gestión unificada EnGenius Cloud"
    ],
    interfaces: ["8x 2.5 GbE RJ45 PoE++ (802.3bt hasta 60W)", "4x 10G SFP+ Slots Uplink"],
    powerRequirements: "Entrada AC 100-240V, PoE Budget de 240W (consumo máx 290W)",
    poeType: "802.3bt",
    poeBudgetWatts: 240,
    powerConsumptionWatts: 290,
    managementMode: "Cloud",
    standards: [
      "IEEE 802.3bt PoE++ (Tipo 3 / 60W)",
      "IEEE 802.3at/af PoE",
      "IEEE 802.3bz 2.5GBASE-T",
      "IEEE 802.3ae 10GBASE-R SFP+",
      "L2+ Switching (VLAN 802.1Q, QoS, STP/RSTP/MSTP, IGMP)"
    ],
    polymorphicSpecs: {
      switch: {
        switchingCapacityGbps: 120,
        forwardingRateMpps: 89.28,
        switchingLayer: "L2+",
        portDensity: "8x 2.5 GbE PoE++ (hasta 60W/puerto)",
        poeStandard: "802.3bt",
        poeBudgetWatts: 240,
        maxPowerPerPortWatts: 60,
        uplinkPorts: ["4x 10G SFP+ Slots"]
      }
    },
    keyAdvantages: [
      "Alimenta de forma nativa puntos de acceso Wi-Fi 7 a 2.5G y 60W sin caídas de potencia",
      "4 puertos 10G SFP+ que garantizan enlaces troncales entre racks sin cuellos de botella",
      "Reinicio remoto PoE para recuperar cámaras o APs colgados sin desplazarse a la sede",
      "Gestión Cloud multi-tenant sin licencias recurrentes"
    ],
    antiHallucinationNotes: [
      "Los puertos de cobre son 2.5 GbE; para enlaces 10G utiliza sus 4 slots SFP+ (módulos ópticos o cables DAC no incluidos).",
      "PoE budget total de 240W (dimensionar consumos acumulados de APs y cámaras)."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ y Latiguillo OM4",
      relationshipType: "COMPATIBLE_TRANSCEIVER",
      rationale: "Backbone de fibra de 10 Gbps para interconexión de racks sin saturación."
    },
    notebookSource: {
      sourceId: "src-8",
      title: "Switch Multi-Gigabit EnGenius ECS2512FP (PoE++ 60W)",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecs2512fp",
      rationale: "Datasheet del switch de acceso Multi-Gigabit ECS2512FP en el cuaderno maestro EcomShop."
    },
    additionalSourceIds: ["src-10", "src-14"],
    actionTitle: "Oportunidad Switching Multi-Gigabit: ECS2512FP para Troncales Wi-Fi 7",
    targetSegment: "Instaladores IT y Arquitectos de Infraestructura",
    defaultAngle: "PERFORMANCE",
    commercialAngles: {
      executiveRoi: "Protección de la inversión al preparar la infraestructura cableada para los próximos 5 años sin suscripciones anuales.",
      engineeringPerformance: "Cero estrangulamiento de puntos de acceso Wi-Fi 7 con enlaces a 2.5G y uplinks de 10G.",
      operationsDeployment: "Supervisión remota de consumo por puerto en vatios y alertas automáticas en tiempo real."
    },
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
    id: "ecs1528fp",
    sku: "ECS1528FP",
    model: "ECS1528FP",
    name: "Switch EnGenius ECS1528FP Cloud PoE+ (24 Puertos 410W)",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "Switch L2+ gestionado en Cloud con 24 puertos Gigabit PoE+ (410W budget) y 4 uplinks 10G SFP+ para videovigilancia y redes de alta densidad.",
    url: "https://www.ecomshop.es/engenius-ecs1528fp",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_Switch_ECS1528FP_Front_Top_View.jpg?v=1745267323&width=1946",
    priceEur: 549,
    wholesalePriceEur: 395,
    stockStatus: "IN_STOCK",
    specs: [
      "24 puertos Gigabit Ethernet 10/100/1000 con PoE+ 802.3at",
      "Presupuesto de potencia PoE líder de 410W",
      "4 slots 10G SFP+ para uplinks troncales de fibra",
      "Capacidad de conmutación de 128 Gbps",
      "Soporte Voice VLAN, Surveillance QoS y auto-recuperación PoE"
    ],
    interfaces: ["24x GbE RJ45 PoE+ (802.3at)", "4x 10G SFP+ Slots Uplink"],
    powerRequirements: "Entrada AC 100-240V, PoE Budget 410W (consumo máx 470W)",
    poeType: "802.3at",
    poeBudgetWatts: 410,
    powerConsumptionWatts: 470,
    managementMode: "Cloud",
    standards: [
      "IEEE 802.3at PoE+ (hasta 30W por puerto)",
      "IEEE 802.3ab Gigabit Ethernet",
      "IEEE 802.3ae 10GBASE-R SFP+",
      "L2+ Switching avanzado (VLANs, QoS, IGMP Snooping, LACP)"
    ],
    polymorphicSpecs: {
      switch: {
        switchingCapacityGbps: 128,
        forwardingRateMpps: 95.23,
        switchingLayer: "L2+",
        portDensity: "24x 1GbE PoE+ (hasta 30W/puerto)",
        poeStandard: "802.3at",
        poeBudgetWatts: 410,
        maxPowerPerPortWatts: 30,
        uplinkPorts: ["4x 10G SFP+ Slots"]
      }
    },
    keyAdvantages: [
      "PoE budget holgado de 410W para alimentar 24 cámaras IP o terminales VoIP simultáneamente",
      "4 uplinks 10G SFP+ de serie que evitan cuellos de botella hacia el rack principal",
      "Reinicio programado de puertos y soporte en 24h de EcomSpain",
      "0€ en costes de licencias de conmutación"
    ],
    antiHallucinationNotes: [
      "Los 24 puertos son Gigabit (1 GbE); si se requieren puertos Multi-Gigabit de 2.5G se debe escoger el ECS2512FP.",
      "Soporta PoE+ 802.3at (30W/puerto); para PoE++ 60W elegir ECS2512FP o ECS5512FP."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores Ópticos 10G SFP+ y Fibra OM4",
      relationshipType: "COMPATIBLE_TRANSCEIVER",
      rationale: "Troncal 10G entre armarios secundarios con PoE+ simultáneo para cámaras y telefonía."
    },
    notebookSource: {
      sourceId: "src-7",
      title: "Switch EnGenius ECS1528FP Cloud PoE+ (410W)",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecs1528fp",
      rationale: "Datasheet del switch de 24 puertos PoE+ ECS1528FP en el cuaderno maestro EcomShop."
    },
    additionalSourceIds: ["src-11", "src-13"],
    actionTitle: "Oportunidad Switching 24 Puertos: ECS1528FP 410W con 0€ Licencias",
    targetSegment: "Integradores de Videovigilancia IP y Redes Medianas",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente ratio coste por puerto PoE+ con 410W reales y cero euros de mantenimiento por software cloud.",
      engineeringPerformance: "Segmentación perfecta de cámaras de seguridad con Voice/Surveillance VLAN y uplinks 10G hacia NVR.",
      operationsDeployment: "Visualización de topología de red en tiempo real para detectar cables en bucle o cortes al instante."
    },
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
    id: "ecs5512f",
    sku: "ECS5512F",
    model: "ECS5512F",
    name: "Switch de Agregación de Fibra EnGenius ECS5512F 12x 10G SFP+",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "Switch de agregación troncal L2+ / L3 Lite con 12 slots 10G SFP+ de fibra óptica, capacidad de conmutación de 240 Gbps y gestión unificada EnGenius Cloud sin suscripciones.",
    url: "https://www.ecomshop.es/engenius-ecs5512f",
    imageUrl: "https://www.engeniustech.com/wp-content/uploads/2020/02/ecs2512fp-front-opt.jpg",
    priceEur: 990,
    wholesalePriceEur: 710,
    stockStatus: "IN_STOCK",
    specs: [
      "12 slots 10G SFP+ dedicados para agregación de fibra óptica inter-racks e inter-edificios",
      "Capacidad de conmutación de 240 Gbps no bloqueante con wire-speed completo",
      "Tasa de reenvío de 178.56 Mpps para distribución de campus",
      "Routing estático IPv4/IPv6 L3 Lite y soporte VLAN 802.1Q / QinQ",
      "Gestión centralizada multi-tenant en EnGenius Cloud con zero-licensing"
    ],
    interfaces: ["12x 10G SFP+ Fiber Slots", "1x RJ45 Console Port"],
    powerRequirements: "Entrada AC 100-240V 50/60Hz interna (consumo máx 36W)",
    poeType: "NONE",
    powerConsumptionWatts: 36,
    managementMode: "Cloud",
    standards: [
      "IEEE 802.3ae 10GBASE-R SFP+",
      "IEEE 802.3z 1000BASE-X SFP",
      "L3 Lite Static Routing (IPv4 / IPv6)",
      "L2+ Enterprise Switching (LACP 802.3ad, MSTP, IGMP v1/v2/v3)",
      "EnGenius Cloud Zero-Licensing"
    ],
    fiberLinks: "12x 10G SFP+ Slots compatibles con transceptores multimodo (SR) y monomodo (LR)",
    polymorphicSpecs: {
      switch: {
        switchingCapacityGbps: 240,
        forwardingRateMpps: 178.56,
        switchingLayer: "L3 Lite",
        portDensity: "12x 10G SFP+ Slots (Fibra)",
        poeStandard: undefined,
        poeBudgetWatts: 0,
        maxPowerPerPortWatts: 0,
        uplinkPorts: ["12x 10G SFP+ Slots"]
      }
    },
    keyAdvantages: [
      "Conmutación 100% óptica de 10 Gbps ideal para núcleo/distribución de sedes y centros de datos pyme",
      "Consumo ultra-reducido de 36W sin generación excesiva de calor en armarios rack",
      "Elimina costes de suscripción anuales en electrónica troncal (frente a Cisco Catalyst o Aruba)",
      "Compatibilidad contrastada con transceptores multi-marca y cables DAC pasivos"
    ],
    antiHallucinationNotes: [
      "Switch exclusivamente de slots SFP+ (fibra óptica/DAC). NO posee puertos RJ45 de cobre para clientes finales.",
      "NO proporciona alimentación PoE (equipo de agregación de fibra)."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ Multimodo 850nm",
      relationshipType: "COMPATIBLE_TRANSCEIVER",
      rationale: "Módulos ópticos certificados para interconexión inmediata de armarios de distribución."
    },
    notebookSource: {
      sourceId: "src-9",
      title: "Switch de Agregación de Fibra EnGenius ECS5512F / ECS5512FP",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecs5512f",
      rationale: "Ficha técnica oficial del switch de agregación 10G SFP+ en el cuaderno de ingeniería EcomShop."
    },
    additionalSourceIds: ["src-14", "src-15"],
    actionTitle: "Oportunidad Agregación Troncal 10G: ECS5512F con 12x SFP+ sin Licencias",
    targetSegment: "Administradores de Redes de Campus, Hospitales y Centros Educativos",
    defaultAngle: "PERFORMANCE",
    commercialAngles: {
      executiveRoi: "El coste por puerto de 10G SFP+ más competitivo del mercado, sin cuotas de gestión de por vida.",
      engineeringPerformance: "240 Gbps no bloqueantes que interconectan todos los switches de acceso a velocidad de línea.",
      operationsDeployment: "Aprovisionamiento cloud y monitorización de enlaces SFP+ (DDM) en un solo panel."
    },
    sectorAffinity: { EDUCATION_CAMPUS: 25, ENTERPRISE_OFFICE: 24, LOGISTICS_INDUSTRY: 21, HOSPITALITY: 18 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 22,
      WIFI7_MULTIGIG_EXPANSION: 22,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 30,
      STOCK_CLEARANCE_PROMO: 12
    }
  },
  {
    id: "ecs5512fp",
    sku: "ECS5512FP",
    model: "ECS5512FP",
    name: "Switch Agregación EnGenius ECS5512FP 10G Multi-Gigabit PoE++",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "Switch de agregación troncal L2+ con 8 puertos 10G Base-T PoE++ (802.3bt, 420W) y 4 slots 10G SFP+ para distribución troncal.",
    url: "https://www.ecomshop.es/engenius-ecs5512fp",
    imageUrl: "https://www.engeniustech.com/wp-content/uploads/2020/02/ecs2512fp-front-opt.jpg",
    priceEur: 1190,
    wholesalePriceEur: 850,
    stockStatus: "IN_STOCK",
    specs: [
      "8 puertos 10G Base-T RJ45 con PoE++ 802.3bt (hasta 60W)",
      "4 slots 10G SFP+ para enlaces de fibra óptica troncal",
      "Presupuesto de potencia PoE de 420W",
      "Capacidad de conmutación total de 240 Gbps",
      "Routing estático L3 Lite y gestión centralizada en Cloud"
    ],
    interfaces: ["8x 10G Base-T RJ45 PoE++ (802.3bt hasta 60W)", "4x 10G SFP+ Slots Uplink"],
    powerRequirements: "Entrada AC 100-240V, PoE Budget 420W (consumo máx 490W)",
    poeType: "802.3bt",
    poeBudgetWatts: 420,
    powerConsumptionWatts: 490,
    managementMode: "Cloud",
    standards: [
      "IEEE 802.3an 10GBASE-T",
      "IEEE 802.3bt PoE++",
      "IEEE 802.3ae 10GBASE-R SFP+",
      "L3 Lite Static Routing / L2+ Switching"
    ],
    polymorphicSpecs: {
      switch: {
        switchingCapacityGbps: 240,
        forwardingRateMpps: 178.56,
        switchingLayer: "L3 Lite",
        portDensity: "8x 10G Base-T PoE++ (hasta 60W/puerto)",
        poeStandard: "802.3bt",
        poeBudgetWatts: 420,
        maxPowerPerPortWatts: 60,
        uplinkPorts: ["4x 10G SFP+ Slots"]
      }
    },
    keyAdvantages: [
      "Agregación troncal de 10 Gbps completa tanto en cobre como en fibra óptica",
      "Alimenta y comunica periféricos de máxima exigencia sin cuellos de botella",
      "Gestión de campus unificada desde EnGenius Cloud sin costes por dispositivo"
    ],
    antiHallucinationNotes: [
      "Equipo de agregación core/distribución de 10 Gbps de alta disipación térmica (requiere rack ventilado).",
      "No confundir con switches de acceso 1G/2.5G."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Módulos Transceptores 10G SFP+ Multimodo",
      relationshipType: "COMPATIBLE_TRANSCEIVER",
      rationale: "Distribución de red de fibra óptica inter-edificios con redundancia STP/LACP."
    },
    notebookSource: {
      sourceId: "src-9",
      title: "Switch de Agregación de Fibra EnGenius ECS5512FP",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecs5512fp",
      rationale: "Datasheet del switch de agregación 10G ECS5512FP en el cuaderno maestro EcomShop."
    },
    additionalSourceIds: ["src-14", "src-15"],
    actionTitle: "Oportunidad Core 10G: Agregación Troncal ECS5512FP para Campus",
    targetSegment: "Directores TIC y MSPs Multi-Edificio",
    defaultAngle: "PERFORMANCE",
    commercialAngles: {
      executiveRoi: "Capacidad de core de 10G con coste por puerto muy inferior a los conmutadores de chasis tradicionales.",
      engineeringPerformance: "Throughput de 240 Gbps sin congestión para soportar cientos de APs Wi-Fi 7 y servidores de virtualización.",
      operationsDeployment: "Configuración homogénea de VLANs troncales desde el panel cloud en todos los edificios."
    },
    sectorAffinity: { EDUCATION_CAMPUS: 25, ENTERPRISE_OFFICE: 24, LOGISTICS_INDUSTRY: 20, HOSPITALITY: 19 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 21,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 14,
      SWITCHING_POE_BACKBONE: 30,
      STOCK_CLEARANCE_PROMO: 10
    }
  },

  // ==========================================
  // 3. GATEWAYS SD-WAN & SEGURIDAD CABLEADA
  // ==========================================
  {
    id: "esg510",
    sku: "ESG510",
    model: "ESG510",
    name: "EnGenius Cloud Security Gateway ESG510",
    brand: "EnGenius",
    deviceType: "GATEWAY",
    category: "gateways",
    description: "Gateway de seguridad y router SD-WAN puramente cableado con 4 puertos 2.5 GbE (Dual WAN con Failover), VPN WireGuard/IPsec ultrarrápida y firewall SPI sin licencias.",
    url: "https://www.ecomshop.es/engenius-esg510",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_VPN_Router_ESG510_Top_View_Angle_Left.jpg",
    priceEur: 349,
    wholesalePriceEur: 249,
    stockStatus: "IN_STOCK",
    specs: [
      "4 puertos 2.5 GbE RJ45 Multi-Gigabit configurables (Dual WAN / Dual LAN)",
      "Failover y balanceo de carga multi-WAN automático para máxima disponibilidad",
      "Firewall Stateful Packet Inspection (SPI) con throughput de 2.5 Gbps",
      "VPN Site-to-Site WireGuard y IPsec de alta velocidad (hasta 950 Mbps)",
      "Gestión 100% unificada en EnGenius Cloud con cero cuotas de licencia anual"
    ],
    interfaces: ["4x 2.5 GbE RJ45 (Dual WAN / Dual LAN configurables)"],
    powerRequirements: "Adaptador DC 12V 2A incluido (Consumo máx 18W). Sin salida PoE.",
    poeType: "NONE",
    powerConsumptionWatts: 18,
    managementMode: "Cloud",
    standards: [
      "IEEE 802.3bz 2.5GBASE-T",
      "Stateful Packet Inspection (SPI)",
      "WireGuard & IPsec Site-to-Site VPN",
      "VLANs 802.1Q",
      "Dual-WAN Failover & Load Balancing"
    ],
    firewallThroughput: "2.5 Gbps Stateful Firewall / 950 Mbps WireGuard & IPsec VPN",
    polymorphicSpecs: {
      gateway: {
        firewallThroughput: "2.5 Gbps Stateful Packet Inspection",
        vpnThroughput: "950 Mbps WireGuard / IPsec VPN",
        vpnProtocols: ["WireGuard", "IPsec", "OpenVPN Client/Server"],
        wanPorts: "Hasta 2x 2.5 GbE WAN (Failover & Load Balancing)",
        lanPorts: "Hasta 3x 2.5 GbE LAN (VLAN 802.1Q)",
        wanFailover: true,
        routingFeatures: ["Policy-Based Routing (PBR)", "Stateful Firewall", "VLAN Trunking", "Auto-VPN Mesh"],
        hasWifiRadios: false
      }
    },
    keyAdvantages: [
      "Doble WAN a 2.5 Gbps que aprovecha las conexiones simétricas de fibra sin degradación",
      "VPN inter-sedes WireGuard configurada en 3 clics desde EnGenius Cloud",
      "Cero costes de licencias obligatorias: ahorro de hasta el 50% en TCO frente a gateways de suscripción",
      "Garantía oficial y reposición en 24h por EcomSpain en España"
    ],
    antiHallucinationNotes: [
      "IMPORTANTE / ANTI-ALUCINACIÓN: El ESG510 es un GATEWAY / FIREWALL CABLEADO de seguridad. NO TIENE WI-FI INTEGRADO ni antenas inalámbricas.",
      "Para cobertura Wi-Fi corporativa debe combinarse obligatoriamente con puntos de acceso EnGenius ECW (ej. ECW526/ECW536) conectados a través de un switch PoE (ej. ECS1528FP / ECS2512FP).",
      "No suministra alimentación PoE en sus puertos Ethernet (alimentado por fuente DC externa)."
    ],
    recommendedBundle: {
      sku: "ECS1528FP",
      name: "Switch EnGenius Cloud PoE+ 24 Puertos (410W budget)",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Switch PoE imprescindible para distribuir red y alimentar los puntos de acceso Wi-Fi, ya que el ESG510 es un gateway exclusivamente cableado sin PoE ni Wi-Fi integrado."
    },
    notebookSource: {
      sourceId: "src-6",
      title: "Gateway de Seguridad EnGenius ESG610 & ESG510 SD-WAN",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-esg510",
      rationale: "Datasheet oficial de gateways de seguridad SD-WAN EnGenius Cloud con VPN WireGuard y doble WAN."
    },
    additionalSourceIds: ["src-4", "src-11", "src-18"],
    actionTitle: "Oportunidad Gateway 2.5G: Seguridad Cloud ESG510 con Doble WAN sin Cuotas",
    targetSegment: "Pymes, Sedes Remotas e Integradores de Seguridad de Red",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "0€ en suscripciones de firewall anuales o por usuario, recortando a la mitad el coste de seguridad perimetral.",
      engineeringPerformance: "Throughput de 2.5 Gbps de firewall y VPN WireGuard de baja latencia para enlaces inter-sedes transparentes.",
      operationsDeployment: "Aprovisionamiento Plug & Play en EnGenius Cloud con configuración remota de políticas y VLANs."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, HOSPITALITY: 22, EDUCATION_CAMPUS: 21, LOGISTICS_INDUSTRY: 22 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 24,
      WIFI7_MULTIGIG_EXPANSION: 18,
      HOSPITALITY_SOLUTIONS: 22,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 20
    }
  },
  {
    id: "esg610",
    sku: "ESG610",
    model: "ESG610",
    name: "EnGenius Cloud Security Gateway ESG610 SD-WAN",
    brand: "EnGenius",
    deviceType: "GATEWAY",
    category: "gateways",
    description: "Router gateway corporativo con CPU Quad-Core 2.2 GHz, 4 puertos 2.5 GbE, balanceo multi-WAN, VPN IPsec/WireGuard y firewall SD-WAN sin licencias (cableado sin Wi-Fi).",
    url: "https://www.ecomshop.es/engenius-esg610",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_VPN_Router_ESG610_Front_Top_View.jpg",
    priceEur: 479,
    wholesalePriceEur: 345,
    stockStatus: "IN_STOCK",
    specs: [
      "Procesador Quad-Core 2.2 GHz para alto volumen de sesiones corporativas",
      "4 puertos 2.5 GbE RJ45 Multi-WAN / Multi-LAN con PBR",
      "Balanceo de carga avanzado y failover automático multi-sede",
      "Throughput de firewall de 2.5 Gbps y VPN WireGuard hasta 1.2 Gbps",
      "Gestión SD-WAN nativa en EnGenius Cloud con cero cuotas anuales"
    ],
    interfaces: ["4x 2.5 GbE RJ45 (Multi-WAN / LAN redundantes)"],
    powerRequirements: "Adaptador DC 12V 3A (Consumo máx 24W). Sin salida PoE.",
    poeType: "NONE",
    powerConsumptionWatts: 24,
    managementMode: "Cloud",
    standards: [
      "CPU Quad-Core 2.2 GHz",
      "Multi-WAN 2.5G con PBR",
      "SD-WAN Mesh Auto-VPN",
      "WireGuard & IPsec hasta 1.2 Gbps",
      "Inspección de tráfico y QoS de aplicación"
    ],
    firewallThroughput: "2.5 Gbps Stateful Firewall / 1.2 Gbps WireGuard VPN",
    polymorphicSpecs: {
      gateway: {
        firewallThroughput: "2.5 Gbps Stateful Inspection (Quad-Core 2.2GHz)",
        vpnThroughput: "1.2 Gbps WireGuard VPN",
        vpnProtocols: ["WireGuard", "IPsec", "SD-WAN Auto-VPN Mesh"],
        wanPorts: "Hasta 2x 2.5 GbE Multi-WAN",
        lanPorts: "Hasta 3x 2.5 GbE LAN",
        wanFailover: true,
        routingFeatures: ["Policy-Based Routing (PBR)", "Cellular WAN Failover USB", "VLANs", "QoS Layer 7"],
        hasWifiRadios: false
      }
    },
    keyAdvantages: [
      "Potencia Quad-Core para cientos de usuarios corporativos concurrentes",
      "Auto-VPN Mesh que interconecta delegaciones en minutos sin configurar túneles manuales",
      "Ahorro de miles de euros al año al erradicar suscripciones tipo Meraki o Fortinet",
      "Soporte preventa y sustitución en 24h por EcomSpain"
    ],
    antiHallucinationNotes: [
      "IMPORTANTE / ANTI-ALUCINACIÓN: El ESG610 es un gateway puramente CABLEADO de seguridad corporativa. NO incluye Wi-Fi integrado.",
      "Para infraestructura inalámbrica se gestiona de forma unificada en EnGenius Cloud junto a APs ECW y switches ECS."
    ],
    recommendedBundle: {
      sku: "ECS2512FP",
      name: "Switch Cloud Multi-Gigabit 2.5G PoE++",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Topología EnGenius Cloud unificada: Firewall 2.5G + Conmutación PoE++ 2.5G/10G + Wi-Fi 7 bajo una sola consola sin suscripciones."
    },
    notebookSource: {
      sourceId: "src-6",
      title: "Gateway de Seguridad EnGenius ESG610 SD-WAN",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-esg610",
      rationale: "Datasheet del gateway de seguridad SD-WAN ESG610 en el cuaderno maestro EcomShop."
    },
    additionalSourceIds: ["src-4", "src-11"],
    actionTitle: "Oportunidad Cloud Total: Gateway ESG610 + VPN Multi-Sede sin Cuotas",
    targetSegment: "Responsables de Seguridad y Directores TIC Corporativos",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Eliminación total del coste recurrente de licencias de seguridad perimetral, reduciendo el TCO en más del 40%.",
      engineeringPerformance: "Procesador Quad-Core a 2.2 GHz capaz de gestionar túneles WireGuard cifrados a 1.2 Gbps continuos.",
      operationsDeployment: "Despliegue unificado de seguridad, conmutación y Wi-Fi en un solo panel de control multi-tenant."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, HOSPITALITY: 22, EDUCATION_CAMPUS: 22, LOGISTICS_INDUSTRY: 21 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 22,
      WIFI7_MULTIGIG_EXPANSION: 18,
      HOSPITALITY_SOLUTIONS: 24,
      SWITCHING_POE_BACKBONE: 16,
      STOCK_CLEARANCE_PROMO: 15
    }
  },

  // ==========================================
  // 4. ACCESORIOS & CONECTIVIDAD
  // ==========================================
  {
    id: "poe30gv2",
    sku: "POE30Gv2",
    model: "POE30Gv2",
    name: "Inyector EnGenius POE30Gv2 Gigabit PoE+ 30W",
    brand: "EnGenius",
    deviceType: "ACCESSORY",
    category: "accesorios",
    description: "Inyector PoE+ Gigabit (802.3at hasta 30W) para alimentar puntos de acceso o cámaras sin necesidad de sustituir el switch existente.",
    url: "https://www.ecomshop.es/guias-poe",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 39,
    wholesalePriceEur: 25,
    stockStatus: "IN_STOCK",
    specs: [
      "Inyección de alimentación PoE+ 802.3at de hasta 30W (54V DC)",
      "Puertos Gigabit Ethernet 10/100/1000 (Data In / PoE Out)",
      "Alcance de transmisión de datos y energía hasta 100 metros",
      "Protección contra sobretensiones y cortocircuitos integrada",
      "Diseño compacto plug-and-play sin configuración requerida"
    ],
    interfaces: ["1x RJ45 Gigabit Datos (Data In)", "1x RJ45 Gigabit Datos + PoE (PoE Out)"],
    powerRequirements: "Entrada AC 100-240V 50/60Hz, Salida 54V DC 0.6A (hasta 30W)",
    poeType: "802.3at",
    powerConsumptionWatts: 34,
    managementMode: "Standalone",
    standards: [
      "IEEE 802.3at PoE+",
      "IEEE 802.3af PoE",
      "IEEE 802.3ab Gigabit Ethernet"
    ],
    polymorphicSpecs: {
      accessory: {
        powerOutputWatts: 30,
        voltageOutput: "54V DC 0.6A",
        poeStandardOutput: "IEEE 802.3at PoE+ / 802.3af PoE",
        networkInterfaces: ["1x RJ45 10/100/1000 Data In", "1x RJ45 10/100/1000 PoE Out"],
        maxDistanceMeters: 100,
        protectionFeatures: ["Protección contra sobretensiones", "Protección contra cortocircuitos", "Auto-detección 802.3af/at"]
      }
    },
    keyAdvantages: [
      "Permite alimentar puntos de acceso modernos en clientes con switches no-PoE",
      "Protección contra cortocircuitos que protege el equipo terminal",
      "Instalación inmediata en 1 minuto sin alterar la configuración de red previa"
    ],
    antiHallucinationNotes: [
      "Inyector PoE+ de hasta 30W Gigabit; para equipos que exijan PoE++ 60W (802.3bt) se debe utilizar un switch o inyector bt.",
      "Es un equipo passthrough de capa 1 sin interfaz IP de gestión."
    ],
    recommendedBundle: {
      sku: "ECW526",
      name: "AP Wi-Fi 7 Interior Compacto EnGenius ECW526",
      relationshipType: "ACCESSORY",
      rationale: "Permite instalar puntos de acceso en salas sin necesidad de cambiar el switch existente."
    },
    notebookSource: {
      sourceId: "src-10",
      title: "Guía de Dimensionamiento PoE Budget 802.3af/at/bt",
      type: "pdf",
      url: "https://www.ecomshop.es/guias-poe",
      rationale: "Guía técnica de cálculo y alimentación PoE para puntos de acceso y cámaras en el Master Notebook."
    },
    additionalSourceIds: ["src-18", "src-19"],
    actionTitle: "Oportunidad Despliegue Rápido: Inyector POE30Gv2 para APs Individuales",
    targetSegment: "Instaladores de Telecomunicaciones y Reparaciones de Urgencia",
    defaultAngle: "OPERATIONS",
    commercialAngles: {
      executiveRoi: "Minimiza la inversión inicial al evitar la sustitución completa de conmutadores funcionales.",
      engineeringPerformance: "Suministro estabilizado de 30W a 54V para evitar caídas de tensión en tiradas largas de hasta 100m.",
      operationsDeployment: "Equipo Plug & Play que cualquier técnico puede instalar en 60 segundos con cero configuración."
    },
    sectorAffinity: { HOSPITALITY: 21, ENTERPRISE_OFFICE: 20, EDUCATION_CAMPUS: 18, LOGISTICS_INDUSTRY: 19 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 20,
      WIFI7_MULTIGIG_EXPANSION: 12,
      HOSPITALITY_SOLUTIONS: 22,
      SWITCHING_POE_BACKBONE: 15,
      STOCK_CLEARANCE_PROMO: 30
    }
  },
  {
    id: "sfp-kit-10g",
    sku: "SFP-10G-SR-KIT",
    model: "SFP-10G-SR-KIT",
    name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
    brand: "EcomSpain",
    deviceType: "ACCESSORY",
    category: "fibra",
    description: "Módulos ópticos SFP+ 10G multimodo 850nm con latiguillos OM4 preconectorizados de baja atenuación para enlaces troncales de alta velocidad.",
    url: "https://www.ecomshop.es/transceptores-sfp-10g",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 89,
    wholesalePriceEur: 59,
    stockStatus: "IN_STOCK",
    specs: [
      "Transceptores ópticos 10GBASE-SR SFP+ 850nm LC Duplex",
      "Alcance de hasta 300 metros en OM3 y 400 metros en OM4",
      "Latiguillos preconectorizados OM4 LC-LC Dúplex con baja atenuación (<0.2 dB)",
      "Soporte de monitorización diagnóstica digital (DDM/DOM)",
      "Compatibilidad multi-vendor testada con EnGenius, Cisco, MikroTik y Ubiquiti"
    ],
    interfaces: ["2x Transceptores SFP+ 10G (LC Dúplex)", "Latiguillo OM4 Dúplex"],
    powerRequirements: "Alimentación por puerto SFP+ (consumo típico < 1W por módulo)",
    poeType: "NONE",
    powerConsumptionWatts: 1,
    managementMode: "Standalone",
    standards: [
      "IEEE 802.3ae 10GBASE-SR",
      "SFF-8431 SFP+ Electrical",
      "SFF-8472 Digital Diagnostic Monitoring (DDM)",
      "Fibra Multimodo OM4 50/125µm"
    ],
    fiberLinks: "10G SFP+ 850nm LC Duplex hasta 300m en OM3 / 400m en OM4",
    polymorphicSpecs: {
      accessory: {
        powerOutputWatts: 0,
        networkInterfaces: ["2x SFP+ 10G LC Dúplex (850nm Multimodo)", "Latiguillo OM4 Dúplex"],
        maxDistanceMeters: 400,
        protectionFeatures: ["Digital Diagnostic Monitoring (DDM)", "Baja atenuación <0.2dB"]
      }
    },
    keyAdvantages: [
      "Kit llave en mano verificado para eliminar problemas de interoperabilidad en obra",
      "Disipación térmica ultra-baja para evitar calentamiento en racks saturados",
      "Stock permanente en España con entrega garantizada en 24h por EcomSpain"
    ],
    antiHallucinationNotes: [
      "Diseñado para fibra multimodo (850nm); no utilizar con fibra monomodo OS2 (requiere óptica 1310nm LR).",
      "Velocidad de 10 Gbps (requiere ranuras SFP+)."
    ],
    recommendedBundle: {
      sku: "ECS1528FP",
      name: "Switch EnGenius Cloud PoE+ 24 Puertos con 4x 10G SFP+",
      relationshipType: "COMPATIBLE_TRANSCEIVER",
      rationale: "Garantiza el interlink óptico a 10 Gbps entre racks secundarios y core sin atenuación ni errores CRC."
    },
    notebookSource: {
      sourceId: "src-14",
      title: "Transceptores 10G SFP+ y Latiguillos OM3/OM4",
      type: "datasheet",
      url: "https://www.ecomshop.es/transceptores-sfp-10g",
      rationale: "Guía técnica de selección de transceptores SFP+ 10G y cableado OM4 en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-17", "src-18"],
    actionTitle: "Campaña Flash Conectividad: Kit Troncal Fibra 10G SFP+ Certificado",
    targetSegment: "Instaladores Telecomunicaciones Tipo A / Cableado Estructurado",
    defaultAngle: "OPERATIONS",
    commercialAngles: {
      executiveRoi: "Solución económica de alta fiabilidad con garantía directa de sustitución en 24h sin paradas de red.",
      engineeringPerformance: "Interconexión troncal de 10 Gbps probada en laboratorio con cero pérdidas de paquetes ni errores CRC.",
      operationsDeployment: "Preconectorizado de fábrica para evitar costosos tiempos de fusión de fibra en obra."
    },
    sectorAffinity: { LOGISTICS_INDUSTRY: 23, ENTERPRISE_OFFICE: 22, HOSPITALITY: 20, EDUCATION_CAMPUS: 22 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 22,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 18,
      SWITCHING_POE_BACKBONE: 30,
      STOCK_CLEARANCE_PROMO: 26
    }
  }
];

/**
 * Busca un producto en el catálogo oficial de EcomShop por SKU, modelo, ID o nombre
 */
export function findCatalogProduct(query: string): CatalogProduct | undefined {
  if (!query) return undefined;
  const clean = query.trim().toUpperCase();
  return ECOMSHOP_FULL_CATALOG.find(p =>
    p.sku.toUpperCase() === clean ||
    p.model.toUpperCase() === clean ||
    p.id.toUpperCase() === clean ||
    p.sku.toUpperCase().includes(clean) ||
    clean.includes(p.sku.toUpperCase()) ||
    p.name.toUpperCase().includes(clean)
  );
}

/**
 * Devuelve todos los productos del catálogo
 */
export function getAllCatalogProducts(): CatalogProduct[] {
  return ECOMSHOP_FULL_CATALOG;
}

/**
 * Filtra productos por tipo de dispositivo
 */
export function getCatalogProductsByType(deviceType: DeviceType): CatalogProduct[] {
  return ECOMSHOP_FULL_CATALOG.filter(p => p.deviceType === deviceType);
}

/**
 * Filtra productos por categoría
 */
export function getCatalogProductsByCategory(category: CatalogProduct["category"]): CatalogProduct[] {
  return ECOMSHOP_FULL_CATALOG.filter(p => p.category === category);
}
