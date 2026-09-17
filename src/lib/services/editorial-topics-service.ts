import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";
import { OFFICIAL_NOTEBOOK } from "@/lib/notebooklm";
import {
  EditorialTopicCard,
  TopicCategory,
  TopicVertical,
  TopicArchetype
} from "@/lib/types/editorial-topics";

export const MASTER_NOTEBOOK_ID = "6ae5b7bb-ab27-4541-80cc-6127730fd01b";

export const ARCHETYPE_DESCRIPTIONS: Record<TopicArchetype, string> = {
  TROUBLESHOOTING: "Problemas reales en obra e ingeniería de campo (saturación de canales DFS por radares meteorológicos, latencia en roaming, cuellos de botella en puertos de subida y cableado Cat5e estrangulando enlaces 2.5GbE).",
  DIMENSIONAMIENTO: "Cálculos matemáticos rigurosos de Watios PoE (802.3af/at/bt), presupuestos de potencia disipada en racks cerrados, factor de potencia y pérdidas por tiradas de cableado largas.",
  BATTLECARD: "Comparativas y TCO frente a marcas de consumo o competidores de cuotas anuales obligatorias. Argumentar por qué una solución profesional con soporte técnico local y stock en Alcalá de Henares (EcomSpain) es superior a marcas de gran consumo sin canal B2B.",
  CASO_REAL: "Justificación técnica ineludible para modernizar infraestructuras amortizadas (sustitución de conmutación 1 GbE y Wi-Fi 5 por backbones 10G y Wi-Fi 7 sin interrupción de servicio)."
};

export async function generateEditorialTopicsWithAI(
  category: TopicCategory,
  vertical: TopicVertical,
  arquetipo: TopicArchetype,
  apiKeyOverride?: string
): Promise<EditorialTopicCard[]> {
  const client = getGenAIClient(apiKeyOverride);
  const relevantSources = OFFICIAL_NOTEBOOK.sources.slice(0, 10);
  const sourcesContext = relevantSources
    .map((s) => `[${s.id}] ${s.title}: ${s.description}`)
    .join("\n");

  const prompt = `
Eres el Director de Estrategia Editorial B2B y Preventa de Ingeniería de EcomShop (EcomSpain).
Debes formular 4 líneas editoriales frescas, con alta autoridad técnica e irresistible gancho comercial para instaladores e integradores B2B de telecomunicaciones.

CONTEXTO DE CONSULTA:
- Categoría Solicitada: ${category}
- Vertical / Sector: ${vertical}
- Arquetipo de Contenido: ${arquetipo} - ${ARCHETYPE_DESCRIPTIONS[arquetipo]}
- Master NotebookLM ID: notebooks/${MASTER_NOTEBOOK_ID}
- Fuentes Verificadas de Referencia:
${sourcesContext}

DIRECTRICES EDITORIALES INQUEBRANTABLES:
1. RIGOR DE INGENIERÍA: Habla el lenguaje del instalador certificado. Cero generalidades de marketing como "en el mundo digital actual". Enfócate en datos empíricos: modulación 4096-QAM, Multi-Link Operation (MLO), punzonado de preámbulo, presupuestos PoE 802.3bt, enlaces 10G SFP+ y atenuación de fibra.
2. PURGA Y BLACKLIST DE HARDWARE HEREDADO: Queda TERMINANTEMENTE PROHIBIDO mencionar gamas descatalogadas como "Fit", "FitController", "FitXpress" o controladores locales obsoletos. La gestión inalámbrica debe ser exclusivamente "EnGenius Cloud" (nativa sin licencias) o "Standalone / MESH".
3. FOCO EN VALOR LOCAL: Resalta el soporte preventa directo de ingeniería y stock inmediato en 24h desde Alcalá de Henares (EcomSpain).
4. SUGERENCIA DE SKUS REALES: Utiliza SKUs oficiales de EcomShop (ejemplos: ECW536, ECW526, ECS1528FP, ECS2512FP, ESG510, SFP-10G-SR-KIT, POE30Gv2).

ESTRUCTURA DE RESPUESTA REQUERIDA:
Devuelve ÚNICAMENTE un array JSON de 4 objetos con la siguiente estructura:
[
  {
    "id": "topic-1",
    "badge": "Categoría corta (ej: WIFI 7, SWITCHES 2.5G, POE++, FIBRA 10G)",
    "title": "Titular provocador de alta autoridad técnica (ej: El error común al migrar a Wi-Fi 7: cómo evitar que tu cableado Cat5e estrangule el puerto 2.5GbE)",
    "targetAudience": "Perfil de instalador específico (ej: Instaladores de Telecomunicaciones Tipo A, Ingenieros de Red)",
    "coreArgument": "Tesis técnica central basada en especificaciones reales de producto",
    "suggestedSKUs": ["ECW536", "ECS2512FP"]
  }
]
`;

  try {
    const generatePromise = client.models.generateContent({
      model: getActiveGeminiModel(apiKeyOverride),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("[EditorialTopics] Timeout superado (12s)")), 12000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const raw = response.text || "[]";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 4).map((item, idx) => ({
        id: item.id || `topic-ai-${Date.now()}-${idx}`,
        badge: item.badge || category,
        title: item.title || "Línea Editorial Técnica",
        targetAudience: item.targetAudience || "Instaladores e Integradores IT",
        coreArgument: item.coreArgument || "Tesis técnica para proyectos de conectividad profesional.",
        suggestedSKUs: Array.isArray(item.suggestedSKUs) && item.suggestedSKUs.length > 0 ? item.suggestedSKUs : ["ECW536", "ECS1528FP"],
        category,
        vertical,
        archetype: arquetipo
      }));
    }

    return getDeterministicTopicsFallback(category, vertical, arquetipo);
  } catch (error) {
    console.warn("[EditorialTopics] Fallback activado tras timeout/error:", error);
    return getDeterministicTopicsFallback(category, vertical, arquetipo);
  }
}

