export interface KnowledgeTopic {
  id: string;
  category: "wifi" | "switches" | "fibra" | "engenius";
  title: string;
  targetAudience: string;
  keyPoints: string[];
  suggestedProducts: { name: string; url: string; highlight: string }[];
}

export const ECOM_BRAND = {
  name: "EcomShop / EcomSpain",
  storeUrl: "https://www.ecomshop.es",
  blogUrl: "https://ecomspain.com/blog",
  description: "Mayorista y distribuidor especializado en soluciones profesionales de conectividad B2B, networking empresarial, WiFi de alta densidad, switches gestionables y fibra óptica.",
  usp: [
    "Soporte técnico y preventa de ingeniería especializado para integradores e instaladores IT",
    "Stock permanente y envíos rápidos en 24/48h",
    "Partner oficial y experto en EnGenius Networks (Fit, Cloud y On-Premises)",
    "Precios profesionales con condiciones especiales para empresas y distribuidores"
  ]
};

export const PRESET_TOPICS: KnowledgeTopic[] = [
  {
    id: "engenius-wifi7-cloud",
    category: "engenius",
    title: "Migración a WiFi 7 para Pymes y Corporativo con EnGenius Cloud",
    targetAudience: "Instaladores de telecomunicaciones, integradores IT y responsables de sistemas",
    keyPoints: [
      "Canales ultraanchos de 320 MHz y modulación 4096-QAM para entornos de alta densidad",
      "Tecnología Multi-Link Operation (MLO) para reducir la latencia crítica",
      "Gestión centralizada desde EnGenius Cloud sin costes de licencias ocultas",
      "Puntos de acceso EnGenius ECW536 / ECW526 y switches multi-gigabit PoE++"
    ],
    suggestedProducts: [
      { name: "EnGenius Cloud WiFi 7 APs", url: "https://www.ecomshop.es/engenius-cloud", highlight: "Gestión cloud nativa con visualización de topología y análisis de interferencias" },
      { name: "Switches PoE++ Multi-Gigabit", url: "https://www.ecomshop.es/switches-poe", highlight: "Puertos 2.5G/10G para exprimir el rendimiento de WiFi 7" }
    ]
  },
  {
    id: "switches-l2-l3-poe",
    category: "switches",
    title: "Cómo dimensionar Switches L2+/L3 y PoE para Videovigilancia y WiFi",
    targetAudience: "Empresas de seguridad electrónica e instaladores de redes de voz y datos",
    keyPoints: [
      "Cálculo real de PoE Budget (802.3af/at/bt) evitando caídas por sobreconsumo",
      "Segmentación de tráfico mediante VLANs, QoS y Spanning Tree (RSTP/MSTP)",
      "Switches gestionables para continuidad de negocio con enlaces uplink SFP/SFP+ de 10 Gbps",
      "Monitoreo remoto de puertos y auto-reinicio de cámaras o APs colgados"
    ],
    suggestedProducts: [
      { name: "Switches Gestionables EnGenius Cloud", url: "https://www.ecomshop.es/switches-engenius", highlight: "Gestión remota de puertos y PoE con control de consumo en tiempo real" }
    ]
  },
  {
    id: "fibra-optica-gpon-lan",
    category: "fibra",
    title: "Despliegues de Fibra Óptica y Backbones de Alta Capacidad en Edificios y Hoteles",
    targetAudience: "Integradores de infraestructuras de telecomunicaciones y operadores locales",
    keyPoints: [
      "Comparativa entre cableado de cobre Cat6A y fibra monomodo/multimodo (OM3/OM4/OS2)",
      "Topologías de distribución vertical y enlaces entre armarios rack",
      "Transceptores ópticos SFP+ / QSFP y latiguillos preconectorizados para minimizar tiempos de fusión",
      "Garantía de futuro para demandas de ancho de banda en proyectos hoteleros y oficinas"
    ],
    suggestedProducts: [
      { name: "Módulos y Transceptores SFP/SFP+", url: "https://www.ecomshop.es/transceptores-sfp", highlight: "Compatibilidad garantizada y baja disipación térmica" }
    ]
  },
  {
    id: "engenius-fit-controller",
    category: "wifi",
    title: "EnGenius Fit vs EnGenius Cloud: ¿Qué arquitectura de gestión elegir para tus clientes?",
    targetAudience: "Proveedores de servicios gestionados (MSPs) y consultores IT",
    keyPoints: [
      "EnGenius Fit: solución híbrida con FitController on-premise sin cuotas recurrentes",
      "EnGenius Cloud: gestión multi-tenant desde cualquier navegador o app móvil para cientos de sedes",
      "Instalación Plug & Play y aprovisionamiento rápido con escaneo de código QR",
      "Optimización de costes de despliegue y mantenimiento para el instalador"
    ],
    suggestedProducts: [
      { name: "Gama EnGenius Fit", url: "https://www.ecomshop.es/engenius-fit", highlight: "Control total local o cloud híbrido para proyectos de coste ajustado" }
    ]
  }
];

export interface StarProduct {
  id: string;
  name: string;
  model: string;
  category: "wifi" | "switches" | "fibra" | "engenius";
  description: string;
  url: string;
  specs: string[];
}

