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
    "Partner oficial y experto en EnGenius Networks (Cloud y Standalone/MESH)",
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
    id: "engenius-cloud-architecture",
    category: "wifi",
    title: "Arquitectura EnGenius Cloud Nativa: Gestión Multi-Tenant Centralizada Sin Licencias",
    targetAudience: "Proveedores de servicios gestionados (MSPs), integradores IT y directores TIC",
    keyPoints: [
      "EnGenius Cloud: gestión multi-tenant desde cualquier navegador o app móvil para cientos de sedes con aprovisionamiento QR",
      "Control de enlace simultáneo (MLO) y punzonado de preámbulo para eliminar interferencias de canal",
      "Conmutación de acceso y agregación con uplinks de 10 Gbps SFP+ para evitar cuellos de botella de 1 GbE",
      "Cero costes recurrentes de licencia anual o por dispositivo, garantizando máxima rentabilidad de proyecto"
    ],
    suggestedProducts: [
      { name: "EnGenius Cloud Networking", url: "https://www.ecomshop.es/engenius-cloud", highlight: "Gestión centralizada oficial Cloud y Standalone/MESH sin cuotas recurrentes" }
    ]
  }
];

export { ECOMSHOP_CATALOG, findCatalogProduct, getAllCatalogProducts, type CatalogProduct } from "./catalog";

