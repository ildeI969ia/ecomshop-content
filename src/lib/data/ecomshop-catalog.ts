import { BusinessGoal } from "../types/editorial-controls";

export type DeviceType =
  | "ACCESS_POINT"
  | "SWITCH"
  | "ROUTER_CELLULAR"
  | "GATEWAY"
  | "FIBER_OPTIC"
  | "TESTER"
  | "ACCESSORY"
  | "CCTV_CAMERA"
  | "CPE_PTP";

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
  switchingLayer: "L2+" | "L3 Lite" | "L3" | "Unmanaged";
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

export interface CellularRouterSpecs {
  mobileTechnology: "5G" | "4G_LTE_CAT4" | "4G_LTE_CAT6" | "3G";
  simSlots: number;
  dualSimFailover: boolean;
  cellularSpeedDownstream: string;
  gnssSupport?: boolean;
  industrialInterfaces?: string[];
  operatingTemperatureRange?: string;
  hasWifiRadios?: boolean;
}

export interface TesterSpecs {
  testCapabilities: string[];
  mediaSupported: string[]; // e.g. ["Cobre Cat6A", "Fibra Óptica OM3/OM4", "Wi-Fi 6E/7"]
  batteryLifeHours?: number;
  poeLoadTestWatts?: number;
  screenSize?: string;
}

export interface FiberOpticSpecs {
  connectorType: "LC" | "SC" | "SFP+" | "QSFP28";
  fiberType: "MULTIMODE_OM4" | "MULTIMODE_OM3" | "SINGLEMODE_OS2";
  wavelengthNm: number;
  maxDistanceMeters: number;
  attenuationDbPerKm?: number;
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
  cellularRouter?: CellularRouterSpecs;
  tester?: TesterSpecs;
  fiberOptic?: FiberOpticSpecs;
  accessory?: AccessorySpecs;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  model: string;
  name: string;
  brand: string;
  deviceType: DeviceType;
  category: "wifi" | "switches" | "gateways" | "fibra" | "accesorios" | "engenius" | "cellular" | "testers" | "transceivers" | "poe_injectors" | "cctv" | "cpe_ptp" | "accessories";
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
  managementMode: "Cloud" | "On-Premise" | "Hybrid" | "Standalone" | "RMS" | "Local" | "Unmanaged";
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