export function getDeterministicTopicsFallback(
  category: TopicCategory,
  vertical: TopicVertical,
  arquetipo: TopicArchetype
): EditorialTopicCard[] {
  const seed = `${category}-${vertical}-${arquetipo}`;

  const baseLibrary: Record<string, EditorialTopicCard[]> = {
    WIFI7: [
      {
        id: `wifi7-1-${Date.now()}`,
        badge: "WIFI 7 & CABLEADO",
        title: "El cuello de botella oculto de Wi-Fi 7: cómo evitar que cables Cat5e estrangulen puertos 2.5GbE",
        targetAudience: "Instaladores de Telecomunicaciones Tipo A e Integradores IT",
        coreArgument: "Desplegar APs Wi-Fi 7 sobre cableado antiguo sin certificar enlaces Multi-Gigabit genera atenuación y retransmisiones continuas que degradan la modulación 4096-QAM.",
        suggestedSKUs: ["ECW536", "ECS2512FP", "POE30Gv2"],
        category: "WIFI7",
        vertical,
        archetype: arquetipo
      },
      {
        id: `wifi7-2-${Date.now()}`,
        badge: "MLO & ROAMING",
        title: "Multi-Link Operation (MLO) en entornos densos: adiós a las caídas de VoIP y videollamadas",
        targetAudience: "Responsables de Red en Campus y Hoteles",
        coreArgument: "La agregación concurrente en 5 GHz y 6 GHz permite conmutación de paquetes sin pérdida (< 3ms) garantizando roaming transparente en auditorios corporativos.",
        suggestedSKUs: ["ECW536", "ECW526", "ECS1528FP"],
        category: "WIFI7",
        vertical,
        archetype: arquetipo
      },
      {
        id: `wifi7-3-${Date.now()}`,
        badge: "CANALES DFS & PREÁMBULO",
        title: "Punzonado de Preámbulo (Preamble Puncturing): exprime canales de 160/320 MHz sorteando interferencias",
        targetAudience: "Ingenieros de Radiofrecuencia e Instaladores de Red",
        coreArgument: "En lugar de penalizar el canal entero a 20 MHz ante un radar meteorológico o interferencia local, el punzonado aísla la porción sucia manteniendo un throughput superior al 80%.",
        suggestedSKUs: ["ECW536", "ESG510"],
        category: "WIFI7",
        vertical,
        archetype: arquetipo
      },
      {
        id: `wifi7-4-${Date.now()}`,
        badge: "TCO CLOUD",
        title: "Migración a Wi-Fi 7 sin cuotas anuales: cómo triplicar el margen del instalador con EnGenius Cloud",
        targetAudience: "Directores Técnicos de Instaladoras y Proveedores MSP",
        coreArgument: "Frente a plataformas que exigen renovar licencias para no apagar el hardware, el modelo EnGenius Cloud nativo reduce el TCO a 3 años en un 42%.",
        suggestedSKUs: ["ECW526", "ECW536", "ECS1528FP"],
        category: "WIFI7",
        vertical,
        archetype: arquetipo
      }
    ],
    POE_SWITCHING: [
      {
        id: `poe-1-${Date.now()}`,
        badge: "CÁLCULO POE++",
        title: "Presupuestos PoE al límite: cálculo real entre 802.3at y bt para evitar reinicios en frío",
        targetAudience: "Instaladores de Seguridad Electrónica e Integradores de CCTV",
        coreArgument: "Los picos de arranque de iluminadores IR de cámaras PTZ y radios Wi-Fi 7 pueden colapsar fuentes no dimensionadas térmicamente en armarios cerrados.",
        suggestedSKUs: ["ECS2512FP", "ECS1528FP"],
        category: "POE_SWITCHING",
        vertical,
        archetype: arquetipo
      },
      {
        id: `poe-2-${Date.now()}`,
        badge: "CONMUTACIÓN 10G",
        title: "Switches de Acceso L2+ con Uplinks 10G SFP+: erradicando el colapso troncal hacia el almacenamiento",
        targetAudience: "Ingenieros de Infraestructura y Redes B2B",
        coreArgument: "Conectar 24 puertos Gigabit a un único enlace de 1 GbE es la causa del 70% de quejas en transferencias de backups corporativos y NVRs.",
        suggestedSKUs: ["ECS1528FP", "SFP-10G-SR-KIT"],
        category: "POE_SWITCHING",
        vertical,
        archetype: arquetipo
      },
      {
        id: `poe-3-${Date.now()}`,
        badge: "AUTO-RECOVERY",
        title: "Monitoreo PoE con Auto-Reinicio de Puertos: reduce un 85% las visitas técnicas a obra",
        targetAudience: "Proveedores de Mantenimiento y Soporte IT",
        coreArgument: "El switch detecta la pérdida de ping del AP o cámara y cicla la alimentación eléctrica automáticamente, restaurando el servicio sin desplazar a un técnico.",
        suggestedSKUs: ["ECS1528FP", "ECS2512FP"],
        category: "POE_SWITCHING",
        vertical,
        archetype: arquetipo
      },
      {
        id: `poe-4-${Date.now()}`,
        badge: "TÉRMICA EN RACK",
        title: "Gestión Térmica en Racks de 19\": cómo evitar el estrangulamiento de rendimiento por sobrecalentamiento",
        targetAudience: "Técnicos de CPD y Armarios Técnicos",
        coreArgument: "La disipación de fuentes PoE de más de 400W exige ventilación activa inteligente y separación de unidades para garantizar el MTBF anunciado.",
        suggestedSKUs: ["ECS1528FP"],
        category: "POE_SWITCHING",
        vertical,
        archetype: arquetipo
      }
    ],
    FIBRA_SFP: [
      {
        id: `fibra-1-${Date.now()}`,
        badge: "BACKBONE 10G",
        title: "Módulos 10G SFP+ en campus hoteleros: latiguillos OM4 y enlaces sin pérdidas de paquetes",
        targetAudience: "Instaladores de Infraestructuras de Telecomunicación Tipo F",
        coreArgument: "La interconexión vertical entre plantas mediante transceptores ópticos 850nm testados elimina interferencias electromagnéticas y desacopla tierras.",
        suggestedSKUs: ["SFP-10G-SR-KIT", "ECS1528FP"],
        category: "FIBRA_SFP",
        vertical,
        archetype: arquetipo
      },
      {
        id: `fibra-2-${Date.now()}`,
        badge: "CERTIFICACIÓN OTDR",
        title: "Errores típicos en fusiones de fibra para redes locales: cómo certificar atenuaciones < 0.2 dB",
        targetAudience: "Técnicos de Fusión y Certificación de Fibra Óptica",
        coreArgument: "La suciedad en ferrulas y curvaturas excesivas en bandejas rack penalizan el presupuesto óptico provocando caídas intermitentes del enlace 10 Gbps.",
        suggestedSKUs: ["SFP-10G-SR-KIT"],
        category: "FIBRA_SFP",
        vertical,
        archetype: arquetipo
      },
      {
        id: `fibra-3-${Date.now()}`,
        badge: "POL / GPON",
        title: "Passive Optical LAN (POL) vs Cobre Tradicional: ahorro del 60% de espacio en patinillos de obra",
        targetAudience: "Ingenierías de Proyectos y Directores de Obra",
        coreArgument: "Llevar fibra monomodo hasta la habitación o puesto de trabajo reduce el peso del cableado y el consumo de climatización en armarios intermedios.",
        suggestedSKUs: ["SFP-10G-SR-KIT", "ESG510"],
        category: "FIBRA_SFP",
        vertical,
        archetype: arquetipo
      },
      {
        id: `fibra-4-${Date.now()}`,
        badge: "STOCK EN ESPAÑA",
        title: "Transceptores ópticos multimarca testados con reemplazo 24h desde Alcalá de Henares",
        targetAudience: "Jefes de Compras e Integradores de Red",
        coreArgument: "Evita retrasos de semanas en aduanas comprando transceptores con compatibilidad certificada con switches EnGenius, Cisco y MikroTik.",
        suggestedSKUs: ["SFP-10G-SR-KIT"],
        category: "FIBRA_SFP",
        vertical,
        archetype: arquetipo
      }
    ],
    ROUTERS_5G: [
      {
        id: `5g-1-${Date.now()}`,
        badge: "BACKUP WAN 2.5G",
        title: "Gateway de Seguridad con Doble WAN y Failover Automático: cero caídas en TPVs y oficinas",
        targetAudience: "Instaladores de Retail y Oficinas Descentralizadas",
        coreArgument: "La conmutación automática entre fibra corporativa y backup de alta velocidad asegura la continuidad de operaciones sin intervención del usuario.",
        suggestedSKUs: ["ESG510", "ECS1528FP"],
        category: "ROUTERS_5G",
        vertical,
        archetype: arquetipo
      },
      {
        id: `5g-2-${Date.now()}`,
        badge: "VPN SITE-TO-SITE",
        title: "Interconexión de sedes con VPN WireGuard/IPsec gestionada en Cloud sin licencias de software",
        targetAudience: "Administradores de Sistemas y Responsables IT",
        coreArgument: "Desplegar túneles cifrados de alto rendimiento entre sucursales en 2 clics desde EnGenius Cloud sin pagar renovaciones anuales de firewall.",
        suggestedSKUs: ["ESG510"],
        category: "ROUTERS_5G",
        vertical,
        archetype: arquetipo
      },
      {
        id: `5g-3-${Date.now()}`,
        badge: "ROUTING DE CAMPO",
        title: "Conectividad temporal en obras y eventos con routers y gateways de despliegue rápido",
        targetAudience: "Técnicos de Eventos e Infraestructuras Provisionales",
        coreArgument: "Configuración previa en laboratorio mediante código QR para que el instalador solo tenga que alimentar el equipo y empezar a transmitir.",
        suggestedSKUs: ["ESG510", "ECW526"],
        category: "ROUTERS_5G",
        vertical,
        archetype: arquetipo
      },
      {
        id: `5g-4-${Date.now()}`,
        badge: "SEGURIDAD DE BORDE",
        title: "Inspección de Tráfico y Filtrado de Contenidos a nivel de Gateway sin licencias por usuario",
        targetAudience: "Integradores de Servicios Gestionados de Seguridad",
        coreArgument: "Protección integral perimetral que mantiene el throughput Gigabit de la red sin costes sorpresa en la factura mensual del cliente.",
        suggestedSKUs: ["ESG510"],
        category: "ROUTERS_5G",
        vertical,
        archetype: arquetipo
      }
    ]
  };

  const selectedCategoryList = category === "ALL" 
    ? [
        baseLibrary.WIFI7[0],
        baseLibrary.POE_SWITCHING[0],
        baseLibrary.FIBRA_SFP[0],
        baseLibrary.ROUTERS_5G[0]
      ]
    : baseLibrary[category] || baseLibrary.WIFI7;

  return selectedCategoryList;
}