export interface StarProduct {
  id: string;
  name: string;
  model: string;
  category: "wifi" | "switches" | "fibra" | "engenius" | "gateways" | "accesorios";
  description: string;
  url: string;
  imageUrl: string;
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
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/ECW536-2.jpg?v=1745267297&width=1445",
    specs: ["Tri-Band WiFi 7 (2.4/5/6 GHz)", "Puerto 10 GbE PoE++", "Gestión Cloud sin licencias", "Análisis de interferencias por IA"]
  },
  {
    id: "ecw510",
    name: "EnGenius Cloud WiFi 7 ECW510 AP Dual-Band",
    model: "ECW510",
    category: "engenius",
    description: "Punto de acceso Wi-Fi 7 Dual-Band ultracompacto con puerto 2.5GbE PoE+, modulación 4096-QAM y aprovisionamiento QR 2min.",
    url: "https://www.ecomshop.es/engenius-ecw510",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_Access_Point_InD_ECW526_Front_View_907d4351-407d-4679-8491-99e6307ad5d1.jpg",
    specs: ["Dual-Band Wi-Fi 7 (2.4/5 GHz)", "Puerto 2.5 GbE PoE+", "Aprovisionamiento QR 2min", "Gestión EnGenius Cloud sin licencias"]
  },
  {
    id: "ecw526",
    name: "EnGenius ECW526 WiFi 7 AP Interior",
    model: "ECW526",
    category: "engenius",
    description: "Punto de acceso WiFi 7 compacto Tri-Band 2x2x2 para despachos, hoteles y salas de reuniones.",
    url: "https://www.ecomshop.es/engenius-ecw526",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_Access_Point_InD_ECW526_Front_View_907d4351-407d-4679-8491-99e6307ad5d1.jpg",
    specs: ["Tri-Band WiFi 7 2x2x2", "Puerto 2.5GbE PoE+", "Diseño ultra discreto para techo", "Gestión EnGenius Cloud"]
  },
  {
    id: "ecw546",
    name: "EnGenius ECW546 Outdoor Wi-Fi 7 AP IP67",
    model: "ECW546",
    category: "engenius",
    description: "Punto de acceso Tri-Band Wi-Fi 7 de exterior reforzado con chasis IP67 y sobretensiones 6kV.",
    url: "https://www.ecomshop.es/engenius-ecw546-outdoor",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/ECW536-2.jpg?v=1745267297&width=1445",
    specs: ["Tri-Band Wi-Fi 7 Exterior", "Protección estanca IP67", "Sobretensiones 6kV", "Puerto 10 GbE PoE++"]
  },
  {
    id: "ecs2512fp",
    name: "Switch EnGenius ECS2512FP Multi-Gigabit PoE++",
    model: "ECS2512FP",
    category: "switches",
    description: "Switch L2+ con 8 puertos 2.5GbE PoE++ (60W por puerto, 240W budget) y 4 uplinks 10G SFP+.",
    url: "https://www.ecomshop.es/engenius-ecs2512fp",
    imageUrl: "https://www.engeniustech.com/wp-content/uploads/2020/02/ecs2512fp-front-opt.jpg",
    specs: ["8x 2.5GbE PoE++ (802.3bt 60W)", "4x 10G SFP+ uplinks", "Reinicio remoto de puertos", "Diseñado para WiFi 7"]
  },
  {
    id: "ecs1528fp",
    name: "Switch EnGenius ECS1528FP Cloud PoE+",
    model: "ECS1528FP",
    category: "switches",
    description: "Switch L2+ gestionado en Cloud con 24 puertos Gigabit PoE+ (410W) y 4 uplinks 10G SFP+.",
    url: "https://www.ecomshop.es/engenius-ecs1528fp",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_Switch_ECS1528FP_Front_Top_View.jpg?v=1745267323&width=1946",
    specs: ["24x GbE PoE+ (410W budget)", "4x 10G SFP+ uplinks", "Reinicio remoto PoE", "Topología visual en Cloud"]
  },
  {
    id: "ecs5512fp",
    name: "Switch EnGenius ECS5512FP 10G Multi-Gigabit PoE++",
    model: "ECS5512FP",
    category: "switches",
    description: "Switch de agregación troncal L2+ con 8 puertos 10G Base-T PoE++ (420W) y 4 slots 10G SFP+.",
    url: "https://www.ecomshop.es/engenius-ecs5512fp",
    imageUrl: "https://www.engeniustech.com/wp-content/uploads/2020/02/ecs2512fp-front-opt.jpg",
    specs: ["8x 10G Base-T PoE++ (802.3bt)", "4x 10G SFP+ uplinks", "PoE Budget 420W", "Conmutación 240 Gbps"]
  },
  {
    id: "esg510",
    name: "EnGenius Cloud Security Gateway ESG510",
    model: "ESG510",
    category: "engenius",
    description: "Gateway de seguridad gestionado 100% en EnGenius Cloud con 4x 2.5GbE (doble WAN), VPN WireGuard/IPsec y firewall sin licencias (equipo cableado sin Wi-Fi).",
    url: "https://www.ecomshop.es/engenius-esg510",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_VPN_Router_ESG510_Top_View_Angle_Left.jpg",
    specs: ["Doble WAN 2.5 GbE", "Firewall 2.5 Gbps & VPN 950 Mbps", "0€ licencias de firewall/VPN", "Equipo cableado sin Wi-Fi"]
  },
  {
    id: "esg610",
    name: "EnGenius Cloud Security Gateway ESG610",
    model: "ESG610",
    category: "engenius",
    description: "Gateway corporativo con CPU Quad-Core 2.2 GHz, 4 puertos 2.5 GbE, balanceo multi-WAN y VPN WireGuard hasta 1.2 Gbps (cableado sin Wi-Fi).",
    url: "https://www.ecomshop.es/engenius-esg610",
    imageUrl: "https://store.engeniustech.com/cdn/shop/files/Product_Photos_Cloud_VPN_Router_ESG610_Front_Top_View.jpg",
    specs: ["Quad-Core 2.2 GHz", "4x puertos 2.5GbE Multi-WAN", "SD-WAN y VPN WireGuard 1.2 Gbps", "Seguridad perimetral sin cuotas"]
  },
  {
    id: "sfp-kit-10g",
    name: "Kit Transceptores 10G SFP+ & Latiguillos OM4",
    model: "SFP-10G-SR-KIT",
    category: "fibra",
    description: "Módulos ópticos SFP+ 10G multimodo 850nm con latiguillos OM4 preconectorizados de baja atenuación.",
    url: "https://www.ecomshop.es/transceptores-sfp-10g",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    specs: ["10 Gbps garantizados", "Conector LC dúplex", "Compatible EnGenius/Cisco/MikroTik", "Latiguillos OM4 testados"]
  },
  {
    id: "poe30gv2",
    name: "Inyector EnGenius POE30Gv2 Gigabit PoE+ 30W",
    model: "POE30Gv2",
    category: "accesorios",
    description: "Inyector Gigabit PoE+ 802.3at de 30W plug-and-play para alimentar APs y cámaras en switches no PoE.",
    url: "https://www.ecomshop.es/guias-poe",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    specs: ["Salida PoE+ 30W (54V)", "Puertos Gigabit Ethernet", "Alcance hasta 100m", "Protección cortocircuitos"]
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
    id: "promo-cloud-zero-license",
    title: "Infraestructura Cloud Sin Licencias: EnGenius Cloud Enterprise",
    angle: "Ofrece a clientes corporativos gestión centralizada multi-tenant, VPN mesh y analítica de espectro sin cuotas recurrentes.",
    targetObjective: "Descargar comparativa de TCO frente a Cisco Meraki / Ubiquiti",
    recommendedProducts: ["esg510", "ecs1528fp", "ecw536"]
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

// Re-export canonical B2B catalog module
export * from "./catalog";
