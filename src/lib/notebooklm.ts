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
    {
      id: "src-1",
      title: "EnGenius Cloud WiFi 7 ECW536 Datasheet",
      type: "datasheet",
      description: "Especificaciones de AP Tri-Band con modulación 4096-QAM, MLO y puerto 10GbE PoE++.",
      url: "https://www.ecomshop.es/engenius-ecw536",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-2",
      title: "Arquitectura EnGenius Fit sin Cuotas Anuales",
      type: "pdf",
      description: "Whitepaper sobre ahorro de costes TCO con FitController on-premise frente a marcas con licencias obligatorias.",
      url: "https://www.ecomshop.es/engenius-fit",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-3",
      title: "Guía de Switches PoE+ y Uplinks 10G SFP+",
      type: "datasheet",
      description: "Dimensionamiento de PoE Budget para cámaras IP 4K y APs de alta densidad con ECS1528FP.",
      url: "https://www.ecomshop.es/engenius-ecs1528fp",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-4",
      title: "Despliegues de Fibra Óptica OM3/OM4 y Transceptores SFP+",
      type: "note",
      description: "Consideraciones técnicas de latencia, distancias y compatibilidad óptica para backbones entre armarios rack.",
      url: "https://www.ecomshop.es/transceptores-sfp-10g",
      addedAt: "14 Sep 2026"
    },
    {
      id: "src-5",
      title: "Argumentario Preventa EcomShop & Envíos 24h",
      type: "note",
      description: "Propuesta de valor mayorista: asesoría de ingeniería gratuita previa a la compra y stock inmediato.",
      url: "https://www.ecomshop.es",
      addedAt: "14 Sep 2026"
    }
  ]
};