  lifecycleStatus?: "DISCOVERED" | "VERIFIED" | "HOMOLOGATED" | "EXTERNAL_UNVERIFIED";
  isEcomshopOwnProduct?: boolean;

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
  },

  // ==========================================
  // 5. ENGENIUS WI-FI 7 & WI-FI 6 ADICIONALES (ECW516L, ECW230, ECW220, ECW212L, ECW210L, ECW260, ECW160)
  // ==========================================
  {
    id: "ecw516l",
    sku: "ECW516L",
    model: "ECW516L",
    name: "EnGenius Cloud Wi-Fi 7 ECW516L AP Interior 2x2",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Punto de acceso Wi-Fi 7 BE5000 dual-band gestionado en la nube con puerto 2.5GbE PoE+ para oficinas corporativas y aulas de formación.",
    url: "https://www.ecomshop.es/engenius-ecw516l",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_Access_Point_InD_ECW526_Front_View_907d4351-407d-4679-8491-99e6307ad5d1.jpg",
    priceEur: 329,
    wholesalePriceEur: 239,
    stockStatus: "IN_STOCK",
    specs: [
      "Wi-Fi 7 Dual-Band concurrente (2.4 GHz + 5 GHz)",
      "Puerto 2.5 GbE PoE+ (802.3at)",
      "Modulación 4096-QAM y canales de 160 MHz",
      "Aprovisionamiento QR en 2 minutos con EnGenius Cloud To-Go"
    ],
    interfaces: ["1x 2.5 GbE RJ45 (PoE+ 802.3at)"],
    powerRequirements: "Alimentación PoE+ 802.3at (17W máx)",
    poeType: "802.3at",
    powerConsumptionWatts: 17,
    managementMode: "Cloud",
    standards: ["Wi-Fi 7 (802.11be)", "IEEE 802.3at PoE+", "WPA3 Enterprise"],
    polymorphicSpecs: {
      accessPoint: {
        wirelessStandards: ["Wi-Fi 7 (IEEE 802.11be)", "Wi-Fi 6 (802.11ax)"],
        frequencyBands: ["2.4 GHz", "5 GHz"],
        mimo: "2x2:2 Dual-Band",
        channelWidth: "Hasta 160 MHz",
        modulation: "4096-QAM",
        maxPhysicalRate: "5.0 Gbps agregados",
        mloSupport: true,
        roamingStandards: ["802.11k", "802.11v", "802.11r"],
        poeInput: "PoE+ 802.3at (17W)",
        ethernetPorts: ["1x 2.5 GbE RJ45"]
      }
    },
    keyAdvantages: [
      "Transición fluida a Wi-Fi 7 para pymes sin cuotas cloud",
      "Puerto 2.5GbE para evitar estrangulamiento de fibra",
      "Garantía 24h EcomSpain"
    ],
    antiHallucinationNotes: [
      "Equipo Dual-Band (2.4 y 5 GHz); no incluye radio de 6 GHz dedicada.",
      "Requiere switch o inyector PoE+."
    ],
    recommendedBundle: {
      sku: "ECS2512FP",
      name: "Switch Cloud Multi-Gigabit 2.5G PoE++",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Backbone Multi-Gigabit sin pérdidas de paquetes."
    },
    notebookSource: {
      sourceId: "src-0",
      title: "EnGenius Cloud WiFi 7 ECW516L Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw516l",
      rationale: "Ficha oficial de AP Wi-Fi 7 ECW516L en EcomShop."
    },
    additionalSourceIds: ["src-4", "src-18"],
    actionTitle: "Oportunidad Wi-Fi 7 Pyme: ECW516L con Puerto 2.5G",
    targetSegment: "Oficinas y Pymes",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Wi-Fi 7 con coste ajustado y cero cuotas de plataforma cloud.",
      engineeringPerformance: "Puerto 2.5GbE con 4096-QAM para alta densidad de puestos de trabajo.",
      operationsDeployment: "Aprovisionamiento QR en 2 minutos con Cloud To-Go."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, EDUCATION_CAMPUS: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 28,
      HOSPITALITY_SOLUTIONS: 18,
      SWITCHING_POE_BACKBONE: 15,
      STOCK_CLEARANCE_PROMO: 10
    }
  },
  {
    id: "ecw230",
    sku: "ECW230",
    model: "ECW230",
    name: "EnGenius Cloud Wi-Fi 6 ECW230 4x4 Enterprise AP",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Punto de acceso Wi-Fi 6 4x4:4 de alta densidad para campus y auditorios con puerto 2.5GbE PoE+ y gestión cloud unificada sin licencias.",
    url: "https://www.ecomshop.es/engenius-ecw230",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_Access_Point_InD_ECW526_Front_View_907d4351-407d-4679-8491-99e6307ad5d1.jpg",
    priceEur: 429,
    wholesalePriceEur: 310,
    stockStatus: "IN_STOCK",
    specs: [
      "Wi-Fi 6 (802.11ax) 4x4:4 simultáneo en 2.4 GHz y 5 GHz",
      "Puerto 2.5 GbE RJ45 PoE+ 802.3at",
      "Velocidad combinada hasta 3548 Mbps",
      "Gestión EnGenius Cloud con topología en vivo y 0€ licencias"
    ],
    interfaces: ["1x 2.5 GbE RJ45 PoE+ (802.3at)"],
    powerRequirements: "PoE+ 802.3at (consumo máx 19.5W)",
    poeType: "802.3at",
    powerConsumptionWatts: 19.5,
    managementMode: "Cloud",
    standards: ["Wi-Fi 6 (802.11ax)", "IEEE 802.3at PoE+", "OFDMA / MU-MIMO 4x4"],
    polymorphicSpecs: {
      accessPoint: {
        wirelessStandards: ["Wi-Fi 6 (802.11ax)", "802.11ac Wave 2"],
        frequencyBands: ["2.4 GHz", "5 GHz"],
        mimo: "4x4:4 Dual-Band",
        channelWidth: "Hasta 80 MHz / 160 MHz",
        modulation: "1024-QAM",
        maxPhysicalRate: "3.55 Gbps agregados",
        roamingStandards: ["802.11k", "802.11v", "802.11r"],
        poeInput: "PoE+ 802.3at (19.5W)",
        ethernetPorts: ["1x 2.5 GbE RJ45"]
      }
    },
    keyAdvantages: [
      "Densidad probada de más de 200 clientes concurrentes por punto de acceso",
      "Puerto 2.5G nativo para enlace directo a switch PoE+",
      "Zero-licensing cloud de por vida"
    ],
    antiHallucinationNotes: [
      "Tecnología Wi-Fi 6 (802.11ax); no es Wi-Fi 7 ni incorpora banda de 6 GHz.",
      "Requiere alimentación PoE+ (19.5W)."
    ],
    recommendedBundle: {
      sku: "ECS2512FP",
      name: "Switch Cloud Multi-Gigabit 2.5G PoE++",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Proporciona 2.5GbE y PoE+ garantizado para alta densidad de tráfico."
    },
    notebookSource: {
      sourceId: "src-0",
      title: "EnGenius Cloud Wi-Fi 6 ECW230 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw230",
      rationale: "Ficha oficial de EnGenius ECW230 en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-4", "src-18"],
    actionTitle: "Oportunidad Wi-Fi 6 Alta Densidad: ECW230 4x4 con Puerto 2.5G",
    targetSegment: "Centros Educativos y Auditorios",
    defaultAngle: "PERFORMANCE",
    commercialAngles: {
      executiveRoi: "Coste por usuario ultra-competitivo frente a soluciones con cuotas anuales.",
      engineeringPerformance: "Arquitectura 4x4:4 que minimiza el retardo en entornos con decenas de portátiles simultáneos.",
      operationsDeployment: "Aprovisionamiento masivo por app y diagnóstico de RF en la nube."
    },
    sectorAffinity: { EDUCATION_CAMPUS: 28, ENTERPRISE_OFFICE: 22 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 24,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 22,
      SWITCHING_POE_BACKBONE: 18,
      STOCK_CLEARANCE_PROMO: 15
    }
  },
  {
    id: "ecw220",
    sku: "ECW220",
    model: "ECW220",
    name: "EnGenius Cloud Wi-Fi 6 ECW220 2x2 AP Interior",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Punto de acceso Wi-Fi 6 2x2:2 gestionado en nube con puerto Gigabit PoE+ para despachos, hoteles y salas de reuniones.",
    url: "https://www.ecomshop.es/engenius-ecw220",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_Access_Point_InD_ECW526_Front_View_907d4351-407d-4679-8491-99e6307ad5d1.jpg",
    priceEur: 239,
    wholesalePriceEur: 165,
    stockStatus: "IN_STOCK",
    specs: [
      "Wi-Fi 6 Dual-Band concurrente (hasta 1774 Mbps)",
      "Puerto 1 GbE RJ45 PoE 802.3af/at",
      "Diseño compacto para falso techo o pared",
      "EnGenius Cloud con zero-licensing"
    ],
    interfaces: ["1x 1 GbE RJ45 (PoE 802.3af/at)"],
    powerRequirements: "PoE 802.3af/at (consumo máx 12.8W)",
    poeType: "802.3at",
    powerConsumptionWatts: 12.8,
    managementMode: "Cloud",
    standards: ["Wi-Fi 6 (802.11ax)", "IEEE 802.3af PoE"],
    polymorphicSpecs: {
      accessPoint: {
        wirelessStandards: ["Wi-Fi 6 (802.11ax)", "802.11ac"],
        frequencyBands: ["2.4 GHz", "5 GHz"],
        mimo: "2x2:2 Dual-Band",
        channelWidth: "Hasta 80 MHz",
        modulation: "1024-QAM",
        maxPhysicalRate: "1.77 Gbps agregados",
        roamingStandards: ["802.11k", "802.11v", "802.11r"],
        poeInput: "PoE 802.3af/at (12.8W)",
        ethernetPorts: ["1x 1 GbE RJ45"]
      }
    },
    keyAdvantages: [
      "Inversión contenida para despliegues in-room hoteleros",
      "Consumo de solo 12.8W que optimiza el PoE Budget del switch",
      "0€ en licencias cloud"
    ],
    antiHallucinationNotes: [
      "Puerto de red 1 GbE (no es 2.5G ni 10G).",
      "Estándar Wi-Fi 6 (no Wi-Fi 7)."
    ],
    recommendedBundle: {
      sku: "ECS1528FP",
      name: "Switch EnGenius Cloud PoE+ 24 Puertos (410W budget)",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Alimentación centralizada para hasta 24 APs por planta sin saturación de energía."
    },
    notebookSource: {
      sourceId: "src-0",
      title: "EnGenius Cloud Wi-Fi 6 ECW220 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw220",
      rationale: "Ficha oficial de EnGenius ECW220 en EcomShop."
    },
    additionalSourceIds: ["src-4", "src-18"],
    actionTitle: "Oportunidad Hospitality: Wi-Fi 6 Eficiente ECW220",
    targetSegment: "Hoteles y Residencias",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente amortización por habitación hotelera sin costes recurrentes.",
      engineeringPerformance: "Banda de 5 GHz limpia con roaming asistido para clientes en movimiento.",
      operationsDeployment: "Montaje ultra-discreto y aprovisionamiento por código QR."
    },
    sectorAffinity: { HOSPITALITY: 30, ENTERPRISE_OFFICE: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 22,
      WIFI7_MULTIGIG_EXPANSION: 15,
      HOSPITALITY_SOLUTIONS: 30,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 25
    }
  },
  {
    id: "ecw260",
    sku: "ECW260",
    model: "ECW260",
    name: "EnGenius Cloud Wi-Fi 6 ECW260 Exterior IP67",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Punto de acceso Wi-Fi 6 2x2:2 de exterior reforzado IP67 con antenas omnidireccionales desmontables y puerto 2.5GbE PoE+.",
    url: "https://www.ecomshop.es/engenius-ecw260",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/ECW536-2.jpg?v=1745267297&width=1445",
    priceEur: 389,
    wholesalePriceEur: 275,
    stockStatus: "IN_STOCK",
    specs: [
      "Wi-Fi 6 (802.11ax) Dual-Band con chasis estanco IP67",
      "Puerto 2.5 GbE RJ45 PoE+ 802.3at",
      "4 antenas omnidireccionales desmontables con conector RP-SMA",
      "Rango de temperatura industrial -20°C a 60°C"
    ],
    interfaces: ["1x 2.5 GbE RJ45 PoE+ (802.3at) IP67", "4x RP-SMA Conectores Antena"],
    powerRequirements: "PoE+ 802.3at (consumo máx 15.9W)",
    poeType: "802.3at",
    powerConsumptionWatts: 15.9,
    managementMode: "Cloud",
    standards: ["Wi-Fi 6 (802.11ax)", "Certificación IP67", "Protección 6kV"],
    polymorphicSpecs: {
      accessPoint: {
        wirelessStandards: ["Wi-Fi 6 (802.11ax)"],
        frequencyBands: ["2.4 GHz", "5 GHz"],
        mimo: "2x2:2 Dual-Band Outdoor",
        channelWidth: "Hasta 80 MHz",
        modulation: "1024-QAM",
        maxPhysicalRate: "1.77 Gbps agregados",
        roamingStandards: ["802.11k", "802.11v", "802.11r"],
        poeInput: "PoE+ 802.3at (15.9W)",
        ethernetPorts: ["1x 2.5 GbE RJ45 IP67"]
      }
    },
    keyAdvantages: [
      "Chasis industrial sellado contra lluvia, polvo y ambientes salinos",
      "Puerto 2.5GbE para alta velocidad en terrazas y campings",
      "0€ licencias cloud"
    ],
    antiHallucinationNotes: [
      "Estándar Wi-Fi 6 (no Wi-Fi 7).",
      "Requiere cable exterior FTP apantallado y PoE+."
    ],
    recommendedBundle: {
      sku: "ECS2512FP",
      name: "Switch Cloud Multi-Gigabit 2.5G PoE++",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Alimentación PoE+ y uplink Multi-Gigabit para intemperie."
    },
    notebookSource: {
      sourceId: "src-3",
      title: "EnGenius Cloud Wi-Fi 6 ECW260 Exterior IP67 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw260",
      rationale: "Ficha oficial de EnGenius ECW260 en EcomShop."
    },
    additionalSourceIds: ["src-4", "src-18"],
    actionTitle: "Oportunidad Exterior: ECW260 IP67 con Puerto 2.5G",
    targetSegment: "Campings, Terrazas y Zonas Industriales",
    defaultAngle: "OPERATIONS",
    commercialAngles: {
      executiveRoi: "Ahorro radical en sustituciones por clima adverso gracias al chasis IP67.",
      engineeringPerformance: "Antenas de alta ganancia omnidireccionales con puerto 2.5GbE.",
      operationsDeployment: "Aprovisionamiento QR en 2 minutos sin abrir el equipo."
    },
    sectorAffinity: { HOSPITALITY: 28, LOGISTICS_INDUSTRY: 26 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 24,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 30,
      SWITCHING_POE_BACKBONE: 15,
      STOCK_CLEARANCE_PROMO: 20
    }
  },
  {
    id: "ecw160",
    sku: "ECW160",
    model: "ECW160",
    name: "EnGenius Cloud Wi-Fi 5 ECW160 Exterior IP67",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Punto de acceso Wi-Fi 5 Wave 2 para exteriores IP67 económico con antenas desmontables y gestión Cloud.",
    url: "https://www.ecomshop.es/engenius-ecw160",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/ECW536-2.jpg?v=1745267297&width=1445",
    priceEur: 219,
    wholesalePriceEur: 149,
    stockStatus: "IN_STOCK",
    specs: [
      "Wi-Fi 5 (802.11ac Wave 2) 2x2:2 con carcasa IP67",
      "Puerto Gigabit Ethernet PoE 802.3af",
      "2 antenas omnidireccionales exteriores",
      "Gestión EnGenius Cloud sin costes recurrentes"
    ],
    interfaces: ["1x GbE RJ45 PoE (802.3af)"],
    powerRequirements: "PoE 802.3af (consumo máx 12.6W)",
    poeType: "802.3af",
    powerConsumptionWatts: 12.6,
    managementMode: "Cloud",
    standards: ["Wi-Fi 5 (802.11ac)", "Certificación IP67"],
    polymorphicSpecs: {
      accessPoint: {
        wirelessStandards: ["Wi-Fi 5 (802.11ac Wave 2)"],
        frequencyBands: ["2.4 GHz", "5 GHz"],
        mimo: "2x2:2 Dual-Band Outdoor",
        channelWidth: "Hasta 80 MHz",
        modulation: "256-QAM",
        maxPhysicalRate: "1.26 Gbps agregados",
        roamingStandards: ["802.11k", "802.11v", "802.11r"],
        poeInput: "PoE 802.3af (12.6W)",
        ethernetPorts: ["1x GbE RJ45 IP67"]
      }
    },
    keyAdvantages: [
      "Solución exterior ultra económica para patios y jardines",
      "Bajo consumo PoE 802.3af",
      "0€ cuotas de licencia cloud"
    ],
    antiHallucinationNotes: [
      "Tecnología Wi-Fi 5 (802.11ac); no es Wi-Fi 6 ni Wi-Fi 7.",
      "Puerto Gigabit de cobre (no 2.5G)."
    ],
    recommendedBundle: {
      sku: "POE30Gv2",
      name: "Inyector EnGenius POE30Gv2 Gigabit PoE+ 30W",
      relationshipType: "ACCESSORY",
      rationale: "Alimentación PoE directa sin necesidad de cambiar el switch."
    },
    notebookSource: {
      sourceId: "src-3",
      title: "EnGenius Cloud Wi-Fi 5 ECW160 Exterior Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw160",
      rationale: "Ficha oficial de EnGenius ECW160 en EcomShop."
    },
    additionalSourceIds: ["src-4", "src-18"],
    actionTitle: "Liquidación & Promo Exterior: ECW160 IP67",
    targetSegment: "Pymes, Restauración y Terrazas",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Precio de liquidación para proyectos de cobertura exterior de coste mínimo.",
      engineeringPerformance: "Cobertura exterior robusta de 1.2 Gbps con certificación IP67.",
      operationsDeployment: "Configuración remota en la nube en pocos clics."
    },
    sectorAffinity: { HOSPITALITY: 25, ENTERPRISE_OFFICE: 18 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 20,
      WIFI7_MULTIGIG_EXPANSION: 10,
      HOSPITALITY_SOLUTIONS: 25,
      SWITCHING_POE_BACKBONE: 12,
      STOCK_CLEARANCE_PROMO: 35
    }
  },

  // ==========================================
  // 6. TELTONIKA INDUSTRIAL 4G / 5G & IOT (RUTX50, RUT241, RUT956)
  // ==========================================
  {
    id: "rutx50",
    sku: "RUTX50",
    model: "RUTX50",
    name: "Teltonika RUTX50 Router Industrial 5G Dual-SIM",
    brand: "Teltonika",
    deviceType: "ROUTER_CELLULAR",
    category: "cellular",
    description: "Router industrial 5G Sub-6GHz SA/NSA con Dual-SIM (failover automático), 5 puertos Gigabit Ethernet, Wi-Fi Wave-2 y posicionamiento GNSS para despliegues de misión crítica.",
    url: "https://www.ecomshop.es/teltonika-rutx50",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 589,
    wholesalePriceEur: 425,
    stockStatus: "IN_STOCK",
    specs: [
      "Conectividad 5G Sub-6 GHz SA/NSA hasta 3.3 Gbps y retrocompatibilidad 4G LTE Cat 20",
      "Doble ranura SIM con conmutación automática por error (Dual-SIM Failover)",
      "5 puertos Gigabit Ethernet (1x WAN, 4x LAN configurables)",
      "Wi-Fi 802.11ac Wave 2 Dual-Band (867 Mbps)",
      "Receptor GNSS integrado (GPS, GLONASS, BeiDou, Galileo)",
      "Carcasa de aluminio robusta con rango térmico -40°C a 75°C",
      "Sistema operativo RutOS con soporte VPN (WireGuard, OpenVPN, IPsec) y RMS"
    ],
    interfaces: [
      "5x GbE RJ45 (1x WAN / 4x LAN)",
      "2x Ranuras SIM (Mini-SIM 2FF)",
      "4x Conectores SMA para antenas móviles 5G",
      "2x Conectores RP-SMA para antenas Wi-Fi",
      "1x Conector SMA para antena GNSS",
      "1x Puerto USB 2.0",
      "1x Bloque de alimentación terminal 4 pines"
    ],
    powerRequirements: "Entrada DC 9-50V (alimentador industrial 18W incluido o borna industrial)",
    poeType: "DC_PASSIVE",
    powerConsumptionWatts: 18,
    managementMode: "RMS",
    standards: [
      "5G Sub-6 GHz SA/NSA 3GPP Release 16",
      "4G LTE Cat 20",
      "IEEE 802.11ac Wave 2",
      "RutOS (Basado en OpenWrt Linux)",
      "Protección industrial vibraciones e interferencias electromagnéticas"
    ],
    polymorphicSpecs: {
      cellularRouter: {
        mobileTechnology: "5G",
        simSlots: 2,
        dualSimFailover: true,
        cellularSpeedDownstream: "Hasta 3.3 Gbps (5G SA/NSA)",
        gnssSupport: true,
        industrialInterfaces: ["1x Entrada Digital", "1x Salida Digital", "Bloque terminal 4-pin DC"],
        operatingTemperatureRange: "-40°C a +75°C",
        hasWifiRadios: true
      }
    },
    keyAdvantages: [
      "Ultra-alta velocidad 5G de hasta 3.3 Gbps para respaldo de fibra o sedes sin cobertura fija",
      "Doble SIM con failover instantáneo ante caída del operador principal",
      "Chasis industrial de aluminio con montaje en carril DIN y tolerancia térmica extrema",
      "Gestión remota segura con Teltonika RMS (Remote Management System)"
    ],
    antiHallucinationNotes: [
      "IMPORTANTE / ANTI-ALUCINACIÓN: Es un ROUTER CELULAR INDUSTRIAL 5G de Teltonika; NO ES UN DISPOSITIVO WI-FI 7 NI UN SWITCH POE.",
      "Su Wi-Fi es 802.11ac Wave-2 de servicio local para técnicos; para cobertura corporativa de gran densidad se deben usar APs dedicados.",
      "No suministra salida PoE estándar a periféricos (alimentación por borna o jack DC)."
    ],
    recommendedBundle: {
      sku: "ECS1528FP",
      name: "Switch EnGenius Cloud PoE+ 24 Puertos (410W budget)",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Distribución cableada LAN y PoE corporativo alimentado desde la conexión 5G troncal del RUTX50."
    },
    notebookSource: {
      sourceId: "src-teltonika-rutx50",
      title: "Teltonika RUTX50 5G Industrial Router Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-rutx50",
      rationale: "Ficha técnica oficial de Teltonika RUTX50 en el catálogo de EcomShop."
    },
    additionalSourceIds: ["src-18"],
    actionTitle: "Oportunidad 5G Industrial: Respaldo de Fibra y Sedes Críticas con RUTX50",
    targetSegment: "Industria 4.0, Flotas, Logística y Continuidad de Negocio",
    defaultAngle: "PERFORMANCE",
    commercialAngles: {
      executiveRoi: "Garantiza continuidad de negocio 99.99% evitando pérdidas de miles de euros por corte de fibra óptica gracias al respaldo 5G Dual-SIM.",
      engineeringPerformance: "Velocidad de hasta 3.3 Gbps con 5G de ultra baja latencia y conmutación automática de operador en milisegundos.",
      operationsDeployment: "Despliegue Plug & Play en cualquier cuadro eléctrico industrial con carril DIN y gestión centralizada RMS."
    },
    sectorAffinity: { LOGISTICS_INDUSTRY: 30, ENTERPRISE_OFFICE: 24, HEALTHCARE: 25 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 18,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    }
  },
  {
    id: "rut241",
    sku: "RUT241",
    model: "RUT241",
    name: "Teltonika RUT241 Router Industrial 4G LTE Cat 4",
    brand: "Teltonika",
    deviceType: "ROUTER_CELLULAR",
    category: "cellular",
    description: "Router industrial compacto 4G LTE Cat 4 con 2 puertos Ethernet, Wi-Fi local, I/O digital y soporte RutOS para cajeros, telemetría y CCTV.",
    url: "https://www.ecomshop.es/teltonika-rut241",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 189,
    wholesalePriceEur: 135,
    stockStatus: "IN_STOCK",
    specs: [
      "Módem 4G LTE Cat 4 hasta 150 Mbps de descarga y 50 Mbps de subida",
      "2 puertos Ethernet 10/100 Mbps (1x WAN, 1x LAN)",
      "Wi-Fi 802.11b/g/n (hasta 150 Mbps)",
      "1x Entrada Digital y 1x Salida Digital para control y alertas remotas",
      "Formato ultracompacto con carcasa de aluminio para carril DIN"
    ],
    interfaces: [
      "2x 10/100 Mbps RJ45",
      "1x Ranura SIM (Mini-SIM 2FF)",
      "2x Conectores SMA para antenas 4G",
      "1x Conector RP-SMA para antena Wi-Fi",
      "Bloque terminal 4-pin para alimentación y I/O"
    ],
    powerRequirements: "Entrada DC 9-30V (consumo típico < 6.5W)",
    poeType: "DC_PASSIVE",
    powerConsumptionWatts: 6.5,
    managementMode: "RMS",
    standards: ["4G LTE Cat 4", "3G / 2G", "RutOS", "OpenVPN / IPsec / WireGuard"],
    polymorphicSpecs: {
      cellularRouter: {
        mobileTechnology: "4G_LTE_CAT4",
        simSlots: 1,
        dualSimFailover: false,
        cellularSpeedDownstream: "Hasta 150 Mbps (LTE Cat 4)",
        gnssSupport: false,
        industrialInterfaces: ["1x Entrada Digital", "1x Salida Digital"],
        operatingTemperatureRange: "-40°C a +75°C",
        hasWifiRadios: true
      }
    },
    keyAdvantages: [
      "El estándar del sector para telemetría industrial, máquinas de vending y CCTV aislado",
      "Consumo extremadamente reducido (< 6.5W) ideal para sistemas solares",
      "Gestión remota Teltonika RMS sin necesidad de IP pública fija"
    ],
    antiHallucinationNotes: [
      "Router 4G LTE Cat 4 de 150 Mbps con puertos Fast Ethernet 10/100 (no es Gigabit ni 5G).",
      "NO es un punto de acceso Wi-Fi 7 corporativo."
    ],
    recommendedBundle: {
      sku: "POE30Gv2",
      name: "Inyector EnGenius POE30Gv2 Gigabit PoE+ 30W",
      relationshipType: "ACCESSORY",
      rationale: "Alimentación de cámaras IP remotas conectadas a la salida del RUT241."
    },
    notebookSource: {
      sourceId: "src-teltonika-rut241",
      title: "Teltonika RUT241 Industrial 4G Router Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-rut241",
      rationale: "Ficha técnica oficial de Teltonika RUT241 en EcomShop."
    },
    additionalSourceIds: ["src-18"],
    actionTitle: "Oportunidad Telemetría & IoT: Router 4G RUT241 de Bajo Consumo",
    targetSegment: "Integradores de Seguridad, Telemetría y Automatización",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Coste de adquisición mínimo para conectar emplazamientos remotos sin conexión cableada.",
      engineeringPerformance: "Estabilidad industrial RutOS con auto-reinicio por ping y tolerancia térmica de -40°C a +75°C.",
      operationsDeployment: "Aprovisionamiento masivo de miles de dispositivos desde la consola en la nube RMS."
    },
    sectorAffinity: { LOGISTICS_INDUSTRY: 30, ENTERPRISE_OFFICE: 15 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 22,
      WIFI7_MULTIGIG_EXPANSION: 10,
      HOSPITALITY_SOLUTIONS: 12,
      SWITCHING_POE_BACKBONE: 14,
      STOCK_CLEARANCE_PROMO: 25
    }
  },
  {
    id: "rut956",
    sku: "RUT956",
    model: "RUT956",
    name: "Teltonika RUT956 Router Industrial 4G Dual-SIM con E/S y GPS",
    brand: "Teltonika",
    deviceType: "ROUTER_CELLULAR",
    category: "cellular",
    description: "Router celular 4G LTE Cat 4 para automatización industrial con Dual-SIM, GNSS integrado, puertos serie RS232/RS485 y múltiples E/S analógicas/digitales.",
    url: "https://www.ecomshop.es/teltonika-rut956",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 269,
    wholesalePriceEur: 195,
    stockStatus: "IN_STOCK",
    specs: [
      "4G LTE Cat 4 con Dual-SIM y conmutación automática de cobertura",
      "Puertos serie RS232 y RS485 para integración con autómatas y PLCs",
      "Receptor GPS/GNSS para localización de flotas y sincronización de hora",
      "4 puertos Ethernet 10/100 Mbps (1x WAN, 3x LAN)",
      "Múltiples entradas y salidas digitales/analógicas configurables"
    ],
    interfaces: [
      "4x 10/100 Mbps RJ45",
      "2x Ranuras SIM (Mini-SIM 2FF)",
      "1x Puerto serie RS232 (DB9)",
      "1x Conector RS485 (borna 6-pin)",
      "2x Conectores SMA para antenas 4G",
      "2x Conectores RP-SMA para antenas Wi-Fi",
      "1x Conector SMA para antena GNSS"
    ],
    powerRequirements: "Entrada DC 9-30V (consumo típico < 7W)",
    poeType: "DC_PASSIVE",
    powerConsumptionWatts: 7,
    managementMode: "RMS",
    standards: ["4G LTE Cat 4", "Modbus TCP / RTU", "GNSS", "RutOS"],
    polymorphicSpecs: {
      cellularRouter: {
        mobileTechnology: "4G_LTE_CAT4",
        simSlots: 2,
        dualSimFailover: true,
        cellularSpeedDownstream: "Hasta 150 Mbps",
        gnssSupport: true,
        industrialInterfaces: ["RS232 (DB9)", "RS485 (Borna)", "E/S Digitales y Analógicas"],
        operatingTemperatureRange: "-40°C a +75°C",
        hasWifiRadios: true
      }
    },
    keyAdvantages: [
      "Conexión directa de autómatas PLCs y maquinaria industrial vía RS232/RS485 sin convertidores",
      "Doble SIM para redundancia de operador en plantas remotas",
      "Localización de vehículos y cuadros de obra mediante GNSS"
    ],
    antiHallucinationNotes: [
      "Router industrial celular con puertos serie y 10/100 Mbps; NO es un conmutador Multi-Gigabit.",
      "No emite Wi-Fi 7."
    ],
    recommendedBundle: {
      sku: "POE30Gv2",
      name: "Inyector EnGenius POE30Gv2 Gigabit PoE+ 30W",
      relationshipType: "ACCESSORY",
      rationale: "Alimentación de periféricos industriales de campo."
    },
    notebookSource: {
      sourceId: "src-teltonika-rut956",
      title: "Teltonika RUT956 Industrial IoT Router Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-rut956",
      rationale: "Ficha oficial de Teltonika RUT956 en EcomShop."
    },
    additionalSourceIds: ["src-18"],
    actionTitle: "Oportunidad Automatización & PLCs: Router Industrial RUT956",
    targetSegment: "Integradores de Automatización, Cuadros Eléctricos e Industria 4.0",
    defaultAngle: "OPERATIONS",
    commercialAngles: {
      executiveRoi: "Reduce costes al integrar módem 4G, pasarela Modbus/RS485 y GPS en un solo equipo.",
      engineeringPerformance: "Soporte nativo de protocolos industriales (Modbus RTU/TCP, MQTT, DNP3).",
      operationsDeployment: "Control de entradas y salidas remotas mediante alertas SMS o eventos de red."
    },
    sectorAffinity: { LOGISTICS_INDUSTRY: 30, ENTERPRISE_OFFICE: 15 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 22,
      WIFI7_MULTIGIG_EXPANSION: 10,
      HOSPITALITY_SOLUTIONS: 10,
      SWITCHING_POE_BACKBONE: 15,
      STOCK_CLEARANCE_PROMO: 20
    }
  },

  // ==========================================
  // 7. ENGENIUS SWITCHING MULTI-GIGABIT & GIGABIT ADICIONAL
  // ==========================================
  {
    id: "ecs2510fp",
    sku: "ECS2510FP",
    model: "ECS2510FP",
    name: "Switch EnGenius ECS2510FP Multi-Gigabit 8p 2.5G PoE+",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "Switch L2+ gestionado en Cloud con 8 puertos 2.5GbE PoE+ (802.3at, 240W budget) y 2 uplinks 10G SFP+ para distribución Wi-Fi 7 compacta.",
    url: "https://www.ecomshop.es/engenius-ecs2510fp",
    imageUrl: "https://www.engeniustech.com/wp-content/uploads/2020/02/ecs2512fp-front-opt.jpg",
    priceEur: 549,
    wholesalePriceEur: 395,
    stockStatus: "IN_STOCK",
    specs: [
      "8 puertos 2.5 GbE RJ45 con PoE+ 802.3at (hasta 30W por puerto)",
      "2 slots 10G SFP+ para uplinks troncales",
      "PoE Budget de 240W",
      "Capacidad de conmutación 80 Gbps sin bloqueo",
      "Gestión 100% en la nube EnGenius Cloud sin licencias"
    ],
    interfaces: ["8x 2.5 GbE RJ45 PoE+ (802.3at)", "2x 10G SFP+ Uplinks"],
    powerRequirements: "Entrada AC 100-240V, PoE Budget 240W (consumo máx 280W)",
    poeType: "802.3at",
    poeBudgetWatts: 240,
    powerConsumptionWatts: 280,
    managementMode: "Cloud",
    standards: ["IEEE 802.3at PoE+", "IEEE 802.3bz 2.5GBASE-T", "L2+ Switching"],
    polymorphicSpecs: {
      switch: {
        switchingCapacityGbps: 80,
        forwardingRateMpps: 59.52,
        switchingLayer: "L2+",
        portDensity: "8x 2.5 GbE PoE+ (hasta 30W/puerto)",
        poeStandard: "802.3at",
        poeBudgetWatts: 240,
        maxPowerPerPortWatts: 30,
        uplinkPorts: ["2x 10G SFP+ Slots"]
      }
    },
    keyAdvantages: [
      "Conmutación Multi-Gigabit asequible para pequeñas oficinas y sucursales",
      "2 slots 10G SFP+ para conexión directa a servidor o fibra troncal",
      "0€ en licencias cloud"
    ],
    antiHallucinationNotes: [
      "Suministra PoE+ 802.3at (hasta 30W/puerto); para PoE++ 60W se requiere ECS2512FP.",
      "Posee 2 puertos SFP+ de uplink (a diferencia del ECS2512FP que tiene 4)."
    ],
    recommendedBundle: {
      sku: "ECW510",
      name: "EnGenius Cloud WiFi 7 ECW510 AP Dual-Band",
      relationshipType: "REQUIRES_POE_SWITCH",
      rationale: "Alimentación 2.5G PoE+ perfecta para APs Wi-Fi 7 Dual-Band."
    },
    notebookSource: {
      sourceId: "src-8",
      title: "EnGenius ECS2510FP Switch Multi-Gigabit Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecs2510fp",
      rationale: "Ficha oficial de EnGenius ECS2510FP en EcomShop."
    },
    additionalSourceIds: ["src-10", "src-18"],
    actionTitle: "Oportunidad Switching Multi-Gigabit Pyme: ECS2510FP",
    targetSegment: "Oficinas y Sedes Secundarias",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "La forma más rentable de introducir conmutación 2.5G y fibra 10G sin licencias recurrentes.",
      engineeringPerformance: "80 Gbps wire-speed sin pérdida de paquetes para tráfico Wi-Fi 7 y NAS.",
      operationsDeployment: "Supervisión de puertos y auto-reinicio PoE desde la nube."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 26, EDUCATION_CAMPUS: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 28,
      HOSPITALITY_SOLUTIONS: 20,
      SWITCHING_POE_BACKBONE: 30,
      STOCK_CLEARANCE_PROMO: 15
    }
  },
  {
    id: "ecs2530fp",
    sku: "ECS2530FP",
    model: "ECS2530FP",
    name: "Switch EnGenius ECS2530FP Multi-Gigabit 24p 2.5G PoE++ 740W",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "Switch L2+ gestionado en Cloud con 24 puertos 2.5GbE PoE++ (hasta 60W por puerto, presupuesto masivo de 740W) y 6 uplinks 10G SFP+.",
    url: "https://www.ecomshop.es/engenius-ecs2530fp",
    imageUrl: "https://www.engeniustech.com/wp-content/uploads/2020/02/ecs2512fp-front-opt.jpg",
    priceEur: 1490,
    wholesalePriceEur: 1080,
    stockStatus: "IN_STOCK",
    specs: [
      "24 puertos 2.5 GbE RJ45 PoE++ 802.3bt (hasta 60W por puerto)",
      "6 slots 10G SFP+ para uplinks de fibra masivos y agregación",
      "Presupuesto de potencia PoE líder de 740W",
      "Capacidad de conmutación 240 Gbps",
      "Gestión EnGenius Cloud Enterprise con zero-licensing"
    ],
    interfaces: ["24x 2.5 GbE RJ45 PoE++ (802.3bt hasta 60W)", "6x 10G SFP+ Slots Uplink"],
    powerRequirements: "Entrada AC 100-240V, PoE Budget 740W (consumo máx 850W)",
    poeType: "802.3bt",
    poeBudgetWatts: 740,
    powerConsumptionWatts: 850,
    managementMode: "Cloud",
    standards: ["IEEE 802.3bt PoE++", "IEEE 802.3bz 2.5GBASE-T", "L2+ Enterprise Switching"],
    polymorphicSpecs: {
      switch: {
        switchingCapacityGbps: 240,
        forwardingRateMpps: 178.56,
        switchingLayer: "L2+",
        portDensity: "24x 2.5 GbE PoE++ (hasta 60W/puerto)",
        poeStandard: "802.3bt",
        poeBudgetWatts: 740,
        maxPowerPerPortWatts: 60,
        uplinkPorts: ["6x 10G SFP+ Slots"]
      }
    },
    keyAdvantages: [
      "740W reales de presupuesto PoE para alimentar simultáneamente 24 APs Wi-Fi 7 Tri-Band a plena potencia",
      "6 uplinks 10G SFP+ para arquitecturas de rack y distribución redundante",
      "Cero costes de licencias anuales de conmutación"
    ],
    antiHallucinationNotes: [
      "Requiere rack con ventilación adecuada (potencia y disipación industrial de 740W PoE).",
      "Los puertos de cobre son 2.5 GbE; para conexiones 10G usar los 6 slots SFP+."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "COMPATIBLE_TRANSCEIVER",
      rationale: "Interconexión óptica troncal sin cuellos de botella para absorber el tráfico de 24 APs Multi-Gig."
    },
    notebookSource: {
      sourceId: "src-8",
      title: "EnGenius ECS2530FP Multi-Gigabit PoE++ 740W Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecs2530fp",
      rationale: "Ficha oficial de EnGenius ECS2530FP en EcomShop."
    },
    additionalSourceIds: ["src-10", "src-18"],
    actionTitle: "Oportunidad Backbone Wi-Fi 7 Corporativo: ECS2530FP con 740W PoE++",
    targetSegment: "Sedes Centrales, Hospitales y Campus Universitarios",
    defaultAngle: "PERFORMANCE",
    commercialAngles: {
      executiveRoi: "Ahorro masivo de costes al eliminar fuentes de alimentación secundarias y licencias anuales de conmutación.",
      engineeringPerformance: "740W PoE++ con 6 enlaces 10G SFP+ para soportar cualquier despliegue Wi-Fi 7 de alta potencia.",
      operationsDeployment: "Control de consumo por puerto en tiempo real y reinicio automático de periféricos colgados."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 30, EDUCATION_CAMPUS: 28, HOSPITALITY: 25 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 30,
      HOSPITALITY_SOLUTIONS: 22,
      SWITCHING_POE_BACKBONE: 35,
      STOCK_CLEARANCE_PROMO: 10
    }
  },
  {
    id: "ecs1528p",
    sku: "ECS1528P",
    model: "ECS1528P",
    name: "Switch EnGenius ECS1528P Cloud PoE+ 24 Puertos (240W)",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "Switch L2+ gestionado en Cloud con 24 puertos Gigabit PoE+ (240W budget) y 4 uplinks 10G SFP+ para oficinas estándar y telefonía VoIP.",
    url: "https://www.ecomshop.es/engenius-ecs1528p",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_Switch_ECS1528FP_Front_Top_View.jpg?v=1745267323&width=1946",
    priceEur: 449,
    wholesalePriceEur: 320,
    stockStatus: "IN_STOCK",
    specs: [
      "24 puertos Gigabit Ethernet con PoE+ 802.3at",
      "Presupuesto PoE equilibrado de 240W",
      "4 slots 10G SFP+ para uplinks troncales de fibra",
      "Capacidad de conmutación 128 Gbps",
      "Gestión Cloud multi-tenant sin suscripciones"
    ],
    interfaces: ["24x GbE RJ45 PoE+ (802.3at)", "4x 10G SFP+ Slots Uplink"],
    powerRequirements: "Entrada AC 100-240V, PoE Budget 240W (consumo máx 290W)",
    poeType: "802.3at",
    poeBudgetWatts: 240,
    powerConsumptionWatts: 290,
    managementMode: "Cloud",
    standards: ["IEEE 802.3at PoE+", "IEEE 802.3ab Gigabit", "L2+ Enterprise"],
    polymorphicSpecs: {
      switch: {
        switchingCapacityGbps: 128,
        forwardingRateMpps: 95.23,
        switchingLayer: "L2+",
        portDensity: "24x 1GbE PoE+ (hasta 30W/puerto)",
        poeStandard: "802.3at",
        poeBudgetWatts: 240,
        maxPowerPerPortWatts: 30,
        uplinkPorts: ["4x 10G SFP+ Slots"]
      }
    },
    keyAdvantages: [
      "Excelente relación coste por puerto PoE+ para telefonía IP y puestos de trabajo",
      "4 puertos 10G SFP+ incluidos de serie",
      "0€ en licencias cloud"
    ],
    antiHallucinationNotes: [
      "PoE Budget de 240W (para cámaras PTZ de alto consumo o 24 APs concurrentes se recomienda el modelo FP de 410W).",
      "Puertos Gigabit estándar (no 2.5G)."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "COMPATIBLE_TRANSCEIVER",
      rationale: "Troncal 10G sin cuellos de botella hacia el rack principal."
    },
    notebookSource: {
      sourceId: "src-7",
      title: "EnGenius ECS1528P Switch Cloud PoE+ Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecs1528p",
      rationale: "Ficha oficial de EnGenius ECS1528P en EcomShop."
    },
    additionalSourceIds: ["src-11", "src-18"],
    actionTitle: "Oportunidad Telefonía IP & Pyme: Switch 24p ECS1528P 240W",
    targetSegment: "Oficinas y Call Centers",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Optimización de inversión para instalaciones donde 240W cubren holgadamente las necesidades.",
      engineeringPerformance: "Voice VLAN automática para priorizar llamadas SIP y 4 uplinks de 10 Gbps.",
      operationsDeployment: "Aprovisionamiento Plug & Play y topología en tiempo real."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 26, HOSPITALITY: 22 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 24,
      WIFI7_MULTIGIG_EXPANSION: 15,
      HOSPITALITY_SOLUTIONS: 22,
      SWITCHING_POE_BACKBONE: 28,
      STOCK_CLEARANCE_PROMO: 25
    }
  },

  // ==========================================
  // 8. WI-TEK SWITCHES INDUSTRIALES CARRIL DIN (WI-PS310GF-I)
  // ==========================================
  {
    id: "wi-ps310gf-i",
    sku: "WI-PS310GF-I",
    model: "WI-PS310GF-I",
    name: "Wi-Tek WI-PS310GF-I Switch Industrial Carril DIN PoE+",
    brand: "Wi-Tek",
    deviceType: "SWITCH",
    category: "switches",
    description: "Switch industrial no gestionable para carril DIN con 8 puertos Gigabit PoE+ (modo extendido 250m), 2 slots Gigabit SFP y tolerancia de -40°C a 75°C.",
    url: "https://www.ecomshop.es/wi-tek-wi-ps310gf-i",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 219,
    wholesalePriceEur: 155,
    stockStatus: "IN_STOCK",
    specs: [
      "8 puertos Gigabit Ethernet PoE+ 802.3af/at (hasta 30W por puerto, budget 240W con fuente externa)",
      "2 slots Gigabit SFP para enlaces de fibra óptica en cuadros de intemperie",
      "Modo CCTV Extendido PoE hasta 250 metros a 10 Mbps",
      "Doble entrada de alimentación DC redundante (48-57V) con protección contra polaridad inversa",
      "Carcasa metálica IP40 con disipación pasiva sin ventilador (fanless)",
      "Protección contra sobretensiones de 6kV y rango térmico -40°C a +75°C"
    ],
    interfaces: ["8x GbE RJ45 PoE+ (802.3at)", "2x 1G SFP Slots", "Bloque terminal industrial 6-pin redundante"],
    powerRequirements: "Entrada industrial DC 48-57V redundante (fuente industrial carril DIN opcional)",
    poeType: "802.3at",
    poeBudgetWatts: 240,
    powerConsumptionWatts: 250,
    managementMode: "Local",
    standards: [
      "IEEE 802.3af/at PoE+",
      "Grado de protección industrial IP40",
      "Protección de sobretensión 6kV",
      "Resistencia a vibraciones IEC 60068"
    ],
    polymorphicSpecs: {
      switch: {
        switchingCapacityGbps: 20,
        forwardingRateMpps: 14.88,
        switchingLayer: "Unmanaged",
        portDensity: "8x GbE PoE+ Industrial",
        poeStandard: "802.3at",
        poeBudgetWatts: 240,
        maxPowerPerPortWatts: 30,
        uplinkPorts: ["2x 1G SFP Slots"]
      }
    },
    keyAdvantages: [
      "Modo PoE Extendido hasta 250 metros para cámaras perimetrales distantes",
      "Rango de temperatura de -40°C a +75°C sin ventiladores mecánicos",
      "Doble entrada de corriente continua redundante para evitar paradas en planta"
    ],
    antiHallucinationNotes: [
      "Switch industrial no gestionable con enlaces de fibra a 1 Gbps (SFP 1G, no es 10G SFP+).",
      "Requiere fuente de alimentación externa en carril DIN de 48-57V (no incluida de serie)."
    ],
    recommendedBundle: {
      sku: "rut241",
      name: "Teltonika RUT241 Router Industrial 4G LTE Cat 4",
      relationshipType: "ACCESSORY",
      rationale: "Conexión 4G para cuadro eléctrico perimetral alimentando cámaras mediante el switch Wi-Tek."
    },
    notebookSource: {
      sourceId: "src-witek-ps310gf-i",
      title: "Wi-Tek WI-PS310GF-I Industrial DIN-Rail Switch Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/wi-tek-wi-ps310gf-i",
      rationale: "Ficha oficial de Wi-Tek en el catálogo de ingeniería EcomShop."
    },
    additionalSourceIds: ["src-18"],
    actionTitle: "Oportunidad CCTV Industrial: Switch Carril DIN Wi-Tek con PoE 250m",
    targetSegment: "Seguridad Perimetral, Naves Industriales y Cuadros de Exterior",
    defaultAngle: "OPERATIONS",
    commercialAngles: {
      executiveRoi: "Elimina la necesidad de repetidores intermedios gracias al modo PoE extendido de 250 metros.",
      engineeringPerformance: "Cero fallos por calor o polvo en plantas industriales con rango térmico de -40°C a 75°C.",
      operationsDeployment: "Anclaje directo a carril DIN estándar en 30 segundos con borna redundante."
    },
    sectorAffinity: { LOGISTICS_INDUSTRY: 30, ENTERPRISE_OFFICE: 15 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 22,
      WIFI7_MULTIGIG_EXPANSION: 10,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 30,
      STOCK_CLEARANCE_PROMO: 20
    }
  },

  // ==========================================
  // 9. STONET SWITCHES SOBREMESA & RACK (ST3124G)
  // ==========================================
  {
    id: "st3124g",
    sku: "ST3124G",
    model: "ST3124G",
    name: "Stonet ST3124G Switch 24 Puertos Gigabit Rack 19\"",
    brand: "Stonet",
    deviceType: "SWITCH",
    category: "switches",
    description: "Switch no gestionable de 24 puertos Gigabit 10/100/1000 en formato rack 19\" metálico plug-and-play para distribución de oficinas y puestos de trabajo.",
    url: "https://www.ecomshop.es/stonet-st3124g",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 89,
    wholesalePriceEur: 59,
    stockStatus: "IN_STOCK",
    specs: [
      "24 puertos Gigabit Ethernet 10/100/1000 Mbps con auto MDI/MDIX",
      "Capacidad de conmutación 48 Gbps no bloqueante",
      "Chasis metálico resistente de 19 pulgadas con aletas de rack incluidas",
      "Tecnología Green Ethernet de ahorro energético",
      "Funcionamiento silencioso sin ventiladores (fanless)",
      "Instalación 100% Plug & Play sin configuración de software"
    ],
    interfaces: ["24x GbE RJ45 10/100/1000"],
    powerRequirements: "Entrada interna AC 100-240V 50/60Hz (consumo máx 15W)",
    poeType: "NONE",
    powerConsumptionWatts: 15,
    managementMode: "Local",
    standards: ["IEEE 802.3ab Gigabit", "IEEE 802.3az Energy Efficient", "Auto-Negotiation"],
    polymorphicSpecs: {
      switch: {
        switchingCapacityGbps: 48,
        forwardingRateMpps: 35.71,
        switchingLayer: "Unmanaged",
        portDensity: "24x 1GbE RJ45",
        poeStandard: undefined,
        poeBudgetWatts: 0,
        maxPowerPerPortWatts: 0,
        uplinkPorts: ["24x 1GbE (Puertos conmutados compartidos)"]
      }
    },
    keyAdvantages: [
      "El switch de 24 puertos Gigabit en formato rack metálico más económico del catálogo",
      "Cero ruido en despachos gracias a la arquitectura pasiva fanless",
      "Instalación instantánea sin necesidad de técnicos de configuración"
    ],
    antiHallucinationNotes: [
      "Switch NO gestionable y SIN alimentación PoE (los 24 puertos son sólo para datos).",
      "No incluye slots de fibra SFP (todos los puertos son de cobre RJ45)."
    ],
    recommendedBundle: {
      sku: "POE30Gv2",
      name: "Inyector EnGenius POE30Gv2 Gigabit PoE+ 30W",
      relationshipType: "ACCESSORY",
      rationale: "Permite alimentar puntos de acceso o teléfonos en puertos concretos manteniendo la conmutación de bajo coste."
    },
    notebookSource: {
      sourceId: "src-stonet-st3124g",
      title: "Stonet ST3124G 24-Port Gigabit Switch Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/stonet-st3124g",
      rationale: "Ficha oficial de Stonet ST3124G en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18"],
    actionTitle: "Campaña Renovación Pyme: Switch 24p Gigabit Stonet ST3124G por <90€",
    targetSegment: "Pymes, Talleres y Aulas de Informática",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "El coste por puerto Gigabit más bajo del mercado para proyectos con presupuestos cerrados.",
      engineeringPerformance: "48 Gbps wire-speed garantizados para eliminar cuellos de botella de red local de 100M.",
      operationsDeployment: "Montaje directo en rack de 19 pulgadas y puesta en marcha en 60 segundos."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 26, EDUCATION_CAMPUS: 22 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 22,
      WIFI7_MULTIGIG_EXPANSION: 10,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 35
    }
  },

  // ==========================================
  // 10. NETALLY INSTRUMENTACIÓN & CERTIFICACIÓN (AIRCHECK-G3-PRO, ETHERSCOPE-NXG)
  // ==========================================
  {
    id: "aircheck-g3-pro",
    sku: "AIRCHECK-G3-PRO",
    model: "AIRCHECK-G3-PRO",
    name: "NetAlly AirCheck G3 Pro Probador de Redes Wi-Fi 6/6E y Cobre",
    brand: "NetAlly",
    deviceType: "TESTER",
    category: "testers",
    description: "Analizador de redes inalámbricas Wi-Fi 6/6E y cableado Gigabit con pantalla táctil, escaneo de espectro, roaming audit y pruebas de carga PoE.",
    url: "https://www.ecomshop.es/netally-aircheck-g3-pro",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 2490,
    wholesalePriceEur: 1890,
    stockStatus: "IN_STOCK",
    specs: [
      "Pruebas de Wi-Fi 6/6E en bandas de 2.4 GHz, 5 GHz y 6 GHz",
      "Auditoría de roaming 802.11k/v/r y mapas de cobertura inalámbrica en tiempo real",
      "Prueba de carga PoE TruePower hasta 90W 802.3bt en puerto RJ45",
      "Detección de puntos de acceso no autorizados (Rogue APs) e interferencias de canal",
      "Pantalla táctil a color de 5 pulgadas y batería recargable de alta autonomía",
      "Carga automatizada de informes de certificación a NetAlly Link-Live Cloud"
    ],
    interfaces: [
      "1x GbE RJ45 para prueba de cable y PoE",
      "Radios internas Wi-Fi 6E (2.4/5/6 GHz)",
      "1x Conector SMA para antena externa direccional",
      "1x USB-C para carga y datos"
    ],
    powerRequirements: "Batería recargable Li-Ion con hasta 10 horas de autonomía (carga USB-C)",
    poeType: "NONE",
    powerConsumptionWatts: 15,
    managementMode: "Cloud",
    standards: [
      "Wi-Fi 6/6E (802.11ax en 2.4/5/6 GHz)",
      "IEEE 802.3bt PoE TruePower Test",
      "NetAlly Link-Live Cloud Integration"
    ],
    polymorphicSpecs: {
      tester: {
        testCapabilities: [
          "Encuesta de cobertura Wi-Fi 6/6E (2.4/5/6 GHz)",
          "Prueba de carga PoE TruePower hasta 90W (802.3bt)",
          "Análisis de espectro y detección de interferencias",
          "Test de conectividad y velocidad iPerf",
          "Detección de VLANs y servidores DHCP/DNS"
        ],
        mediaSupported: ["Wi-Fi 6/6E", "Cobre Cat5e/6/6A", "PoE 802.3af/at/bt"],
        batteryLifeHours: 10,
        poeLoadTestWatts: 90,
        screenSize: "5.0 pulgadas táctil a color"
      }
    },
    keyAdvantages: [
      "Ahorra hasta un 70% del tiempo de resolución de averías Wi-Fi complejas en clientes",
      "Comprobación real de si el switch entrega los vatios PoE que promete antes de conectar el AP",
      "Informes profesionales en PDF automáticos listos para entregar al cliente final"
    ],
    antiHallucinationNotes: [
      "IMPORTANTE: Es un INSTRUMENTO PROFESIONAL DE MEDICIÓN Y AUDITORÍA DE RED; NO es un punto de acceso ni un switch.",
      "Mide y analiza redes Wi-Fi 6/6E y cableado, no emite señal corporativa."
    ],
    recommendedBundle: {
      sku: "ECW536",
      name: "EnGenius ECW536 Cloud Tri-Band Wi-Fi 7 Access Point",
      relationshipType: "ACCESSORY",
      rationale: "Certifica y valida el despliegue del AP de alta densidad antes de la entrega al cliente."
    },
    notebookSource: {
      sourceId: "src-netally-aircheck-g3",
      title: "NetAlly AirCheck G3 Pro Wireless Analyzer Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/netally-aircheck-g3-pro",
      rationale: "Ficha oficial de NetAlly en el catálogo de instrumentación EcomShop."
    },
    additionalSourceIds: ["src-18"],
    actionTitle: "Instrumentación Oficial IT: NetAlly AirCheck G3 Pro para Certificación Wi-Fi 6E",
    targetSegment: "Ingenieros de Campo, Instaladores Tipo A y Consultoras de Red",
    defaultAngle: "OPERATIONS",
    commercialAngles: {
      executiveRoi: "Rentabiliza su coste en 3 despliegues al certificar la entrega de obra y evitar desplazamientos de garantía.",
      engineeringPerformance: "Medición en banda de 6 GHz y test de estrés PoE TruePower hasta 90W bajo carga real.",
      operationsDeployment: "Generación de informes de conformidad automáticos en la nube Link-Live con firma de instalador."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 28, LOGISTICS_INDUSTRY: 26, EDUCATION_CAMPUS: 25 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 25,
      HOSPITALITY_SOLUTIONS: 20,
      SWITCHING_POE_BACKBONE: 25,
      STOCK_CLEARANCE_PROMO: 10
    }
  },
  {
    id: "etherscope-nxg",
    sku: "ETHERSCOPE-NXG",
    model: "ETHERSCOPE-NXG",
    name: "NetAlly EtherScope nXG Analizador Portátil de Red 10G Cobre y Fibra",
    brand: "NetAlly",
    deviceType: "TESTER",
    category: "testers",
    description: "Analizador portátil de red de grado profesional con puertos duales de 10G cobre/fibra, pruebas de throughput a velocidad de línea, Wi-Fi 6 y diagnóstico de LAN/WAN.",
    url: "https://www.ecomshop.es/netally-etherscope-nxg",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 4890,
    wholesalePriceEur: 3790,
    stockStatus: "IN_STOCK",
    specs: [
      "Prueba de conmutación y enlaces de 10G/5G/2.5G/1G cobre Base-T y fibra óptica 10G/1G SFP+",
      "Generación de tráfico a velocidad de línea de hasta 10 Gbps para pruebas de estrés de backbone",
      "Medición de PoE bajo carga real de hasta 90W 802.3bt Tipo 4",
      "Auditoría completa de topología de red, switches, VLANs y servicios DHCP/DNS/Gateway",
      "Pantalla táctil capacitiva HD de 7 pulgadas con sistema operativo Android",
      "Integración con Link-Live Cloud para informes forenses y mapas de cableado"
    ],
    interfaces: [
      "1x 10G/5G/2.5G/1G RJ45 Base-T",
      "1x 10G/1G SFP+ Slot para fibra óptica",
      "1x Puerto de administración auxiliar GbE RJ45",
      "Radios Wi-Fi integradas para gestión y auditoría inalámbrica",
      "USB-A y USB-C"
    ],
    powerRequirements: "Batería recargable Li-Ion con 8 horas de operación continua (cargador 15V incluido)",
    poeType: "NONE",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: [
      "IEEE 802.3an 10GBASE-T",
      "IEEE 802.3ae 10GBASE-R SFP+",
      "IEEE 802.3bt PoE 90W",
      "RFC 2544 / Y.1564 NetAlly Line-Rate Testing"
    ],
    polymorphicSpecs: {
      tester: {
        testCapabilities: [
          "Prueba de caudal troncal a 10 Gbps wire-speed sin pérdida",
          "Test de enlaces ópticos SFP+ con medición de potencia de recepción",
          "Carga de potencia PoE TruePower hasta 90W",
          "Mapeo de topología y conmutación VLAN/LACP",
          "Análisis de retardo, jitter y pérdida de tramas"
        ],
        mediaSupported: ["Cobre 10G/Multi-Gig/1G", "Fibra Óptica 10G/1G SFP+", "Wi-Fi"],
        batteryLifeHours: 8,
        poeLoadTestWatts: 90,
        screenSize: "7.0 pulgadas HD táctil"
      }
    },
    keyAdvantages: [
      "El equipo definitivo para validar enlaces troncales de 10 Gbps antes de poner en marcha servidores y Wi-Fi 7",
      "Detecta fallos en transceptores SFP+ y atenuación de fibra en tiempo real",
      "Certificación formal con validez contractual para auditorías de telecomunicaciones"
    ],
    antiHallucinationNotes: [
      "INSTRUMENTO DE TESTEO Y CERTIFICACIÓN DE LÍNEA; NO es un switch de agregación ni un router.",
      "Dispositivo portátil con pantalla de 7 pulgadas para ingenieros de telecomunicaciones."
    ],
    recommendedBundle: {
      sku: "ECS5512F",
      name: "Switch de Agregación de Fibra EnGenius ECS5512F 12x 10G SFP+",
      relationshipType: "ACCESSORY",
      rationale: "Certificación y validación de la conmutación de 10G de fibra entre racks."
    },
    notebookSource: {
      sourceId: "src-netally-etherscope-nxg",
      title: "NetAlly EtherScope nXG 10G Network Analyzer Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/netally-etherscope-nxg",
      rationale: "Ficha oficial de EtherScope nXG en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-14", "src-18"],
    actionTitle: "Auditoría de Red Troncal 10G: NetAlly EtherScope nXG para Enlaces Críticos",
    targetSegment: "Directores TIC, Centros de Datos y Contratistas de Telecomunicaciones",
    defaultAngle: "PERFORMANCE",
    commercialAngles: {
      executiveRoi: "Evita litigios y multas de cumplimiento al certificar por escrito el caudal contratado de 10 Gbps.",
      engineeringPerformance: "Pruebas de estrés RFC 2544 a velocidad de línea de 10G con cero suposiciones teóricas.",
      operationsDeployment: "Detección instantánea de cables cruzados, atenuación en fibra y switches saturados."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 28, LOGISTICS_INDUSTRY: 28, EDUCATION_CAMPUS: 26 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 25,
      HOSPITALITY_SOLUTIONS: 18,
      SWITCHING_POE_BACKBONE: 30,
      STOCK_CLEARANCE_PROMO: 10
    }
  }
