import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";
import { OFFICIAL_NOTEBOOK } from "@/lib/notebooklm";

export interface FieldScenarioInspiration {
  id: string;
  badge: string;
  title: string;
  prompt: string;
  suggestedCategory: "wifi" | "switches" | "fibra" | "engenius";
  icon: "zap" | "warning" | "network" | "layers" | "file";
}

export const MASTER_NOTEBOOK_ID = "6ae5b7bb-ab27-4541-80cc-6127730fd01b";

/**
 * Banco maestro expandido de 18 escenarios de ingeniería y dolores de obra reales
 */
export const CURATED_FIELD_SCENARIOS_POOL: FieldScenarioInspiration[] = [
  // Bloque 1: Wi-Fi 7, Radiofrecuencia y Roaming
  {
    id: "sc-bottleneck-wifi7",
    badge: "CUELLO DE BOTELLA 1G",
    title: "APs Wi-Fi 7 conectados a switches antiguos 1 GbE",
    prompt: "El cliente ha adquirido puntos de acceso Wi-Fi 7 pero los mantiene conectados a switches antiguos de 1 GbE, limitando el caudal a 940 Mbps netos. Necesita justificación técnica para migrar la conmutación a puertos 2.5G/10G PoE++ (ECS2512FP) para no estrangular la modulación 4096-QAM.",
    suggestedCategory: "switches",
    icon: "zap"
  },
  {
    id: "sc-dfs-radar",
    badge: "SATURACIÓN DFS",
    title: "Cortes de señal en naves industriales por radares meteorológicos",
    prompt: "En una nave logística próxima a aeropuerto o costa, las radios de 5 GHz sufren desconexiones continuas porque el radar meteorológico fuerza el salto de canales DFS. Explicar cómo Wi-Fi 7 con banda limpia de 6 GHz y Preamble Puncturing elimina las caídas sin perder ancho de banda.",
    suggestedCategory: "wifi",
    icon: "network"
  },
  {
    id: "sc-roaming-hospitality",
    badge: "ROAMING & LATENCIA",
    title: "Microcortes en telefonía VoIP y tablets al moverse entre plantas",
    prompt: "En un hotel y oficinas corporativas, el personal reporta microcortes en llamadas de voz IP y tablets al desplazarse entre coberturas de APs. Explicar cómo configurar roaming 802.11k/v/r y la ventaja de Multi-Link Operation (MLO) en EnGenius Cloud para evitar caídas de sesión.",
    suggestedCategory: "wifi",
    icon: "network"
  },
  {
    id: "sc-wifi-outdoor-surge",
    badge: "INTEMPERIE IP67",
    title: "Averías por sobretensiones y tormentas en APs de exterior",
    prompt: "En un camping y terraza hostelera, las tormentas de verano queman los puertos Ethernet de los puntos de acceso de intemperie. Explicar la importancia de la envolvente IP67 del EnGenius ECW546, protección contra sobretensiones integrada de 6kV y latiguillos apantallados con toma de tierra adecuada.",
    suggestedCategory: "wifi",
    icon: "warning"
  },

  // Bloque 2: Switches, Alimentación PoE++ y Potencia Térmica
  {
    id: "sc-poe-drop",
    badge: "CAÍDA DE TENSIÓN POE++",
    title: "Reinicios cíclicos en cámaras PTZ o APs en tiradas largas",
    prompt: "El instalador reporta reinicios aleatorios en cámaras domo PTZ y APs de 4 cadenas en tiradas de más de 60 metros. Sospecha de caída de tensión por cableado de cobre fino (AWG 26) y déficit en el PoE Budget. Necesita cálculo de PoE++ 802.3bt y recomendación de switches con margen holgado.",
    suggestedCategory: "switches",
    icon: "warning"
  },
  {
    id: "sc-rack-thermal-throttling",
    badge: "DISIPACIÓN TÉRMICA",
    title: "Sobrecalentamiento en racks cerrados de comunicaciones",
    prompt: "En un armario rack de 12U sin ventilación forzada, el switch PoE de 24 puertos alcanza 68ºC en verano, provocando throttling térmico y cortes de alimentación intermitentes. Recomendar distribución térmica, switches de alta eficiencia energética y balanceo de carga de potencia disipada.",
    suggestedCategory: "switches",
    icon: "zap"
  },
  {
    id: "sc-cctv-ip-poe-budget",
    badge: "CCTV & POE BUDGET",
    title: "Ampliación de cámaras IP nocturnas con iluminadores infrarrojos",
    prompt: "Al caer la noche y encenderse los iluminadores IR de 16 cámaras IP, el switch PoE de 180W colapsa por sobreconsumo pico (pasan de 7W a 22W por cámara). Explicar cómo auditar el consumo pico y sustituir por un switch ECS1528FP de 410W PoE+ con reserva de potencia.",
    suggestedCategory: "switches",
    icon: "zap"
  },

  // Bloque 3: Fibra Óptica, Transceptores SFP+ y Enlaces Troncales
  {
    id: "sc-fiber-sfp",
    badge: "TRONCAL 10G",
    title: "Saturación del enlace troncal entre racks y plantas",
    prompt: "Saturación severa en el enlace troncal entre el rack principal y la planta de producción en horas punta. Explicar cómo desplegar un enlace troncal con módulos transceptores 10G SFP+ y fibra óptica OM3/OM4 junto al switch de agregación ECS5512FP sin interrupción del servicio.",
    suggestedCategory: "fibra",
    icon: "file"
  },
  {
    id: "sc-fiber-dirty-connectors",
    badge: "ATENUACIÓN ÓPTICA",
    title: "Pérdida de paquetes en enlaces de fibra por conectores LC sucios",
    prompt: "Tras una fusión de fibra en fábrica, el enlace 10G SFP+ levanta pero sufre pérdida intermitente de tramas y errores CRC por micropartículas de polvo en la férula del conector. Explicar el procedimiento de limpieza con lápiz limpiador de 1.25mm y certificación con reflectómetro OTDR.",
    suggestedCategory: "fibra",
    icon: "file"
  },
  {
    id: "sc-gpon-hospitality",
    badge: "DESPLIEGUE GPON",
    title: "Ahorro de espacio en patinillos sustituyendo cobre por fibra GPON",
    prompt: "En la reforma de un hotel de 80 habitaciones, las bandejas portacables están saturadas de mazos de cable UTP. Explicar cómo una arquitectura GPON pasiva con una sola fibra monomodo alimenta datos, TV y telefonía ahorrando el 70% de espacio físico.",
    suggestedCategory: "fibra",
    icon: "file"
  },

  // Bloque 4: Costes TCO, Modelo de Negocio B2B y Cero Licencias
  {
    id: "sc-meraki-tco",
    badge: "AHORRO 42% TCO",
    title: "Fuga de presupuesto por licencias anuales tipo Cisco Meraki",
    prompt: "Director TIC con parque de 35 puntos de acceso cuyas licencias anuales de suscripción cloud vencen en 3 meses con costes abusivos. Busca migrar a EnGenius Cloud Enterprise para obtener gestión en la nube profesional con 0€ en licencias recurrentes y sustitución en 24h de EcomSpain.",
    suggestedCategory: "engenius",
    icon: "layers"
  },
  {
    id: "sc-client-retention-margin",
    badge: "MARGEN COMERCIAL",
    title: "Cómo aumentar el margen neto en presupuestos de licitación IT",
    prompt: "Instalador autónomo compite contra grandes integradores que ofrecen marcas de consumo con margen inferior al 8%. Explicar cómo la gama profesional EnGenius con canal cerrado mayorista en EcomShop le permite asegurar márgenes de más del 25% y soporte preventa directo.",
    suggestedCategory: "engenius",
    icon: "layers"
  },
  {
    id: "sc-fast-replacement-24h",
    badge: "SLA & GARANTÍA 24H",
    title: "Riesgo de penalizaciones por caída de red en contratos de mantenimiento",
    prompt: "Empresa de mantenimiento tiene un SLA con penalización económica si una fábrica permanece más de 4 horas sin red. Resaltar la ventaja del servicio de sustitución avanzada en 24 horas con stock permanente en Alcalá de Henares (EcomSpain) frente a fabricantes sin almacén local.",
    suggestedCategory: "engenius",
    icon: "layers"
  },

  // Bloque 5: Seguridad Perimetral, SD-WAN y VPNs Corporativas
  {
    id: "sc-sdwan-failover",
    badge: "SD-WAN DUAL-WAN",
    title: "Caídas de Internet que paralizan TPVs y facturación en comercios",
    prompt: "En una cadena de 5 tiendas retail, las caídas de fibra del operador paralizan las ventas. Explicar cómo el Gateway SD-WAN ESG610 conmuta automáticamente a backup 5G/LTE sin interrumpir las transacciones bancarias ni la VPN con la central.",
    suggestedCategory: "engenius",
    icon: "network"
  },
  {
    id: "sc-vlan-segmentation-iot",
    badge: "SEGMENTACIÓN VLAN",
    title: "Intrusiones y saturación por mezclar domótica y ordenadores en la misma red",
    prompt: "Una asesoría contable tiene sensores IoT, impresoras y climatización en la misma subred que los servidores de bases de datos. Detallar la creación de VLANs aisladas con reglas ACL en switches ECS1528FP para evitar ataques laterales.",
    suggestedCategory: "switches",
    icon: "warning"
  },
  {
    id: "sc-wireguard-telework",
    badge: "VPN WIREGUARD",
    title: "Lentitud en accesos remotos de teletrabajadores por VPNs IPsec lentas",
    prompt: "20 ingenieros teletrabajan accediendo a planos CAD en la oficina y se quejan de lentitud extrema con VPNs IPsec tradicionales. Explicar cómo WireGuard nativo en el gateway ESG610 acelera el túnel cifrado multiplicando el rendimiento por 3.",
    suggestedCategory: "engenius",
    icon: "network"
  }
];