export const STAR_PRODUCTS: StarProduct[] = [
  {
    id: "ecw536",
    name: "EnGenius ECW536 Cloud WiFi 7 AP",
    model: "ECW536",
    category: "engenius",
    description: "Punto de acceso Tri-Band WiFi 7 gestionado por Cloud, 18.7 Gbps agregados y puerto 10GbE PoE++.",
    url: "https://www.ecomshop.es/engenius-ecw536",
    specs: ["Tri-Band WiFi 7 (2.4/5/6 GHz)", "Puerto 10 GbE PoE++", "Gestión Cloud sin licencias", "Análisis de interferencias por IA"]
  },
  {
    id: "ecs1528fp",
    name: "Switch EnGenius ECS1528FP Cloud PoE+",
    model: "ECS1528FP",
    category: "switches",
    description: "Switch L2+ gestionado en Cloud con 24 puertos Gigabit PoE+ (410W) y 4 uplinks 10G SFP+.",
    url: "https://www.ecomshop.es/engenius-ecs1528fp",
    specs: ["24x GbE PoE+ (410W budget)", "4x 10G SFP+ uplinks", "Reinicio remoto PoE", "Topología visual en Cloud"]
  },
  {
    id: "fitcontroller",
    name: "EnGenius FitController & APs Fit",
    model: "FitController-100",
    category: "wifi",
    description: "Controlador físico on-premise para hasta 100 APs/Switches sin costes de suscripción ni cuotas recurrentes.",
    url: "https://www.ecomshop.es/engenius-fit",
    specs: ["Gestión local Plug & Play", "0€ cuotas de licencia", "Portal cautivo para invitados", "Monitoreo multi-sede"]
  },
  {
    id: "sfp-kit-10g",
    name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
    model: "SFP-10G-SR-KIT",
    category: "fibra",
    description: "Módulos ópticos SFP+ 10G multimodo 850nm con latiguillos OM4 preconectorizados de baja atenuación.",
    url: "https://www.ecomshop.es/transceptores-sfp-10g",
    specs: ["10 Gbps garantizados", "Conector LC dúplex", "Compatible EnGenius/Cisco/MikroTik", "Latiguillos OM4 testados"]
  }
];

export interface CampaignIdea {
  id: string;
  title: string;
  angle: string;
  targetObjective: string;
  recommendedProducts: string[];
}

export const CAMPAIGN_IDEAS: CampaignIdea[] = [
  {
    id: "promo-wifi7-upgrade",
    title: "Renovación a WiFi 7: Despliegues de Alta Densidad",
    angle: "Muestra a tus clientes cómo triplicar el ancho de banda y reducir caídas de red en oficinas y hoteles.",
    targetObjective: "Pedir unidad demo para test en laboratorio",
    recommendedProducts: ["ecw536", "ecs1528fp"]
  },
  {
    id: "promo-switches-poe-cctv",
    title: "Pack Switches PoE+ para Instaladores de Videovigilancia y VoIP",
    angle: "Evita caídas de cámaras con auto-reinicio PoE y enlace uplink de 10Gbps directo al NVR.",
    targetObjective: "Solicitar tarifa de instalador / Descuento por volumen",
    recommendedProducts: ["ecs1528fp"]
  },
  {
    id: "promo-fit-zero-license",
    title: "Alternativa sin licencias anuales: EnGenius Fit",
    angle: "Ofrece a clientes con presupuesto ajustado una red gestionable y segura sin cuotas recurrentes.",
    targetObjective: "Descargar ficha técnica / Caso de éxito",
    recommendedProducts: ["fitcontroller"]
  },
  {
    id: "promo-fibra-backbone",
    title: "Actualiza tu Backbone a 10G con Kits de Fibra y SFP+",
    angle: "Asegura la troncal entre armarios rack antes de saturar los enlaces en despliegues corporativos.",
    targetObjective: "Comprar con entrega garantizada en 24/48h",
    recommendedProducts: ["sfp-kit-10g", "ecs1528fp"]
  }
];

export const B2B_CTA_OPTIONS = [
  {
    id: "quote-installer",
    label: "Solicitar tarifa de instalador / Descuento por volumen",
    defaultButtonText: "Solicitar Condiciones Especiales B2B",
    defaultUrl: "https://ecomspain.com/contacto?asunto=tarifas-instalador"
  },
  {
    id: "demo-unit",
    label: "Pedir unidad demo para test en laboratorio",
    defaultButtonText: "Solicitar Unidad Demo Gratuita",
    defaultUrl: "https://ecomspain.com/demo-lab"
  },
  {
    id: "download-datasheet",
    label: "Descargar ficha técnica / Caso de éxito",
    defaultButtonText: "Descargar Documentación Técnica",
    defaultUrl: "https://ecomspain.com/recursos-tecnicos"
  },
  {
    id: "buy-store-24h",
    label: "Comprar con entrega garantizada en 24/48h",
    defaultButtonText: "Comprar con Entrega Inmediata",
    defaultUrl: "https://www.ecomshop.es"
  }
];