,
  {
    id: "ecw336",
    sku: "ECW336",
    model: "ECW336",
    name: "EnGenius Cloud Wi-Fi 6E Tri-Band ECW336 Access Point",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "EnGenius Cloud Wi-Fi 6E Tri-Band ECW336 Access Point homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-ecw336",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 499,
    wholesalePriceEur: 360,
    stockStatus: "IN_STOCK",
    specs: ["Tri-Band Wi-Fi 6E 4x4","Puerto 5 GbE PoE+"],
    interfaces: ["1x 5 GbE RJ45 (PoE+ 802.3at)"],
    powerRequirements: "PoE+ 802.3at (25W)",
    poeType: "802.3at",
    powerConsumptionWatts: 25,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius Cloud Wi-Fi 6E Tri-Band ECW336 Access Point certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ecw336",
      title: "Ficha Técnica Oficial EnGenius ECW336",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw336",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ECW336",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ecw230v2",
    sku: "ECW230v2",
    model: "ECW230v2",
    name: "EnGenius Cloud Wi-Fi 6 ECW230 v2 4x4 AP",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "EnGenius Cloud Wi-Fi 6 ECW230 v2 4x4 AP homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-ecw230v2",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 389,
    wholesalePriceEur: 280,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Fi 6 4x4:4 Dual-Band","Puerto 2.5 GbE PoE+"],
    interfaces: ["1x 2.5 GbE RJ45 (PoE+ 802.3at)"],
    powerRequirements: "PoE+ 802.3at (19.5W)",
    poeType: "802.3at",
    powerConsumptionWatts: 19.5,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius Cloud Wi-Fi 6 ECW230 v2 4x4 AP certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ecw230v2",
      title: "Ficha Técnica Oficial EnGenius ECW230v2",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw230v2",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ECW230v2",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ecw215",
    sku: "ECW215",
    model: "ECW215",
    name: "EnGenius Cloud Wi-Fi 6 Wall-Plate ECW215 AP con Switch 3p",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "EnGenius Cloud Wi-Fi 6 Wall-Plate ECW215 AP con Switch 3p homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-ecw215",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 199,
    wholesalePriceEur: 145,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Fi 6 2x2 Wall-Plate","Switch 3 puertos GbE integrados con PoE passthrough"],
    interfaces: ["1x GbE Uplink PoE+","3x GbE LAN (1x PoE Out)"],
    powerRequirements: "PoE+ 802.3at (21W con PoE Out)",
    poeType: "802.3at",
    powerConsumptionWatts: 21,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius Cloud Wi-Fi 6 Wall-Plate ECW215 AP con Switch 3p certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ecw215",
      title: "Ficha Técnica Oficial EnGenius ECW215",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw215",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ECW215",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ecw120",
    sku: "ECW120",
    model: "ECW120",
    name: "EnGenius Cloud Wi-Fi 5 ECW120 2x2 Compact AP",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "EnGenius Cloud Wi-Fi 5 ECW120 2x2 Compact AP homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-ecw120",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 139,
    wholesalePriceEur: 95,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Fi 5 2x2 Dual-Band","Gestión Cloud 0€"],
    interfaces: ["1x GbE RJ45 (PoE 802.3af)"],
    powerRequirements: "PoE 802.3af (11W)",
    poeType: "802.3af",
    powerConsumptionWatts: 11,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius Cloud Wi-Fi 5 ECW120 2x2 Compact AP certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ecw120",
      title: "Ficha Técnica Oficial EnGenius ECW120",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecw120",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ECW120",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ews377ap",
    sku: "EWS377AP",
    model: "EWS377AP",
    name: "EnGenius Fit/Standalone Wi-Fi 6 4x4 EWS377AP",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "EnGenius Fit/Standalone Wi-Fi 6 4x4 EWS377AP homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-ews377ap",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 349,
    wholesalePriceEur: 250,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Fi 6 4x4 Standalone/On-Premise","Puerto 2.5 GbE"],
    interfaces: ["1x 2.5 GbE RJ45 (PoE+ 802.3at)"],
    powerRequirements: "PoE+ 802.3at (19.5W)",
    poeType: "802.3at",
    powerConsumptionWatts: 19.5,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius Fit/Standalone Wi-Fi 6 4x4 EWS377AP certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ews377ap",
      title: "Ficha Técnica Oficial EnGenius EWS377AP",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ews377ap",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con EWS377AP",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ecs1008p",
    sku: "ECS1008P",
    model: "ECS1008P",
    name: "EnGenius ECS1008P Switch Cloud 8 Puertos GbE PoE+ (55W)",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "EnGenius ECS1008P Switch Cloud 8 Puertos GbE PoE+ (55W) homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-ecs1008p",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 149,
    wholesalePriceEur: 105,
    stockStatus: "IN_STOCK",
    specs: ["8 puertos GbE PoE+ (55W budget)","Sin ventilador silencioso"],
    interfaces: ["8x GbE RJ45 PoE+ (802.3at)"],
    powerRequirements: "100-240V AC (65W máx)",
    poeType: "802.3at",
    powerConsumptionWatts: 65,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius ECS1008P Switch Cloud 8 Puertos GbE PoE+ (55W) certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ecs1008p",
      title: "Ficha Técnica Oficial EnGenius ECS1008P",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecs1008p",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ECS1008P",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ecs1552fp",
    sku: "ECS1552FP",
    model: "ECS1552FP",
    name: "EnGenius ECS1552FP Switch Cloud 48 Puertos GbE PoE+ (740W)",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "EnGenius ECS1552FP Switch Cloud 48 Puertos GbE PoE+ (740W) homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-ecs1552fp",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 999,
    wholesalePriceEur: 720,
    stockStatus: "IN_STOCK",
    specs: ["48 puertos GbE PoE+ (740W budget)","4 uplinks 10G SFP+"],
    interfaces: ["48x GbE RJ45 PoE+ (802.3at)","4x 10G SFP+ Slots"],
    powerRequirements: "100-240V AC (830W máx)",
    poeType: "802.3at",
    powerConsumptionWatts: 830,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius ECS1552FP Switch Cloud 48 Puertos GbE PoE+ (740W) certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ecs1552fp",
      title: "Ficha Técnica Oficial EnGenius ECS1552FP",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecs1552fp",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ECS1552FP",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ecs2552fp",
    sku: "ECS2552FP",
    model: "ECS2552FP",
    name: "EnGenius ECS2552FP Switch Multi-Gig 32p 2.5G + 16p 1G PoE++",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "EnGenius ECS2552FP Switch Multi-Gig 32p 2.5G + 16p 1G PoE++ homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-ecs2552fp",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 1490,
    wholesalePriceEur: 1080,
    stockStatus: "IN_STOCK",
    specs: ["32p 2.5G + 16p 1G PoE++ (740W)","4 uplinks 10G SFP+"],
    interfaces: ["32x 2.5G RJ45 PoE++","16x 1G RJ45 PoE+","4x 10G SFP+ Slots"],
    powerRequirements: "100-240V AC (850W máx)",
    poeType: "802.3bt",
    powerConsumptionWatts: 850,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius ECS2552FP Switch Multi-Gig 32p 2.5G + 16p 1G PoE++ certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ecs2552fp",
      title: "Ficha Técnica Oficial EnGenius ECS2552FP",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecs2552fp",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ECS2552FP",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ecs1528",
    sku: "ECS1528",
    model: "ECS1528",
    name: "EnGenius ECS1528 Switch Cloud 24 Puertos GbE No-PoE",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "EnGenius ECS1528 Switch Cloud 24 Puertos GbE No-PoE homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-ecs1528",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 279,
    wholesalePriceEur: 199,
    stockStatus: "IN_STOCK",
    specs: ["24 puertos GbE sin PoE","4 uplinks 10G SFP+"],
    interfaces: ["24x GbE RJ45","4x 10G SFP+ Slots"],
    powerRequirements: "100-240V AC (30W máx)",
    poeType: "NONE",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius ECS1528 Switch Cloud 24 Puertos GbE No-PoE certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ecs1528",
      title: "Ficha Técnica Oficial EnGenius ECS1528",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ecs1528",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ECS1528",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "esg501",
    sku: "ESG501",
    model: "ESG501",
    name: "EnGenius ESG501 Compact Cloud Security Gateway",
    brand: "EnGenius",
    deviceType: "GATEWAY",
    category: "gateways",
    description: "EnGenius ESG501 Compact Cloud Security Gateway homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-esg501",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 249,
    wholesalePriceEur: 179,
    stockStatus: "IN_STOCK",
    specs: ["2 puertos 2.5GbE WAN/LAN","Stateful Firewall 1.5 Gbps"],
    interfaces: ["2x 2.5 GbE RJ45 (1x WAN / 1x LAN)"],
    powerRequirements: "Alimentación 12V DC / PoE in 802.3af",
    poeType: "802.3af",
    powerConsumptionWatts: 12,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius ESG501 Compact Cloud Security Gateway certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-esg501",
      title: "Ficha Técnica Oficial EnGenius ESG501",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-esg501",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ESG501",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "epa5006gp",
    sku: "EPA5006GP",
    model: "EPA5006GP",
    name: "EnGenius EPA5006GP Inyector Gigabit PoE+ 30W Industrial",
    brand: "EnGenius",
    deviceType: "ACCESSORY",
    category: "poe_injectors",
    description: "EnGenius EPA5006GP Inyector Gigabit PoE+ 30W Industrial homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-epa5006gp",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 49,
    wholesalePriceEur: 32,
    stockStatus: "IN_STOCK",
    specs: ["Inyector PoE+ 30W 802.3at","Puerto Gigabit passthrough"],
    interfaces: ["1x GbE Data In","1x GbE Data + PoE Out"],
    powerRequirements: "100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius EPA5006GP Inyector Gigabit PoE+ 30W Industrial certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-epa5006gp",
      title: "Ficha Técnica Oficial EnGenius EPA5006GP",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-epa5006gp",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con EPA5006GP",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "epa5006gat",
    sku: "EPA5006GAT",
    model: "EPA5006GAT",
    name: "EnGenius EPA5006GAT Inyector Ultra PoE 60W Gigabit",
    brand: "EnGenius",
    deviceType: "ACCESSORY",
    category: "poe_injectors",
    description: "EnGenius EPA5006GAT Inyector Ultra PoE 60W Gigabit homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-epa5006gat",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 89,
    wholesalePriceEur: 59,
    stockStatus: "IN_STOCK",
    specs: ["Inyector Ultra PoE 60W 802.3bt","Alimentación APs Wi-Fi 7"],
    interfaces: ["1x GbE Data In","1x GbE Data + PoE Out"],
    powerRequirements: "100-240V AC",
    poeType: "802.3bt",
    powerConsumptionWatts: 60,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius EPA5006GAT Inyector Ultra PoE 60W Gigabit certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-epa5006gat",
      title: "Ficha Técnica Oficial EnGenius EPA5006GAT",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-epa5006gat",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con EPA5006GAT",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "enmesh-ebm",
    sku: "EnMesh-EBM",
    model: "EnMesh-EBM",
    name: "EnGenius EnMesh EBM100 Sistema MESH Wi-Fi 5 para Pymes",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "EnGenius EnMesh EBM100 Sistema MESH Wi-Fi 5 para Pymes homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-enmesh-ebm",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 129,
    wholesalePriceEur: 89,
    stockStatus: "IN_STOCK",
    specs: ["Sistema MESH Dual-Band 2x2","Cobertura extendida sin cables"],
    interfaces: ["2x GbE RJ45 (WAN/LAN)"],
    powerRequirements: "Adaptador 12V DC",
    poeType: "NONE",
    powerConsumptionWatts: 12,
    managementMode: "Local",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius EnMesh EBM100 Sistema MESH Wi-Fi 5 para Pymes certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-enmesh-ebm",
      title: "Ficha Técnica Oficial EnGenius EnMesh-EBM",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-enmesh-ebm",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con EnMesh-EBM",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ews2910p-fit",
    sku: "EWS2910P-FIT",
    model: "EWS2910P-FIT",
    name: "EnGenius Fit EWS2910P Switch 8 Puertos GbE PoE+ (61W)",
    brand: "EnGenius",
    deviceType: "SWITCH",
    category: "switches",
    description: "EnGenius Fit EWS2910P Switch 8 Puertos GbE PoE+ (61W) homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-ews2910p-fit",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 139,
    wholesalePriceEur: 99,
    stockStatus: "IN_STOCK",
    specs: ["8 puertos GbE PoE+ (61W budget)","2 uplinks SFP 1G"],
    interfaces: ["8x GbE RJ45 PoE+","2x 1G SFP Slots"],
    powerRequirements: "100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 75,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius Fit EWS2910P Switch 8 Puertos GbE PoE+ (61W) certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ews2910p-fit",
      title: "Ficha Técnica Oficial EnGenius EWS2910P-FIT",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ews2910p-fit",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con EWS2910P-FIT",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ews357-fit",
    sku: "EWS357-FIT",
    model: "EWS357-FIT",
    name: "EnGenius Fit EWS357-FIT Wi-Fi 6 2x2 AP Standalone",
    brand: "EnGenius",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "EnGenius Fit EWS357-FIT Wi-Fi 6 2x2 AP Standalone homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/engenius-ews357-fit",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 119,
    wholesalePriceEur: 85,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Fi 6 2x2 Dual-Band Fit/Standalone","Gestión local GUI"],
    interfaces: ["1x GbE RJ45 (PoE 802.3af)"],
    powerRequirements: "PoE 802.3af (12.8W)",
    poeType: "802.3af",
    powerConsumptionWatts: 12.8,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EnGenius Fit EWS357-FIT Wi-Fi 6 2x2 AP Standalone certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ews357-fit",
      title: "Ficha Técnica Oficial EnGenius EWS357-FIT",
      type: "datasheet",
      url: "https://www.ecomshop.es/engenius-ews357-fit",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con EWS357-FIT",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "rut951",
    sku: "RUT951",
    model: "RUT951",
    name: "Teltonika RUT951 Router Industrial 4G LTE Cat 4 Wi-Fi",
    brand: "Teltonika",
    deviceType: "ROUTER_CELLULAR",
    category: "cellular",
    description: "Teltonika RUT951 Router Industrial 4G LTE Cat 4 Wi-Fi homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/teltonika-rut951",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 199,
    wholesalePriceEur: 145,
    stockStatus: "IN_STOCK",
    specs: ["Teltonika RUT951 Router Industrial 4G LTE Cat 4 Wi-Fi de grado industrial Teltonika","Carcasa de aluminio robusta carril DIN","Gestión remota RMS"],
    interfaces: ["4x GbE RJ45","1x Ranura SIM"],
    powerRequirements: "Entrada 9-30V DC borna terminal",
    poeType: "NONE",
    powerConsumptionWatts: 10,
    managementMode: "RMS",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Teltonika RUT951 Router Industrial 4G LTE Cat 4 Wi-Fi certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-rut951",
      title: "Teltonika RUT951 Industrial Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-rut951",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con RUT951",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "rutx11",
    sku: "RUTX11",
    model: "RUTX11",
    name: "Teltonika RUTX11 Router Industrial 4G Cat 6 Dual-SIM Wave-2",
    brand: "Teltonika",
    deviceType: "ROUTER_CELLULAR",
    category: "cellular",
    description: "Teltonika RUTX11 Router Industrial 4G Cat 6 Dual-SIM Wave-2 homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/teltonika-rutx11",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 329,
    wholesalePriceEur: 240,
    stockStatus: "IN_STOCK",
    specs: ["Teltonika RUTX11 Router Industrial 4G Cat 6 Dual-SIM Wave-2 de grado industrial Teltonika","Carcasa de aluminio robusta carril DIN","Gestión remota RMS"],
    interfaces: ["4x GbE RJ45","1x Ranura SIM"],
    powerRequirements: "Entrada 9-30V DC borna terminal",
    poeType: "NONE",
    powerConsumptionWatts: 10,
    managementMode: "RMS",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Teltonika RUTX11 Router Industrial 4G Cat 6 Dual-SIM Wave-2 certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-rutx11",
      title: "Teltonika RUTX11 Industrial Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-rutx11",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con RUTX11",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "rutx12",
    sku: "RUTX12",
    model: "RUTX12",
    name: "Teltonika RUTX12 Router Dual-LTE Cat 6 Dual-Modem Industrial",
    brand: "Teltonika",
    deviceType: "ROUTER_CELLULAR",
    category: "cellular",
    description: "Teltonika RUTX12 Router Dual-LTE Cat 6 Dual-Modem Industrial homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/teltonika-rutx12",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 459,
    wholesalePriceEur: 335,
    stockStatus: "IN_STOCK",
    specs: ["Teltonika RUTX12 Router Dual-LTE Cat 6 Dual-Modem Industrial de grado industrial Teltonika","Carcasa de aluminio robusta carril DIN","Gestión remota RMS"],
    interfaces: ["4x GbE RJ45","1x Ranura SIM"],
    powerRequirements: "Entrada 9-30V DC borna terminal",
    poeType: "NONE",
    powerConsumptionWatts: 10,
    managementMode: "RMS",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Teltonika RUTX12 Router Dual-LTE Cat 6 Dual-Modem Industrial certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-rutx12",
      title: "Teltonika RUTX12 Industrial Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-rutx12",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con RUTX12",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "rutx14",
    sku: "RUTX14",
    model: "RUTX14",
    name: "Teltonika RUTX14 Router Industrial 4G Cat 12 Ultra-Rápido",
    brand: "Teltonika",
    deviceType: "ROUTER_CELLULAR",
    category: "cellular",
    description: "Teltonika RUTX14 Router Industrial 4G Cat 12 Ultra-Rápido homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/teltonika-rutx14",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 399,
    wholesalePriceEur: 290,
    stockStatus: "IN_STOCK",
    specs: ["Teltonika RUTX14 Router Industrial 4G Cat 12 Ultra-Rápido de grado industrial Teltonika","Carcasa de aluminio robusta carril DIN","Gestión remota RMS"],
    interfaces: ["4x GbE RJ45","1x Ranura SIM"],
    powerRequirements: "Entrada 9-30V DC borna terminal",
    poeType: "NONE",
    powerConsumptionWatts: 10,
    managementMode: "RMS",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Teltonika RUTX14 Router Industrial 4G Cat 12 Ultra-Rápido certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-rutx14",
      title: "Teltonika RUTX14 Industrial Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-rutx14",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con RUTX14",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "rut360",
    sku: "RUT360",
    model: "RUT360",
    name: "Teltonika RUT360 Router Industrial 4G Cat 6 Compacto",
    brand: "Teltonika",
    deviceType: "ROUTER_CELLULAR",
    category: "cellular",
    description: "Teltonika RUT360 Router Industrial 4G Cat 6 Compacto homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/teltonika-rut360",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 169,
    wholesalePriceEur: 120,
    stockStatus: "IN_STOCK",
    specs: ["Teltonika RUT360 Router Industrial 4G Cat 6 Compacto de grado industrial Teltonika","Carcasa de aluminio robusta carril DIN","Gestión remota RMS"],
    interfaces: ["4x GbE RJ45","1x Ranura SIM"],
    powerRequirements: "Entrada 9-30V DC borna terminal",
    poeType: "NONE",
    powerConsumptionWatts: 10,
    managementMode: "RMS",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Teltonika RUT360 Router Industrial 4G Cat 6 Compacto certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-rut360",
      title: "Teltonika RUT360 Industrial Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-rut360",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con RUT360",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "trb140",
    sku: "TRB140",
    model: "TRB140",
    name: "Teltonika TRB140 Gateway Industrial 4G LTE Cat 4 Ethernet",
    brand: "Teltonika",
    deviceType: "GATEWAY",
    category: "cellular",
    description: "Teltonika TRB140 Gateway Industrial 4G LTE Cat 4 Ethernet homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/teltonika-trb140",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 129,
    wholesalePriceEur: 92,
    stockStatus: "IN_STOCK",
    specs: ["Teltonika TRB140 Gateway Industrial 4G LTE Cat 4 Ethernet de grado industrial Teltonika","Carcasa de aluminio robusta carril DIN","Gestión remota RMS"],
    interfaces: ["1x GbE RJ45","1x Ranura SIM"],
    powerRequirements: "Entrada 9-30V DC borna terminal",
    poeType: "NONE",
    powerConsumptionWatts: 10,
    managementMode: "RMS",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Teltonika TRB140 Gateway Industrial 4G LTE Cat 4 Ethernet certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-trb140",
      title: "Teltonika TRB140 Industrial Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-trb140",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con TRB140",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "trb142",
    sku: "TRB142",
    model: "TRB142",
    name: "Teltonika TRB142 Gateway Industrial 4G RS232 IoT",
    brand: "Teltonika",
    deviceType: "GATEWAY",
    category: "cellular",
    description: "Teltonika TRB142 Gateway Industrial 4G RS232 IoT homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/teltonika-trb142",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 139,
    wholesalePriceEur: 99,
    stockStatus: "IN_STOCK",
    specs: ["Teltonika TRB142 Gateway Industrial 4G RS232 IoT de grado industrial Teltonika","Carcasa de aluminio robusta carril DIN","Gestión remota RMS"],
    interfaces: ["1x GbE RJ45","1x Ranura SIM"],
    powerRequirements: "Entrada 9-30V DC borna terminal",
    poeType: "NONE",
    powerConsumptionWatts: 10,
    managementMode: "RMS",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Teltonika TRB142 Gateway Industrial 4G RS232 IoT certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-trb142",
      title: "Teltonika TRB142 Industrial Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-trb142",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con TRB142",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "trb145",
    sku: "TRB145",
    model: "TRB145",
    name: "Teltonika TRB145 Gateway Industrial 4G RS485 IoT",
    brand: "Teltonika",
    deviceType: "GATEWAY",
    category: "cellular",
    description: "Teltonika TRB145 Gateway Industrial 4G RS485 IoT homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/teltonika-trb145",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 139,
    wholesalePriceEur: 99,
    stockStatus: "IN_STOCK",
    specs: ["Teltonika TRB145 Gateway Industrial 4G RS485 IoT de grado industrial Teltonika","Carcasa de aluminio robusta carril DIN","Gestión remota RMS"],
    interfaces: ["1x GbE RJ45","1x Ranura SIM"],
    powerRequirements: "Entrada 9-30V DC borna terminal",
    poeType: "NONE",
    powerConsumptionWatts: 10,
    managementMode: "RMS",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Teltonika TRB145 Gateway Industrial 4G RS485 IoT certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-trb145",
      title: "Teltonika TRB145 Industrial Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-trb145",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con TRB145",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "trb500",
    sku: "TRB500",
    model: "TRB500",
    name: "Teltonika TRB500 Gateway Industrial 5G Ultra-Compacto Gigabit",
    brand: "Teltonika",
    deviceType: "GATEWAY",
    category: "cellular",
    description: "Teltonika TRB500 Gateway Industrial 5G Ultra-Compacto Gigabit homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/teltonika-trb500",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 349,
    wholesalePriceEur: 255,
    stockStatus: "IN_STOCK",
    specs: ["Teltonika TRB500 Gateway Industrial 5G Ultra-Compacto Gigabit de grado industrial Teltonika","Carcasa de aluminio robusta carril DIN","Gestión remota RMS"],
    interfaces: ["1x GbE RJ45","1x Ranura SIM"],
    powerRequirements: "Entrada 9-30V DC borna terminal",
    poeType: "NONE",
    powerConsumptionWatts: 10,
    managementMode: "RMS",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Teltonika TRB500 Gateway Industrial 5G Ultra-Compacto Gigabit certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-trb500",
      title: "Teltonika TRB500 Industrial Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-trb500",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con TRB500",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "tsw100",
    sku: "TSW100",
    model: "TSW100",
    name: "Teltonika TSW100 Switch Industrial Carril DIN 5p GbE PoE+ (240W)",
    brand: "Teltonika",
    deviceType: "SWITCH",
    category: "switches",
    description: "Teltonika TSW100 Switch Industrial Carril DIN 5p GbE PoE+ (240W) homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/teltonika-tsw100",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 119,
    wholesalePriceEur: 85,
    stockStatus: "IN_STOCK",
    specs: ["Teltonika TSW100 Switch Industrial Carril DIN 5p GbE PoE+ (240W) de grado industrial Teltonika","Carcasa de aluminio robusta carril DIN","Gestión remota RMS"],
    interfaces: ["1x GbE RJ45","1x Ranura SIM"],
    powerRequirements: "Entrada 9-30V DC borna terminal",
    poeType: "NONE",
    powerConsumptionWatts: 10,
    managementMode: "RMS",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Teltonika TSW100 Switch Industrial Carril DIN 5p GbE PoE+ (240W) certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-tsw100",
      title: "Teltonika TSW100 Industrial Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/teltonika-tsw100",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con TSW100",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "wi-ps308gh",
    sku: "WI-PS308GH",
    model: "WI-PS308GH",
    name: "Wi-Tek WI-PS308GH Switch 8 Puertos GbE PoE+ 120W Desktop",
    brand: "Wi-Tek",
    deviceType: "SWITCH",
    category: "switches",
    description: "Wi-Tek WI-PS308GH Switch 8 Puertos GbE PoE+ 120W Desktop homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/witek-wi-ps308gh",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 89,
    wholesalePriceEur: 62,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Tek WI-PS308GH Switch 8 Puertos GbE PoE+ 120W Desktop profesional para CCTV y conectividad comercial","Carcasa metálica de alta resistencia"],
    interfaces: ["2x GbE RJ45"],
    powerRequirements: "100-240V AC / PoE",
    poeType: "802.3at",
    powerConsumptionWatts: 120,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Wi-Tek WI-PS308GH Switch 8 Puertos GbE PoE+ 120W Desktop certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-wi-ps308gh",
      title: "Wi-Tek WI-PS308GH Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/witek-wi-ps308gh",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con WI-PS308GH",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "wi-ps318gf",
    sku: "WI-PS318GF",
    model: "WI-PS318GF",
    name: "Wi-Tek WI-PS318GF Switch 16p GbE PoE+ (250W) + 2p SFP",
    brand: "Wi-Tek",
    deviceType: "SWITCH",
    category: "switches",
    description: "Wi-Tek WI-PS318GF Switch 16p GbE PoE+ (250W) + 2p SFP homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/witek-wi-ps318gf",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 219,
    wholesalePriceEur: 155,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Tek WI-PS318GF Switch 16p GbE PoE+ (250W) + 2p SFP profesional para CCTV y conectividad comercial","Carcasa metálica de alta resistencia"],
    interfaces: ["2x GbE RJ45"],
    powerRequirements: "100-240V AC / PoE",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Wi-Tek WI-PS318GF Switch 16p GbE PoE+ (250W) + 2p SFP certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-wi-ps318gf",
      title: "Wi-Tek WI-PS318GF Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/witek-wi-ps318gf",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con WI-PS318GF",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "wi-ps326gf",
    sku: "WI-PS326GF",
    model: "WI-PS326GF",
    name: "Wi-Tek WI-PS326GF Switch 24p GbE PoE+ (350W) + 2p SFP",
    brand: "Wi-Tek",
    deviceType: "SWITCH",
    category: "switches",
    description: "Wi-Tek WI-PS326GF Switch 24p GbE PoE+ (350W) + 2p SFP homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/witek-wi-ps326gf",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 299,
    wholesalePriceEur: 215,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Tek WI-PS326GF Switch 24p GbE PoE+ (350W) + 2p SFP profesional para CCTV y conectividad comercial","Carcasa metálica de alta resistencia"],
    interfaces: ["2x GbE RJ45"],
    powerRequirements: "100-240V AC / PoE",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Wi-Tek WI-PS326GF Switch 24p GbE PoE+ (350W) + 2p SFP certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-wi-ps326gf",
      title: "Wi-Tek WI-PS326GF Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/witek-wi-ps326gf",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con WI-PS326GF",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "wi-pms310gf-i",
    sku: "WI-PMS310GF-I",
    model: "WI-PMS310GF-I",
    name: "Wi-Tek WI-PMS310GF-I Switch Industrial L2 Managed 8p PoE+",
    brand: "Wi-Tek",
    deviceType: "SWITCH",
    category: "switches",
    description: "Wi-Tek WI-PMS310GF-I Switch Industrial L2 Managed 8p PoE+ homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/witek-wi-pms310gf-i",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 249,
    wholesalePriceEur: 179,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Tek WI-PMS310GF-I Switch Industrial L2 Managed 8p PoE+ profesional para CCTV y conectividad comercial","Carcasa metálica de alta resistencia"],
    interfaces: ["8x GbE PoE+"],
    powerRequirements: "100-240V AC / PoE",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Wi-Tek WI-PMS310GF-I Switch Industrial L2 Managed 8p PoE+ certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-wi-pms310gf-i",
      title: "Wi-Tek WI-PMS310GF-I Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/witek-wi-pms310gf-i",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con WI-PMS310GF-I",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "wi-cpe513p-kit",
    sku: "WI-CPE513P-KIT",
    model: "WI-CPE513P-KIT",
    name: "Wi-Tek WI-CPE513P-KIT Enlace Inalámbrico Exterior 5GHz 5km PTP",
    brand: "Wi-Tek",
    deviceType: "CPE_PTP",
    category: "cpe_ptp",
    description: "Wi-Tek WI-CPE513P-KIT Enlace Inalámbrico Exterior 5GHz 5km PTP homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/witek-wi-cpe513p-kit",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 129,
    wholesalePriceEur: 89,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Tek WI-CPE513P-KIT Enlace Inalámbrico Exterior 5GHz 5km PTP profesional para CCTV y conectividad comercial","Carcasa metálica de alta resistencia"],
    interfaces: ["2x GbE RJ45"],
    powerRequirements: "100-240V AC / PoE",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Wi-Tek WI-CPE513P-KIT Enlace Inalámbrico Exterior 5GHz 5km PTP certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-wi-cpe513p-kit",
      title: "Wi-Tek WI-CPE513P-KIT Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/witek-wi-cpe513p-kit",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con WI-CPE513P-KIT",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "wi-cpe511h-kit",
    sku: "WI-CPE511H-KIT",
    model: "WI-CPE511H-KIT",
    name: "Wi-Tek WI-CPE511H-KIT Bridge Inalámbrico 5GHz 3km PTP 300Mbps",
    brand: "Wi-Tek",
    deviceType: "CPE_PTP",
    category: "cpe_ptp",
    description: "Wi-Tek WI-CPE511H-KIT Bridge Inalámbrico 5GHz 3km PTP 300Mbps homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/witek-wi-cpe511h-kit",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 99,
    wholesalePriceEur: 69,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Tek WI-CPE511H-KIT Bridge Inalámbrico 5GHz 3km PTP 300Mbps profesional para CCTV y conectividad comercial","Carcasa metálica de alta resistencia"],
    interfaces: ["2x GbE RJ45"],
    powerRequirements: "100-240V AC / PoE",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Wi-Tek WI-CPE511H-KIT Bridge Inalámbrico 5GHz 3km PTP 300Mbps certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-wi-cpe511h-kit",
      title: "Wi-Tek WI-CPE511H-KIT Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/witek-wi-cpe511h-kit",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con WI-CPE511H-KIT",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "wi-pa300",
    sku: "WI-PA300",
    model: "WI-PA300",
    name: "Wi-Tek WI-PA300 Inyector PoE Pasivo 24V/48V 30W Gigabit",
    brand: "Wi-Tek",
    deviceType: "ACCESSORY",
    category: "poe_injectors",
    description: "Wi-Tek WI-PA300 Inyector PoE Pasivo 24V/48V 30W Gigabit homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/witek-wi-pa300",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 25,
    wholesalePriceEur: 16,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Tek WI-PA300 Inyector PoE Pasivo 24V/48V 30W Gigabit profesional para CCTV y conectividad comercial","Carcasa metálica de alta resistencia"],
    interfaces: ["2x GbE RJ45"],
    powerRequirements: "100-240V AC / PoE",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Wi-Tek WI-PA300 Inyector PoE Pasivo 24V/48V 30W Gigabit certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-wi-pa300",
      title: "Wi-Tek WI-PA300 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/witek-wi-pa300",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con WI-PA300",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "wi-lte115-o",
    sku: "WI-LTE115-O",
    model: "WI-LTE115-O",
    name: "Wi-Tek WI-LTE115-O Router 4G LTE Exterior IP65 con PoE",
    brand: "Wi-Tek",
    deviceType: "ROUTER_CELLULAR",
    category: "cellular",
    description: "Wi-Tek WI-LTE115-O Router 4G LTE Exterior IP65 con PoE homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/witek-wi-lte115-o",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 149,
    wholesalePriceEur: 105,
    stockStatus: "IN_STOCK",
    specs: ["Wi-Tek WI-LTE115-O Router 4G LTE Exterior IP65 con PoE profesional para CCTV y conectividad comercial","Carcasa metálica de alta resistencia"],
    interfaces: ["2x GbE RJ45"],
    powerRequirements: "100-240V AC / PoE",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Wi-Tek WI-LTE115-O Router 4G LTE Exterior IP65 con PoE certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-wi-lte115-o",
      title: "Wi-Tek WI-LTE115-O Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/witek-wi-lte115-o",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con WI-LTE115-O",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "st3108g",
    sku: "ST3108G",
    model: "ST3108G",
    name: "Stonet ST3108G Switch 8 Puertos Gigabit Desktop Plástico",
    brand: "Stonet",
    deviceType: "SWITCH",
    category: "switches",
    description: "Stonet ST3108G Switch 8 Puertos Gigabit Desktop Plástico homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/stonet-st3108g",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 19,
    wholesalePriceEur: 12,
    stockStatus: "IN_STOCK",
    specs: ["Stonet ST3108G Switch 8 Puertos Gigabit Desktop Plástico Plug&Play de bajo coste","Diseño compacto y consumo eficiente"],
    interfaces: ["19x GbE RJ45"],
    powerRequirements: "Adaptador 5V/9V DC",
    poeType: "NONE",
    powerConsumptionWatts: 5,
    managementMode: "Unmanaged",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Stonet ST3108G Switch 8 Puertos Gigabit Desktop Plástico certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-st3108g",
      title: "Stonet ST3108G Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/stonet-st3108g",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ST3108G",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "st3105g",
    sku: "ST3105G",
    model: "ST3105G",
    name: "Stonet ST3105G Switch 5 Puertos Gigabit Compacto Desktop",
    brand: "Stonet",
    deviceType: "SWITCH",
    category: "switches",
    description: "Stonet ST3105G Switch 5 Puertos Gigabit Compacto Desktop homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/stonet-st3105g",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 14,
    wholesalePriceEur: 9,
    stockStatus: "IN_STOCK",
    specs: ["Stonet ST3105G Switch 5 Puertos Gigabit Compacto Desktop Plug&Play de bajo coste","Diseño compacto y consumo eficiente"],
    interfaces: ["14x GbE RJ45"],
    powerRequirements: "Adaptador 5V/9V DC",
    poeType: "NONE",
    powerConsumptionWatts: 5,
    managementMode: "Unmanaged",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Stonet ST3105G Switch 5 Puertos Gigabit Compacto Desktop certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-st3105g",
      title: "Stonet ST3105G Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/stonet-st3105g",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ST3105G",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "st3116g",
    sku: "ST3116G",
    model: "ST3116G",
    name: "Stonet ST3116G Switch 16 Puertos Gigabit Rack 19\"",
    brand: "Stonet",
    deviceType: "SWITCH",
    category: "switches",
    description: "Stonet ST3116G Switch 16 Puertos Gigabit Rack 19\" homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/stonet-st3116g",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 59,
    wholesalePriceEur: 39,
    stockStatus: "IN_STOCK",
    specs: ["Stonet ST3116G Switch 16 Puertos Gigabit Rack 19\" Plug&Play de bajo coste","Diseño compacto y consumo eficiente"],
    interfaces: ["59x GbE RJ45"],
    powerRequirements: "Adaptador 5V/9V DC",
    poeType: "NONE",
    powerConsumptionWatts: 5,
    managementMode: "Unmanaged",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Stonet ST3116G Switch 16 Puertos Gigabit Rack 19\" certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-st3116g",
      title: "Stonet ST3116G Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/stonet-st3116g",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ST3116G",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "st3310gf",
    sku: "ST3310GF",
    model: "ST3310GF",
    name: "Stonet ST3310GF Switch 8 Puertos GbE PoE+ (120W) + 2 SFP",
    brand: "Stonet",
    deviceType: "SWITCH",
    category: "switches",
    description: "Stonet ST3310GF Switch 8 Puertos GbE PoE+ (120W) + 2 SFP homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/stonet-st3310gf",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 99,
    wholesalePriceEur: 69,
    stockStatus: "IN_STOCK",
    specs: ["Stonet ST3310GF Switch 8 Puertos GbE PoE+ (120W) + 2 SFP Plug&Play de bajo coste","Diseño compacto y consumo eficiente"],
    interfaces: ["99x GbE RJ45"],
    powerRequirements: "Adaptador 5V/9V DC",
    poeType: "NONE",
    powerConsumptionWatts: 5,
    managementMode: "Unmanaged",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Stonet ST3310GF Switch 8 Puertos GbE PoE+ (120W) + 2 SFP certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-st3310gf",
      title: "Stonet ST3310GF Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/stonet-st3310gf",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ST3310GF",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "w300r",
    sku: "W300R",
    model: "W300R",
    name: "Stonet W300R Router Wi-Fi 4 300Mbps Dual-Antena Económico",
    brand: "Stonet",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Stonet W300R Router Wi-Fi 4 300Mbps Dual-Antena Económico homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/stonet-w300r",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 18,
    wholesalePriceEur: 11,
    stockStatus: "IN_STOCK",
    specs: ["Stonet W300R Router Wi-Fi 4 300Mbps Dual-Antena Económico Plug&Play de bajo coste","Diseño compacto y consumo eficiente"],
    interfaces: ["18x GbE RJ45"],
    powerRequirements: "Adaptador 5V/9V DC",
    poeType: "NONE",
    powerConsumptionWatts: 5,
    managementMode: "Local",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Stonet W300R Router Wi-Fi 4 300Mbps Dual-Antena Económico certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-w300r",
      title: "Stonet W300R Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/stonet-w300r",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con W300R",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "cyberscope",
    sku: "CYBERSCOPE",
    model: "CYBERSCOPE",
    name: "NetAlly CyberScope Analizador de Ciberseguridad de Red Portátil",
    brand: "NetAlly",
    deviceType: "TESTER",
    category: "testers",
    description: "NetAlly CyberScope Analizador de Ciberseguridad de Red Portátil homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/netally-cyberscope",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 5900,
    wholesalePriceEur: 4500,
    stockStatus: "IN_STOCK",
    specs: ["NetAlly CyberScope Analizador de Ciberseguridad de Red Portátil para auditorías profesionales de telecomunicaciones","Integración Link-Live Cloud"],
    interfaces: ["1x GbE RJ45","Radios Wi-Fi / Bluetooth"],
    powerRequirements: "Batería Li-Ion recargable",
    poeType: "NONE",
    powerConsumptionWatts: 15,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "NetAlly CyberScope Analizador de Ciberseguridad de Red Portátil certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-cyberscope",
      title: "NetAlly CYBERSCOPE Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/netally-cyberscope",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con CYBERSCOPE",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "linksprinter",
    sku: "LINKSPRINTER",
    model: "LINKSPRINTER",
    name: "NetAlly LinkSprinter Comprobador de Cable y PoE de Bolsillo",
    brand: "NetAlly",
    deviceType: "TESTER",
    category: "testers",
    description: "NetAlly LinkSprinter Comprobador de Cable y PoE de Bolsillo homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/netally-linksprinter",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 390,
    wholesalePriceEur: 290,
    stockStatus: "IN_STOCK",
    specs: ["NetAlly LinkSprinter Comprobador de Cable y PoE de Bolsillo para auditorías profesionales de telecomunicaciones","Integración Link-Live Cloud"],
    interfaces: ["1x GbE RJ45","Radios Wi-Fi / Bluetooth"],
    powerRequirements: "Batería Li-Ion recargable",
    poeType: "NONE",
    powerConsumptionWatts: 15,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "NetAlly LinkSprinter Comprobador de Cable y PoE de Bolsillo certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-linksprinter",
      title: "NetAlly LINKSPRINTER Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/netally-linksprinter",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con LINKSPRINTER",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "linkrunner-g2",
    sku: "LINKRUNNER-G2",
    model: "LINKRUNNER-G2",
    name: "NetAlly LinkRunner G2 Probador de Red Android con PoE 60W",
    brand: "NetAlly",
    deviceType: "TESTER",
    category: "testers",
    description: "NetAlly LinkRunner G2 Probador de Red Android con PoE 60W homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/netally-linkrunner-g2",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 2490,
    wholesalePriceEur: 1890,
    stockStatus: "IN_STOCK",
    specs: ["NetAlly LinkRunner G2 Probador de Red Android con PoE 60W para auditorías profesionales de telecomunicaciones","Integración Link-Live Cloud"],
    interfaces: ["1x GbE RJ45","Radios Wi-Fi / Bluetooth"],
    powerRequirements: "Batería Li-Ion recargable",
    poeType: "NONE",
    powerConsumptionWatts: 15,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "NetAlly LinkRunner G2 Probador de Red Android con PoE 60W certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-linkrunner-g2",
      title: "NetAlly LINKRUNNER-G2 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/netally-linkrunner-g2",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con LINKRUNNER-G2",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "testacc",
    sku: "TESTACC",
    model: "TESTACC",
    name: "NetAlly Test Accessory Reflector iPerf Gigabit",
    brand: "NetAlly",
    deviceType: "TESTER",
    category: "testers",
    description: "NetAlly Test Accessory Reflector iPerf Gigabit homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/netally-testacc",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 290,
    wholesalePriceEur: 210,
    stockStatus: "IN_STOCK",
    specs: ["NetAlly Test Accessory Reflector iPerf Gigabit para auditorías profesionales de telecomunicaciones","Integración Link-Live Cloud"],
    interfaces: ["1x GbE RJ45","Radios Wi-Fi / Bluetooth"],
    powerRequirements: "Batería Li-Ion recargable",
    poeType: "NONE",
    powerConsumptionWatts: 15,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "NetAlly Test Accessory Reflector iPerf Gigabit certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-testacc",
      title: "NetAlly TESTACC Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/netally-testacc",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con TESTACC",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "aircheck-g2",
    sku: "AIRCHECK-G2",
    model: "AIRCHECK-G2",
    name: "NetAlly AirCheck G2 Analizador Wi-Fi 5/6 Portátil",
    brand: "NetAlly",
    deviceType: "TESTER",
    category: "testers",
    description: "NetAlly AirCheck G2 Analizador Wi-Fi 5/6 Portátil homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/netally-aircheck-g2",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 2890,
    wholesalePriceEur: 2190,
    stockStatus: "IN_STOCK",
    specs: ["NetAlly AirCheck G2 Analizador Wi-Fi 5/6 Portátil para auditorías profesionales de telecomunicaciones","Integración Link-Live Cloud"],
    interfaces: ["1x GbE RJ45","Radios Wi-Fi / Bluetooth"],
    powerRequirements: "Batería Li-Ion recargable",
    poeType: "NONE",
    powerConsumptionWatts: 15,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "NetAlly AirCheck G2 Analizador Wi-Fi 5/6 Portátil certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-aircheck-g2",
      title: "NetAlly AIRCHECK-G2 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/netally-aircheck-g2",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con AIRCHECK-G2",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ruckus-r750",
    sku: "RUCKUS-R750",
    model: "RUCKUS-R750",
    name: "Ruckus CommScope ZoneFlex R750 Wi-Fi 6 4x4 AP Indoor",
    brand: "Ruckus",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Ruckus CommScope ZoneFlex R750 Wi-Fi 6 4x4 AP Indoor homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ruckus-ruckus-r750",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 890,
    wholesalePriceEur: 680,
    stockStatus: "IN_STOCK",
    specs: ["Ruckus CommScope ZoneFlex R750 Wi-Fi 6 4x4 AP Indoor tecnología BeamFlex+ corporativa","Controlador SmartZone / Unleashed"],
    interfaces: ["1x 2.5 GbE RJ45"],
    powerRequirements: "PoE+ 802.3at / 100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 25,
    managementMode: "Hybrid",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Ruckus CommScope ZoneFlex R750 Wi-Fi 6 4x4 AP Indoor certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ruckus-r750",
      title: "Ruckus RUCKUS-R750 Reference Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/ruckus-ruckus-r750",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con RUCKUS-R750",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "EXTERNAL_UNVERIFIED",
    isEcomshopOwnProduct: false
  },
  {
    id: "ruckus-r550",
    sku: "RUCKUS-R550",
    model: "RUCKUS-R550",
    name: "Ruckus ZoneFlex R550 Wi-Fi 6 2x2 AP Indoor Enterprise",
    brand: "Ruckus",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Ruckus ZoneFlex R550 Wi-Fi 6 2x2 AP Indoor Enterprise homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ruckus-ruckus-r550",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 590,
    wholesalePriceEur: 440,
    stockStatus: "IN_STOCK",
    specs: ["Ruckus ZoneFlex R550 Wi-Fi 6 2x2 AP Indoor Enterprise tecnología BeamFlex+ corporativa","Controlador SmartZone / Unleashed"],
    interfaces: ["24x GbE RJ45"],
    powerRequirements: "PoE+ 802.3at / 100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 25,
    managementMode: "Hybrid",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Ruckus ZoneFlex R550 Wi-Fi 6 2x2 AP Indoor Enterprise certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ruckus-r550",
      title: "Ruckus RUCKUS-R550 Reference Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/ruckus-ruckus-r550",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con RUCKUS-R550",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "EXTERNAL_UNVERIFIED",
    isEcomshopOwnProduct: false
  },
  {
    id: "ruckus-t750",
    sku: "RUCKUS-T750",
    model: "RUCKUS-T750",
    name: "Ruckus ZoneFlex T750 Outdoor Wi-Fi 6 4x4 AP IP67",
    brand: "Ruckus",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Ruckus ZoneFlex T750 Outdoor Wi-Fi 6 4x4 AP IP67 homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ruckus-ruckus-t750",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 1490,
    wholesalePriceEur: 1150,
    stockStatus: "IN_STOCK",
    specs: ["Ruckus ZoneFlex T750 Outdoor Wi-Fi 6 4x4 AP IP67 tecnología BeamFlex+ corporativa","Controlador SmartZone / Unleashed"],
    interfaces: ["24x GbE RJ45"],
    powerRequirements: "PoE+ 802.3at / 100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 25,
    managementMode: "Hybrid",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Ruckus ZoneFlex T750 Outdoor Wi-Fi 6 4x4 AP IP67 certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ruckus-t750",
      title: "Ruckus RUCKUS-T750 Reference Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/ruckus-ruckus-t750",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con RUCKUS-T750",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "EXTERNAL_UNVERIFIED",
    isEcomshopOwnProduct: false
  },
  {
    id: "ruckus-icx7150-24p",
    sku: "RUCKUS-ICX7150-24P",
    model: "RUCKUS-ICX7150-24P",
    name: "Ruckus ICX 7150 Switch 24p GbE PoE+ (370W) 4x 10G SFP+",
    brand: "Ruckus",
    deviceType: "SWITCH",
    category: "switches",
    description: "Ruckus ICX 7150 Switch 24p GbE PoE+ (370W) 4x 10G SFP+ homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ruckus-ruckus-icx7150-24p",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 1290,
    wholesalePriceEur: 980,
    stockStatus: "IN_STOCK",
    specs: ["Ruckus ICX 7150 Switch 24p GbE PoE+ (370W) 4x 10G SFP+ tecnología BeamFlex+ corporativa","Controlador SmartZone / Unleashed"],
    interfaces: ["24x GbE RJ45"],
    powerRequirements: "PoE+ 802.3at / 100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 25,
    managementMode: "Hybrid",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Ruckus ICX 7150 Switch 24p GbE PoE+ (370W) 4x 10G SFP+ certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ruckus-icx7150-24p",
      title: "Ruckus RUCKUS-ICX7150-24P Reference Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/ruckus-ruckus-icx7150-24p",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con RUCKUS-ICX7150-24P",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "EXTERNAL_UNVERIFIED",
    isEcomshopOwnProduct: false
  },
  {
    id: "ruckus-icx7450-48p",
    sku: "RUCKUS-ICX7450-48P",
    model: "RUCKUS-ICX7450-48P",
    name: "Ruckus ICX 7450 Switch 48p GbE PoE+ Modular L3",
    brand: "Ruckus",
    deviceType: "SWITCH",
    category: "switches",
    description: "Ruckus ICX 7450 Switch 48p GbE PoE+ Modular L3 homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ruckus-ruckus-icx7450-48p",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 2890,
    wholesalePriceEur: 2190,
    stockStatus: "IN_STOCK",
    specs: ["Ruckus ICX 7450 Switch 48p GbE PoE+ Modular L3 tecnología BeamFlex+ corporativa","Controlador SmartZone / Unleashed"],
    interfaces: ["24x GbE RJ45"],
    powerRequirements: "PoE+ 802.3at / 100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 25,
    managementMode: "Hybrid",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Ruckus ICX 7450 Switch 48p GbE PoE+ Modular L3 certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ruckus-icx7450-48p",
      title: "Ruckus RUCKUS-ICX7450-48P Reference Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/ruckus-ruckus-icx7450-48p",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con RUCKUS-ICX7450-48P",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "EXTERNAL_UNVERIFIED",
    isEcomshopOwnProduct: false
  },
  {
    id: "ecs4120-28p",
    sku: "ECS4120-28P",
    model: "ECS4120-28P",
    name: "Edgecore ECS4120-28P Switch L2+ 24p GbE PoE+ (390W) 4x 10G SFP+",
    brand: "Edgecore",
    deviceType: "SWITCH",
    category: "switches",
    description: "Edgecore ECS4120-28P Switch L2+ 24p GbE PoE+ (390W) 4x 10G SFP+ homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/edgecore-ecs4120-28p",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 590,
    wholesalePriceEur: 430,
    stockStatus: "IN_STOCK",
    specs: ["Edgecore ECS4120-28P Switch L2+ 24p GbE PoE+ (390W) 4x 10G SFP+ con firmware OpenWiFi / ecCLOUD","Grado de operador de telecomunicaciones"],
    interfaces: ["24x GbE RJ45 PoE+"],
    powerRequirements: "PoE+ 802.3at / 100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Edgecore ECS4120-28P Switch L2+ 24p GbE PoE+ (390W) 4x 10G SFP+ certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ecs4120-28p",
      title: "Edgecore ECS4120-28P Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/edgecore-ecs4120-28p",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ECS4120-28P",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ecs4100-12p",
    sku: "ECS4100-12P",
    model: "ECS4100-12P",
    name: "Edgecore ECS4100-12P Switch L2 8p GbE PoE+ (125W) 2x GbE 2x SFP",
    brand: "Edgecore",
    deviceType: "SWITCH",
    category: "switches",
    description: "Edgecore ECS4100-12P Switch L2 8p GbE PoE+ (125W) 2x GbE 2x SFP homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/edgecore-ecs4100-12p",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 249,
    wholesalePriceEur: 180,
    stockStatus: "IN_STOCK",
    specs: ["Edgecore ECS4100-12P Switch L2 8p GbE PoE+ (125W) 2x GbE 2x SFP con firmware OpenWiFi / ecCLOUD","Grado de operador de telecomunicaciones"],
    interfaces: ["1x 2.5 GbE RJ45"],
    powerRequirements: "PoE+ 802.3at / 100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Edgecore ECS4100-12P Switch L2 8p GbE PoE+ (125W) 2x GbE 2x SFP certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ecs4100-12p",
      title: "Edgecore ECS4100-12P Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/edgecore-ecs4100-12p",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ECS4100-12P",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ecw5410-l",
    sku: "ECW5410-L",
    model: "ECW5410-L",
    name: "Edgecore ECW5410-L Wi-Fi 5 4x4 Enterprise AP Indoor",
    brand: "Edgecore",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Edgecore ECW5410-L Wi-Fi 5 4x4 Enterprise AP Indoor homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/edgecore-ecw5410-l",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 299,
    wholesalePriceEur: 210,
    stockStatus: "IN_STOCK",
    specs: ["Edgecore ECW5410-L Wi-Fi 5 4x4 Enterprise AP Indoor con firmware OpenWiFi / ecCLOUD","Grado de operador de telecomunicaciones"],
    interfaces: ["1x 2.5 GbE RJ45"],
    powerRequirements: "PoE+ 802.3at / 100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Edgecore ECW5410-L Wi-Fi 5 4x4 Enterprise AP Indoor certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ecw5410-l",
      title: "Edgecore ECW5410-L Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/edgecore-ecw5410-l",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ECW5410-L",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "eap101",
    sku: "EAP101",
    model: "EAP101",
    name: "Edgecore EAP101 OpenWiFi Wi-Fi 6 2x2 AP Indoor TIP",
    brand: "Edgecore",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Edgecore EAP101 OpenWiFi Wi-Fi 6 2x2 AP Indoor TIP homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/edgecore-eap101",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 219,
    wholesalePriceEur: 155,
    stockStatus: "IN_STOCK",
    specs: ["Edgecore EAP101 OpenWiFi Wi-Fi 6 2x2 AP Indoor TIP con firmware OpenWiFi / ecCLOUD","Grado de operador de telecomunicaciones"],
    interfaces: ["1x 2.5 GbE RJ45"],
    powerRequirements: "PoE+ 802.3at / 100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Edgecore EAP101 OpenWiFi Wi-Fi 6 2x2 AP Indoor TIP certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-eap101",
      title: "Edgecore EAP101 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/edgecore-eap101",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con EAP101",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "eap102",
    sku: "EAP102",
    model: "EAP102",
    name: "Edgecore EAP102 Wi-Fi 6 4x4 OpenWiFi Enterprise AP",
    brand: "Edgecore",
    deviceType: "ACCESS_POINT",
    category: "wifi",
    description: "Edgecore EAP102 Wi-Fi 6 4x4 OpenWiFi Enterprise AP homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/edgecore-eap102",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 349,
    wholesalePriceEur: 250,
    stockStatus: "IN_STOCK",
    specs: ["Edgecore EAP102 Wi-Fi 6 4x4 OpenWiFi Enterprise AP con firmware OpenWiFi / ecCLOUD","Grado de operador de telecomunicaciones"],
    interfaces: ["1x 2.5 GbE RJ45"],
    powerRequirements: "PoE+ 802.3at / 100-240V AC",
    poeType: "802.3at",
    powerConsumptionWatts: 30,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Edgecore EAP102 Wi-Fi 6 4x4 OpenWiFi Enterprise AP certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-eap102",
      title: "Edgecore EAP102 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/edgecore-eap102",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con EAP102",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "tns-100",
    sku: "TNS-100",
    model: "TNS-100",
    name: "Tachyon TNS-100 Switch Gigabit POE Pasivo 24V/48V 8 Puertos Outdoor",
    brand: "Tachyon",
    deviceType: "SWITCH",
    category: "switches",
    description: "Tachyon TNS-100 Switch Gigabit POE Pasivo 24V/48V 8 Puertos Outdoor homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/tachyon-tns-100",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 189,
    wholesalePriceEur: 135,
    stockStatus: "IN_STOCK",
    specs: ["Tachyon TNS-100 Switch Gigabit POE Pasivo 24V/48V 8 Puertos Outdoor para enlaces de onda milimétrica y WISP","Baja latencia e intemperie IP67"],
    interfaces: ["1x GbE RJ45"],
    powerRequirements: "PoE Pasivo 24V/48V",
    poeType: "DC_PASSIVE",
    powerConsumptionWatts: 18,
    managementMode: "Local",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Tachyon TNS-100 Switch Gigabit POE Pasivo 24V/48V 8 Puertos Outdoor certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-tns-100",
      title: "Tachyon TNS-100 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/tachyon-tns-100",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con TNS-100",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "tnb-500",
    sku: "TNB-500",
    model: "TNB-500",
    name: "Tachyon TNB-500 Bridge Inalámbrico 60GHz 1Gbps Full-Duplex 1km",
    brand: "Tachyon",
    deviceType: "CPE_PTP",
    category: "cpe_ptp",
    description: "Tachyon TNB-500 Bridge Inalámbrico 60GHz 1Gbps Full-Duplex 1km homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/tachyon-tnb-500",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 389,
    wholesalePriceEur: 280,
    stockStatus: "IN_STOCK",
    specs: ["Tachyon TNB-500 Bridge Inalámbrico 60GHz 1Gbps Full-Duplex 1km para enlaces de onda milimétrica y WISP","Baja latencia e intemperie IP67"],
    interfaces: ["1x GbE RJ45"],
    powerRequirements: "PoE Pasivo 24V/48V",
    poeType: "DC_PASSIVE",
    powerConsumptionWatts: 18,
    managementMode: "Local",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Tachyon TNB-500 Bridge Inalámbrico 60GHz 1Gbps Full-Duplex 1km certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-tnb-500",
      title: "Tachyon TNB-500 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/tachyon-tnb-500",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con TNB-500",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "tnb-600",
    sku: "TNB-600",
    model: "TNB-600",
    name: "Tachyon TNB-600 Enlace Troncal 60GHz 2.5Gbps Millimeter Wave",
    brand: "Tachyon",
    deviceType: "CPE_PTP",
    category: "cpe_ptp",
    description: "Tachyon TNB-600 Enlace Troncal 60GHz 2.5Gbps Millimeter Wave homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/tachyon-tnb-600",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 590,
    wholesalePriceEur: 430,
    stockStatus: "IN_STOCK",
    specs: ["Tachyon TNB-600 Enlace Troncal 60GHz 2.5Gbps Millimeter Wave para enlaces de onda milimétrica y WISP","Baja latencia e intemperie IP67"],
    interfaces: ["1x 2.5 GbE RJ45"],
    powerRequirements: "PoE Pasivo 24V/48V",
    poeType: "DC_PASSIVE",
    powerConsumptionWatts: 18,
    managementMode: "Local",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Tachyon TNB-600 Enlace Troncal 60GHz 2.5Gbps Millimeter Wave certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-tnb-600",
      title: "Tachyon TNB-600 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/tachyon-tnb-600",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con TNB-600",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "tpa-4824",
    sku: "TPA-4824",
    model: "TPA-4824",
    name: "Tachyon TPA-4824 Convertidor PoE 48V a 24V Gigabit Outdoor IP67",
    brand: "Tachyon",
    deviceType: "ACCESSORY",
    category: "poe_injectors",
    description: "Tachyon TPA-4824 Convertidor PoE 48V a 24V Gigabit Outdoor IP67 homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/tachyon-tpa-4824",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 35,
    wholesalePriceEur: 24,
    stockStatus: "IN_STOCK",
    specs: ["Tachyon TPA-4824 Convertidor PoE 48V a 24V Gigabit Outdoor IP67 para enlaces de onda milimétrica y WISP","Baja latencia e intemperie IP67"],
    interfaces: ["1x GbE RJ45"],
    powerRequirements: "PoE Pasivo 24V/48V",
    poeType: "DC_PASSIVE",
    powerConsumptionWatts: 18,
    managementMode: "Local",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Tachyon TPA-4824 Convertidor PoE 48V a 24V Gigabit Outdoor IP67 certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-tpa-4824",
      title: "Tachyon TPA-4824 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/tachyon-tpa-4824",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con TPA-4824",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "ib9369",
    sku: "IB9369",
    model: "IB9369",
    name: "Vivotek IB9369 Cámara IP Bullet 2MP IR 30m Exterior IP66 PoE",
    brand: "Vivotek",
    deviceType: "CCTV_CAMERA",
    category: "cctv",
    description: "Vivotek IB9369 Cámara IP Bullet 2MP IR 30m Exterior IP66 PoE homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/vivotek-ib9369",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 159,
    wholesalePriceEur: 110,
    stockStatus: "IN_STOCK",
    specs: ["Vivotek IB9369 Cámara IP Bullet 2MP IR 30m Exterior IP66 PoE visión nocturna Smart IR y compresión H.265","Certificación antivandálica y PoE"],
    interfaces: ["1x GbE RJ45 PoE (802.3af/at)"],
    powerRequirements: "PoE 802.3af (12W)",
    poeType: "802.3af",
    powerConsumptionWatts: 12,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Vivotek IB9369 Cámara IP Bullet 2MP IR 30m Exterior IP66 PoE certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-ib9369",
      title: "Vivotek IB9369 Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/vivotek-ib9369",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con IB9369",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "fd9389-ehv",
    sku: "FD9389-EHV",
    model: "FD9389-EHV",
    name: "Vivotek FD9389-EHV Cámara Domo IP 5MP Antivandálica IK10 IP66",
    brand: "Vivotek",
    deviceType: "CCTV_CAMERA",
    category: "cctv",
    description: "Vivotek FD9389-EHV Cámara Domo IP 5MP Antivandálica IK10 IP66 homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/vivotek-fd9389-ehv",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 249,
    wholesalePriceEur: 175,
    stockStatus: "IN_STOCK",
    specs: ["Vivotek FD9389-EHV Cámara Domo IP 5MP Antivandálica IK10 IP66 visión nocturna Smart IR y compresión H.265","Certificación antivandálica y PoE"],
    interfaces: ["1x GbE RJ45 PoE (802.3af/at)"],
    powerRequirements: "PoE 802.3af (12W)",
    poeType: "802.3af",
    powerConsumptionWatts: 12,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Vivotek FD9389-EHV Cámara Domo IP 5MP Antivandálica IK10 IP66 certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-fd9389-ehv",
      title: "Vivotek FD9389-EHV Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/vivotek-fd9389-ehv",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con FD9389-EHV",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "sd9368-ehl",
    sku: "SD9368-EHL",
    model: "SD9368-EHL",
    name: "Vivotek SD9368-EHL Cámara Speed Dome PTZ 2MP Zoom 30x PoE++",
    brand: "Vivotek",
    deviceType: "CCTV_CAMERA",
    category: "cctv",
    description: "Vivotek SD9368-EHL Cámara Speed Dome PTZ 2MP Zoom 30x PoE++ homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/vivotek-sd9368-ehl",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 890,
    wholesalePriceEur: 650,
    stockStatus: "IN_STOCK",
    specs: ["Vivotek SD9368-EHL Cámara Speed Dome PTZ 2MP Zoom 30x PoE++ visión nocturna Smart IR y compresión H.265","Certificación antivandálica y PoE"],
    interfaces: ["1x GbE RJ45 PoE (802.3af/at)"],
    powerRequirements: "PoE++ 802.3bt (45W)",
    poeType: "802.3bt",
    powerConsumptionWatts: 45,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Vivotek SD9368-EHL Cámara Speed Dome PTZ 2MP Zoom 30x PoE++ certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-sd9368-ehl",
      title: "Vivotek SD9368-EHL Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/vivotek-sd9368-ehl",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con SD9368-EHL",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "nd9323p",
    sku: "ND9323P",
    model: "ND9323P",
    name: "Vivotek ND9323P NVR 8 Canales 4K PoE Integrado (8 Puertos PoE)",
    brand: "Vivotek",
    deviceType: "GATEWAY",
    category: "cctv",
    description: "Vivotek ND9323P NVR 8 Canales 4K PoE Integrado (8 Puertos PoE) homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/vivotek-nd9323p",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 389,
    wholesalePriceEur: 275,
    stockStatus: "IN_STOCK",
    specs: ["Vivotek ND9323P NVR 8 Canales 4K PoE Integrado (8 Puertos PoE) visión nocturna Smart IR y compresión H.265","Certificación antivandálica y PoE"],
    interfaces: ["1x GbE RJ45 PoE (802.3af/at)"],
    powerRequirements: "PoE 802.3af (12W)",
    poeType: "802.3af",
    powerConsumptionWatts: 12,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Vivotek ND9323P NVR 8 Canales 4K PoE Integrado (8 Puertos PoE) certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-nd9323p",
      title: "Vivotek ND9323P Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/vivotek-nd9323p",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con ND9323P",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "fe9382-ehv",
    sku: "FE9382-EHV",
    model: "FE9382-EHV",
    name: "Vivotek FE9382-EHV Cámara Fisheye 360° 5MP Exterior IP66",
    brand: "Vivotek",
    deviceType: "CCTV_CAMERA",
    category: "cctv",
    description: "Vivotek FE9382-EHV Cámara Fisheye 360° 5MP Exterior IP66 homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/vivotek-fe9382-ehv",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 399,
    wholesalePriceEur: 285,
    stockStatus: "IN_STOCK",
    specs: ["Vivotek FE9382-EHV Cámara Fisheye 360° 5MP Exterior IP66 visión nocturna Smart IR y compresión H.265","Certificación antivandálica y PoE"],
    interfaces: ["1x GbE RJ45 PoE (802.3af/at)"],
    powerRequirements: "PoE 802.3af (12W)",
    poeType: "802.3af",
    powerConsumptionWatts: 12,
    managementMode: "Cloud",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "Vivotek FE9382-EHV Cámara Fisheye 360° 5MP Exterior IP66 certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-fe9382-ehv",
      title: "Vivotek FE9382-EHV Datasheet",
      type: "datasheet",
      url: "https://www.ecomshop.es/vivotek-fe9382-ehv",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con FE9382-EHV",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "sfp-1g-sx-kit",
    sku: "SFP-1G-SX-KIT",
    model: "SFP-1G-SX-KIT",
    name: "EcomSpain Kit 2x Transceptores 1G SFP Multimodo LC 850nm 550m",
    brand: "EcomSpain",
    deviceType: "FIBER_OPTIC",
    category: "transceivers",
    description: "EcomSpain Kit 2x Transceptores 1G SFP Multimodo LC 850nm 550m homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ecomspain-sfp-1g-sx-kit",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 49,
    wholesalePriceEur: 29,
    stockStatus: "IN_STOCK",
    specs: ["EcomSpain Kit 2x Transceptores 1G SFP Multimodo LC 850nm 550m testado para interoperabilidad 100% en switches EnGenius y Cisco","Garantía oficial EcomSpain"],
    interfaces: ["2x Conectores LC Duplex"],
    powerRequirements: "Alimentación por puerto SFP 3.3V",
    poeType: "NONE",
    powerConsumptionWatts: 1.5,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EcomSpain Kit 2x Transceptores 1G SFP Multimodo LC 850nm 550m certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-sfp-1g-sx-kit",
      title: "Ficha de Producto EcomSpain SFP-1G-SX-KIT",
      type: "datasheet",
      url: "https://www.ecomshop.es/ecomspain-sfp-1g-sx-kit",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con SFP-1G-SX-KIT",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "sfp-10g-lr-kit",
    sku: "SFP-10G-LR-KIT",
    model: "SFP-10G-LR-KIT",
    name: "EcomSpain Kit 2x Transceptores 10G SFP+ Monomodo LC 1310nm 10km",
    brand: "EcomSpain",
    deviceType: "FIBER_OPTIC",
    category: "transceivers",
    description: "EcomSpain Kit 2x Transceptores 10G SFP+ Monomodo LC 1310nm 10km homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ecomspain-sfp-10g-lr-kit",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 149,
    wholesalePriceEur: 95,
    stockStatus: "IN_STOCK",
    specs: ["EcomSpain Kit 2x Transceptores 10G SFP+ Monomodo LC 1310nm 10km testado para interoperabilidad 100% en switches EnGenius y Cisco","Garantía oficial EcomSpain"],
    interfaces: ["2x Conectores LC Duplex"],
    powerRequirements: "Alimentación por puerto SFP 3.3V",
    poeType: "NONE",
    powerConsumptionWatts: 1.5,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EcomSpain Kit 2x Transceptores 10G SFP+ Monomodo LC 1310nm 10km certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-sfp-10g-lr-kit",
      title: "Ficha de Producto EcomSpain SFP-10G-LR-KIT",
      type: "datasheet",
      url: "https://www.ecomshop.es/ecomspain-sfp-10g-lr-kit",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con SFP-10G-LR-KIT",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "dac-10g-1m",
    sku: "DAC-10G-1M",
    model: "DAC-10G-1M",
    name: "EcomSpain Cable Pasivo DAC 10G SFP+ a SFP+ 1 Metro",
    brand: "EcomSpain",
    deviceType: "FIBER_OPTIC",
    category: "transceivers",
    description: "EcomSpain Cable Pasivo DAC 10G SFP+ a SFP+ 1 Metro homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ecomspain-dac-10g-1m",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 29,
    wholesalePriceEur: 18,
    stockStatus: "IN_STOCK",
    specs: ["EcomSpain Cable Pasivo DAC 10G SFP+ a SFP+ 1 Metro testado para interoperabilidad 100% en switches EnGenius y Cisco","Garantía oficial EcomSpain"],
    interfaces: ["2x Conectores LC Duplex"],
    powerRequirements: "Alimentación por puerto SFP 3.3V",
    poeType: "NONE",
    powerConsumptionWatts: 1.5,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EcomSpain Cable Pasivo DAC 10G SFP+ a SFP+ 1 Metro certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-dac-10g-1m",
      title: "Ficha de Producto EcomSpain DAC-10G-1M",
      type: "datasheet",
      url: "https://www.ecomshop.es/ecomspain-dac-10g-1m",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con DAC-10G-1M",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "dac-10g-3m",
    sku: "DAC-10G-3M",
    model: "DAC-10G-3M",
    name: "EcomSpain Cable Pasivo DAC 10G SFP+ a SFP+ 3 Metros",
    brand: "EcomSpain",
    deviceType: "FIBER_OPTIC",
    category: "transceivers",
    description: "EcomSpain Cable Pasivo DAC 10G SFP+ a SFP+ 3 Metros homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ecomspain-dac-10g-3m",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 39,
    wholesalePriceEur: 24,
    stockStatus: "IN_STOCK",
    specs: ["EcomSpain Cable Pasivo DAC 10G SFP+ a SFP+ 3 Metros testado para interoperabilidad 100% en switches EnGenius y Cisco","Garantía oficial EcomSpain"],
    interfaces: ["2x Conectores LC Duplex"],
    powerRequirements: "Alimentación por puerto SFP 3.3V",
    poeType: "NONE",
    powerConsumptionWatts: 1.5,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EcomSpain Cable Pasivo DAC 10G SFP+ a SFP+ 3 Metros certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-dac-10g-3m",
      title: "Ficha de Producto EcomSpain DAC-10G-3M",
      type: "datasheet",
      url: "https://www.ecomshop.es/ecomspain-dac-10g-3m",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con DAC-10G-3M",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "sfp28-25g-sr",
    sku: "SFP28-25G-SR",
    model: "SFP28-25G-SR",
    name: "EcomSpain Transceptor 25G SFP28 Multimodo LC 850nm 100m",
    brand: "EcomSpain",
    deviceType: "FIBER_OPTIC",
    category: "transceivers",
    description: "EcomSpain Transceptor 25G SFP28 Multimodo LC 850nm 100m homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ecomspain-sfp28-25g-sr",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 129,
    wholesalePriceEur: 85,
    stockStatus: "IN_STOCK",
    specs: ["EcomSpain Transceptor 25G SFP28 Multimodo LC 850nm 100m testado para interoperabilidad 100% en switches EnGenius y Cisco","Garantía oficial EcomSpain"],
    interfaces: ["2x Conectores LC Duplex"],
    powerRequirements: "Alimentación por puerto SFP 3.3V",
    poeType: "NONE",
    powerConsumptionWatts: 1.5,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EcomSpain Transceptor 25G SFP28 Multimodo LC 850nm 100m certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-sfp28-25g-sr",
      title: "Ficha de Producto EcomSpain SFP28-25G-SR",
      type: "datasheet",
      url: "https://www.ecomshop.es/ecomspain-sfp28-25g-sr",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con SFP28-25G-SR",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "qsfp28-100g-sr4",
    sku: "QSFP28-100G-SR4",
    model: "QSFP28-100G-SR4",
    name: "EcomSpain Transceptor 100G QSFP28 MPO Multimodo 100m",
    brand: "EcomSpain",
    deviceType: "FIBER_OPTIC",
    category: "transceivers",
    description: "EcomSpain Transceptor 100G QSFP28 MPO Multimodo 100m homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ecomspain-qsfp28-100g-sr4",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 389,
    wholesalePriceEur: 270,
    stockStatus: "IN_STOCK",
    specs: ["EcomSpain Transceptor 100G QSFP28 MPO Multimodo 100m testado para interoperabilidad 100% en switches EnGenius y Cisco","Garantía oficial EcomSpain"],
    interfaces: ["2x Conectores LC Duplex"],
    powerRequirements: "Alimentación por puerto SFP 3.3V",
    poeType: "NONE",
    powerConsumptionWatts: 1.5,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EcomSpain Transceptor 100G QSFP28 MPO Multimodo 100m certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-qsfp28-100g-sr4",
      title: "Ficha de Producto EcomSpain QSFP28-100G-SR4",
      type: "datasheet",
      url: "https://www.ecomshop.es/ecomspain-qsfp28-100g-sr4",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con QSFP28-100G-SR4",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "patch-om4-2m",
    sku: "PATCH-OM4-2M",
    model: "PATCH-OM4-2M",
    name: "EcomSpain Latiguillo Fibra Óptica Duplex LC-LC OM4 2 Metros",
    brand: "EcomSpain",
    deviceType: "FIBER_OPTIC",
    category: "transceivers",
    description: "EcomSpain Latiguillo Fibra Óptica Duplex LC-LC OM4 2 Metros homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ecomspain-patch-om4-2m",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 15,
    wholesalePriceEur: 8,
    stockStatus: "IN_STOCK",
    specs: ["EcomSpain Latiguillo Fibra Óptica Duplex LC-LC OM4 2 Metros testado para interoperabilidad 100% en switches EnGenius y Cisco","Garantía oficial EcomSpain"],
    interfaces: ["LC-LC"],
    powerRequirements: "Alimentación por puerto SFP 3.3V",
    poeType: "NONE",
    powerConsumptionWatts: 1.5,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EcomSpain Latiguillo Fibra Óptica Duplex LC-LC OM4 2 Metros certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-patch-om4-2m",
      title: "Ficha de Producto EcomSpain PATCH-OM4-2M",
      type: "datasheet",
      url: "https://www.ecomshop.es/ecomspain-patch-om4-2m",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con PATCH-OM4-2M",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  },
  {
    id: "rack-mount-kit",
    sku: "RACK-MOUNT-KIT",
    model: "RACK-MOUNT-KIT",
    name: "EcomSpain Kit de Montaje en Rack 19\" Universal 1U para Switches",
    brand: "EcomSpain",
    deviceType: "ACCESSORY",
    category: "accessories",
    description: "EcomSpain Kit de Montaje en Rack 19\" Universal 1U para Switches homologado para soluciones profesionales de networking y telecomunicaciones.",
    url: "https://www.ecomshop.es/ecomspain-rack-mount-kit",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    priceEur: 25,
    wholesalePriceEur: 12,
    stockStatus: "IN_STOCK",
    specs: ["EcomSpain Kit de Montaje en Rack 19\" Universal 1U para Switches testado para interoperabilidad 100% en switches EnGenius y Cisco","Garantía oficial EcomSpain"],
    interfaces: ["2x Conectores LC Duplex"],
    powerRequirements: "Alimentación por puerto SFP 3.3V",
    poeType: "NONE",
    powerConsumptionWatts: 1.5,
    managementMode: "Standalone",
    standards: ["IEEE 802.3", "RoHS", "CE Certified"],
    keyAdvantages: [
      "EcomSpain Kit de Montaje en Rack 19\" Universal 1U para Switches certificado por EcomSpain para despliegues exigentes",
      "Interoperabilidad probada y soporte de sustitución avanzada en 24h"
    ],
    antiHallucinationNotes: [
      "Verificar requisitos de alimentación y compatibilidad física antes de la compra."
    ],
    recommendedBundle: {
      sku: "SFP-10G-SR-KIT",
      name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
      relationshipType: "ACCESSORY",
      rationale: "Accesorios e interconexión recomendados para este equipo."
    },
    notebookSource: {
      sourceId: "src-ext-rack-mount-kit",
      title: "Ficha de Producto EcomSpain RACK-MOUNT-KIT",
      type: "datasheet",
      url: "https://www.ecomshop.es/ecomspain-rack-mount-kit",
      rationale: "Documentación oficial del producto en el catálogo EcomShop."
    },
    additionalSourceIds: ["src-18", "src-20"],
    actionTitle: "Despliegue y Solución B2B con RACK-MOUNT-KIT",
    targetSegment: "Empresas, Instaladores IT y Telecomunicaciones",
    defaultAngle: "ROI",
    commercialAngles: {
      executiveRoi: "Excelente retorno de inversión con hardware profesional homologado.",
      engineeringPerformance: "Rendimiento verificado a velocidad de línea sin estrangulamientos.",
      operationsDeployment: "Entrega rápida y soporte técnico preventa en España."
    },
    sectorAffinity: { ENTERPRISE_OFFICE: 25, LOGISTICS_INDUSTRY: 20 },
    businessGoalAffinity: {
      ALL_OPPORTUNITIES: 25,
      WIFI7_MULTIGIG_EXPANSION: 20,
      HOSPITALITY_SOLUTIONS: 15,
      SWITCHING_POE_BACKBONE: 20,
      STOCK_CLEARANCE_PROMO: 10
    },
    lifecycleStatus: "HOMOLOGATED",
    isEcomshopOwnProduct: true
  }
];

export function findCatalogProduct(query: string): CatalogProduct | undefined {
  if (!query) return undefined;
  const clean = query.trim().toUpperCase();
  // 1. Coincidencia exacta primero (prioridad máxima para evitar colisiones entre ECS5512F y ECS5512FP)
  const exact = ECOMSHOP_FULL_CATALOG.find(p =>
    p.sku.toUpperCase() === clean ||
    p.model.toUpperCase() === clean ||
    p.id.toUpperCase() === clean
  );
  if (exact) return exact;

  // 2. Coincidencia parcial si no hay coincidencia exacta
  return ECOMSHOP_FULL_CATALOG.find(p =>
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

/**
 * Devuelve únicamente los dispositivos propios / homologados de EcomShop
 */
export function getEcomshopOnlyDevices(): CatalogProduct[] {
  return ECOMSHOP_FULL_CATALOG.filter(p => p.isEcomshopOwnProduct !== false);
}

/**
 * Devuelve productos con estado de homologación canónica
 */
export function getHomologatedProducts(): CatalogProduct[] {
  return ECOMSHOP_FULL_CATALOG.filter(p => p.lifecycleStatus === 'HOMOLOGATED' || p.lifecycleStatus === undefined);
}
