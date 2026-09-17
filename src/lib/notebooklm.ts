export interface NotebookSource {
  id: string;
  title: string;
  type: "pdf" | "url" | "note" | "datasheet";
  description: string;
  url?: string;
  addedAt: string;
}

export interface NotebookState {
  notebookId: string;
  title: string;
  officialUrl: string;
  status: "connected" | "syncing" | "offline";
  lastSync: string;
  sources: NotebookSource[];
}

export const OFFICIAL_NOTEBOOK: NotebookState = {
  notebookId: "6ae5b7bb-ab27-4541-80cc-6127730fd01b",
  title: "EcomShop: Professional Networking and B2B WiFi Solutions Store - Gemini Notebook",
  officialUrl: "https://notebook.google.com/notebook/6ae5b7bb-ab27-4541-80cc-6127730fd01b",
  status: "connected",
  lastSync: new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
  sources: [
    // Bloque 1: Novedades EnGenius Networks WiFi 7 & Cloud
    {
      id: "src-1",
      title: "EnGenius Cloud WiFi 7 ECW536 Datasheet",
      type: "datasheet",
      description: "AP Tri-Band WiFi 7 con modulación 4096-QAM, canales de 320 MHz, Multi-Link Operation (MLO) y puerto 10GbE PoE++.",
      url: "https://www.ecomshop.es/engenius-ecw536",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-2",
      title: "EnGenius ECW526 WiFi 7 AP Interior Compacto",
      type: "datasheet",
      description: "Punto de acceso WiFi 7 Dual-Band optimizado para despachos, hoteles y salas de reuniones con puerto 2.5GbE PoE+.",
      url: "https://www.ecomshop.es/engenius-ecw526",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-3",
      title: "EnGenius ECW546 Outdoor WiFi 7 (Carcasa IP67)",
      type: "datasheet",
      description: "AP de intemperie reforzado con protección contra sobretensiones, largo alcance para terrazas, naves y campings.",
      url: "https://www.ecomshop.es/engenius-ecw546-outdoor",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-4",
      title: "Arquitectura EnGenius Cloud Enterprise Sin Cuotas Anuales",
      type: "pdf",
      description: "Whitepaper sobre ahorro de costes con EnGenius Cloud multi-tenant frente a modelos de suscripción obligatoria tipo Meraki.",
      url: "https://www.ecomshop.es/engenius-cloud",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-5",
      title: "App Móvil EnGenius Cloud To-Go & Aprovisionamiento QR",
      type: "note",
      description: "Guía de despliegue ultrarrápido: escaneo de código QR, diagnóstico remoto de cableado y mapa de topología en vivo.",
      url: "https://www.ecomshop.es/cloud-to-go",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-6",
      title: "Gateway de Seguridad EnGenius ESG610 SD-WAN",
      type: "datasheet",
      description: "Router gateway corporativo gestionado en cloud con balanceo de carga multi-WAN, VPN IPsec/WireGuard y firewall de inspección profunda.",
      url: "https://www.ecomshop.es/engenius-esg610",
      addedAt: "14 Sep 2026"
    },

    // Bloque 2: Switches Gestionables & Alimentación PoE++
    {
      id: "src-7",
      title: "Switch EnGenius ECS1528FP Cloud PoE+ (410W)",
      type: "datasheet",
      description: "Switch L2+ gestionado en Cloud con 24 puertos GbE PoE+ (410W) y 4 uplinks 10G SFP+ para enlaces de alta velocidad.",
      url: "https://www.ecomshop.es/engenius-ecs1528fp",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-8",
      title: "Switch Multi-Gigabit EnGenius ECS2512FP (PoE++ 60W)",
      type: "datasheet",
      description: "Switch de 8 puertos 2.5GbE PoE++ 802.3bt y 4 puertos 10G SFP+ diseñado específicamente para exprimir el caudal de APs WiFi 7.",
      url: "https://www.ecomshop.es/engenius-ecs2512fp",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-9",
      title: "Switch de Agregación de Fibra EnGenius ECS5512FP",
      type: "datasheet",
      description: "Switch de agregación troncal con 8 puertos 10G Base-T y 4 slots 10G SFP+ para distribución troncal inter-edificios.",
      url: "https://www.ecomshop.es/engenius-ecs5512fp",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-10",
      title: "Guía de Dimensionamiento PoE Budget 802.3af/at/bt",
      type: "pdf",
      description: "Manual de cálculo de consumos pico para cámaras PTZ de seguridad, telefonía IP y puntos de acceso de 4 cadenas.",
      url: "https://www.ecomshop.es/guias-poe",
      addedAt: "14 Sep 2026"
    },

    // Bloque 3: Comparativas de Coste y TCO para Jefes de Compras
    {
      id: "src-11",
      title: "Comparativa TCO 2026: EnGenius Cloud vs Cisco Meraki",
      type: "pdf",
      description: "Estudio comparativo que demuestra un ahorro de hasta el 42% a 3 años al eliminar las licencias anuales por dispositivo.",
      url: "https://www.ecomshop.es/comparativa-tco-meraki",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-12",
      title: "Comparativa Técnica: EnGenius Networks vs Ubiquiti UniFi",
      type: "note",
      description: "Análisis de robustez de hardware, soporte telefónico preventa directo de ingeniería y estabilidad de firmwares corporativos.",
      url: "https://www.ecomshop.es/engenius-vs-unifi",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-13",
      title: "Informe de Márgenes y Rentabilidad para Instaladores IT",
      type: "pdf",
      description: "Cómo los instaladores maximizan el margen comercial de sus proyectos mediante hardware profesional sin costes recurrentes.",
      url: "https://www.ecomshop.es/rentabilidad-instaladores",
      addedAt: "14 Sep 2026"
    },

    // Bloque 4: Fibra Óptica, GPON y Conectividad Troncal
    {
      id: "src-14",
      title: "Transceptores 10G SFP+ y Latiguillos OM3/OM4",
      type: "datasheet",
      description: "Guía de selección de módulos ópticos SFP+ 850nm y 1310nm testados para enlaces troncales sin pérdida de paquetes.",
      url: "https://www.ecomshop.es/transceptores-sfp-10g",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-15",
      title: "Módulos de Fibra 25G / 100G SFP28 & QSFP28 para Core",
      type: "datasheet",
      description: "Soluciones ópticas para centros de procesamiento de datos y conmutación troncal de alto caudal.",
      url: "https://www.ecomshop.es/fibra-25g-100g",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-16",
      title: "Guía de Despliegue GPON / POL en Hospitality y Residencial",
      type: "pdf",
      description: "Reducción de espacio en patinillos técnicos y ahorro de energía distribuyendo fibra óptica pasiva hasta la habitación.",
      url: "https://www.ecomshop.es/gpon-pol-hospitality",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-17",
      title: "Protocolos de Fusión y Certificación de Enlaces Ópticos",
      type: "note",
      description: "Criterios de atenuación máxima por fusión y conector según normativa para certificar instalaciones de telecomunicaciones.",
      url: "https://www.ecomshop.es/certificacion-fibra",
      addedAt: "14 Sep 2026"
    },

    // Bloque 5: Servicios Mayoristas EcomSpain & Soporte B2B
    {
      id: "src-18",
      title: "Garantía Oficial EcomSpain & Sustitución Avanzada 24h",
      type: "url",
      description: "Política de garantía para distribuidores e integradores: reemplazo de hardware inmediato en 24h para minimizar tiempos de parada.",
      url: "https://www.ecomshop.es/garantia-ecomspain",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-19",
      title: "Servicio Gratuito de Asesoría Preventa y Mapas de Cobertura",
      type: "note",
      description: "El departamento de ingeniería de EcomSpain ayuda a diseñar la arquitectura de red y la lista de materiales antes de comprar.",
      url: "https://www.ecomshop.es/soporte-preventa",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-20",
      title: "Catálogo Oficial EcomShop.es & Stock Inmediato",
      type: "url",
      description: "Acceso exclusivo para profesionales con tarifas mayoristas escalonadas, pedidos online 24/7 y envío inmediato desde España.",
      url: "https://www.ecomshop.es",
      addedAt: "14 Sep 2026"
    }
  ]
};