/**
 * Genera un conjunto fresco de 6 escenarios de campo con IA basándose en el Master NotebookLM,
 * o rota aleatoriamente el banco de datos curado en caso de desconexión / rate-limit.
 */
export async function generateFieldScenariosWithAI(
  categoryFilter = "ALL",
  apiKeyOverride?: string
): Promise<FieldScenarioInspiration[]> {
  const client = getGenAIClient(apiKeyOverride);
  const model = getActiveGeminiModel(apiKeyOverride);

  const relevantSources = OFFICIAL_NOTEBOOK.sources.slice(0, 8);
  const sourcesContext = relevantSources
    .map((s) => `[${s.id}] ${s.title}: ${s.description}`)
    .join("\n");

  const prompt = `
Eres el Jefe de Soporte Preventa de Ingeniería en Campo de EcomShop (EcomSpain).
Tu misión es generar EXACTAMENTE 6 casos reales de dolor técnico de obra o desafíos de infraestructura B2B para que un redactor técnico o instalador pueda inspirarse de inmediato.

CATEGORÍA SOLICITADA: ${categoryFilter}
MASTER NOTEBOOKLM ID: notebooks/${MASTER_NOTEBOOK_ID}
FUENTES TÉCNICAS OFICIALES:
${sourcesContext}

DIRECTRICES TÉCNICAS OBLIGATORIAS:
1. RIGOR DE CAMPO Y LENGUAJE DE INSTALADOR: Plantea problemas cotidianos reales (caídas de tensión PoE en cables largos, estrangulamiento de APs Wi-Fi 7 conectados a switches 1G, saturación DFS por radares, conectores LC de fibra sucios, sobrecoste de licencias Meraki vs EnGenius Cloud sin cuotas).
2. HARDWARE REAL: Utiliza modelos oficiales de EcomShop (ECW536, ECW526, ECW546, ECS2512FP, ECS1528FP, ECS5512FP, ESG610, SFP-10G-SR).
3. PURGA ABSOLUTA: Queda prohibido mencionar gamas descatalogadas como "Fit", "FitController" o controladores locales.
4. ESTRUCTURA EXACTA JSON: Devuelve ÚNICAMENTE un array JSON con 6 objetos.

FORMATO REQUERIDO:
[
  {
    "id": "scenario-ai-1",
    "badge": "CATEGORÍA CORTA EN MAYÚSCULAS (ej: CUELLO DE BOTELLA 1G, CAÍDA POE, SATURACIÓN DFS, AHORRO TCO, TRONCAL 10G)",
    "title": "Titular conciso del problema de obra (máximo 10 palabras)",
    "prompt": "Descripción técnica detallada del problema de obra, consecuencias prácticas y hardware recomendado para solucionarlo (3 a 4 líneas).",
    "suggestedCategory": "wifi",
    "icon": "zap"
  }
]
`;

  try {
    const generatePromise = client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("[FieldScenarios] Timeout superado (10s)")), 10000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const raw = (response as any).text || "[]";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed) && parsed.length >= 3) {
      return parsed.slice(0, 6).map((item, idx) => ({
        id: item.id || `sc-ai-${Date.now()}-${idx}`,
        badge: item.badge || "INGENIERÍA DE CAMPO",
        title: item.title || "Dolor de infraestructura en obra",
        prompt: item.prompt || "Desafío técnico en infraestructura de telecomunicaciones.",
        suggestedCategory: (["wifi", "switches", "fibra", "engenius"].includes(item.suggestedCategory)
          ? item.suggestedCategory
          : "engenius") as any,
        icon: (["zap", "warning", "network", "layers", "file"].includes(item.icon)
          ? item.icon
          : "zap") as any
      }));
    }
  } catch (err) {
    console.warn("[FieldScenarios] Excepción o timeout invocando Gemini, rotando pool curado:", err);
  }

  // Fallback garantizado: filtrar y mezclar el pool de 18 escenarios
  return getRandomCuratedScenarios(categoryFilter, 6);
}

/**
 * Devuelve un subconjunto aleatorio y fresco del pool curado
 */
export function getRandomCuratedScenarios(
  category = "ALL",
  count = 6
): FieldScenarioInspiration[] {
  let filtered = CURATED_FIELD_SCENARIOS_POOL;
  const cleanCat = category.toLowerCase();

  if (cleanCat !== "all" && cleanCat !== "todas") {
    filtered = CURATED_FIELD_SCENARIOS_POOL.filter(
      (s) => s.suggestedCategory.toLowerCase() === cleanCat || s.badge.toLowerCase().includes(cleanCat)
    );
    if (filtered.length === 0) filtered = CURATED_FIELD_SCENARIOS_POOL;
  }

  // Mezclar aleatoriamente (Fisher-Yates)
  const shuffled = [...filtered].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
