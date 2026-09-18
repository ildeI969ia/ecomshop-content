import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";
import { NotebookGroundingService } from "@/lib/services/notebook-grounding";
import {
  ArticleOutline,
  ArticleOutlineSchema,
  ArticleOutlineSection
} from "@/lib/types/article-outline";
import { resolveEcomProductUrl } from "./internal-linking-engine";

export const MASTER_NOTEBOOK_ID = "6ae5b7bb-ab27-4541-80cc-6127730fd01b";

/**
 * Generador de Outlines Técnicos Interactivos para EcomShop (The Junia Engine).
 * Consulta el NotebookLM corporativo y aprovecha la intención de búsqueda
 * de instaladores e integradores IT.
 */
export async function generateArticleOutline(
  topicOrProduct: string,
  targetAudience = "Instaladores de Telecomunicaciones e Integradores IT",
  vertical = "EMPRESAS_OFICINAS",
  apiKeyOverride?: string
): Promise<ArticleOutline> {
  const notebookService = new NotebookGroundingService();
  const notebookData = await notebookService.queryNotebookContext(
    `${topicOrProduct} ${vertical} EnGenius EcomShop`,
    6
  );

  const sourcesContext = notebookData.matchedChunks
    .map((c) => `[${c.type.toUpperCase()}] ${c.title}: ${c.content}`)
    .join("\n");

  const prompt = `
Eres el Ingeniero Jefe de Preventa y Arquitecto Editorial de EcomShop (EcomSpain).
Tu objetivo es diseñar un OUTLINE ESTRUCTURADO Y TÉCNICO para un artículo de ingeniería de 1.500 - 2.500 palabras,
enfocado en resolver dudas críticas de obra, diseño de red y costes de infraestructura.

TEMA / PRODUCTO: "${topicOrProduct}"
AUDIENCIA OBJETIVO: "${targetAudience}"
SECTOR / VERTICAL: "${vertical}"

CONOCIMIENTO TÉCNICO OFICIAL VERIFICADO (NotebookLM notebooks/${MASTER_NOTEBOOK_ID}):
${sourcesContext || "Catálogo de conectividad empresarial EnGenius Cloud, switches PoE++ Multi-Gigabit y enlaces 10G SFP+."}

DIRECTRICES ARQUITECTÓNICAS OBLIGATORIAS:
1. RIGOR DE INGENIERÍA: Cero texto plano publicitario o introducciones vacías como "En la era digital". Estructura con H2s de fondo técnico (cuellos de botella 1GbE vs 2.5GbE, disipación y PoE budget, atenuación y roaming con MLO).
2. DIVERSIDAD DE CONTENIDO OBLIGATORIA:
   - Al menos 1 sección con contentType: "COMPARISON_TABLE" (comparativa técnica o de TCO).
   - Al menos 1 sección con contentType: "INSTALLER_CALLOUT" (advertencia técnica crítica de campo / Tip del Instalador).
   - Al menos 1 sección con contentType: "TOPOLOGY_DIAGRAM" (diagrama esquemático de arquitectura de red).
   - 1 sección final con contentType: "FAQ" (preguntas técnicas frecuentes en obra).
   - El resto de secciones con contentType: "TEXT".
3. POLÍTICA DE ENLACES INTERNOS:
   - Para las secciones que traten sobre hardware específico (ej: APs Wi-Fi 7, switches PoE o transceptores), indica en 'suggestedProductLink' el SKU exacto (ej: ECW536, ECW526, ECS2512FP, ECS1528FP, ESG610, SFP-10G-SR).
4. BLACKLIST DE HARDWARE HEREDADO:
   - Prohibido terminantemente mencionar "Fit", "FitController" o controladores locales descatalogados.
5. METADATOS:
   - slug limpio en formato kebab-case.
   - metaDescription de 140-155 caracteres con gancho para instaladores.

ESTRUCTURA DE RESPUESTA REQUERIDA (JSON ESTRICTO):
{
  "title": "Titular técnico de alto impacto",
  "slug": "titular-tecnico-de-alto-impacto",
  "metaDescription": "Resumen técnico directo para el snippet de Google...",
  "targetAudience": "${targetAudience}",
  "sections": [
    {
      "id": "sec-1",
      "level": "H2",
      "title": "Título de la sección",
      "focusKeywords": ["keyword1", "keyword2"],
      "keyTakeaway": "Conclusión de ingeniería en una frase",
      "contentType": "TEXT",
      "suggestedProductLink": "ECW536"
    }
  ]
}
`;

  try {
    const client = getGenAIClient(apiKeyOverride);
    const model = getActiveGeminiModel(apiKeyOverride);

    // Intentar primero con Search Grounding para sintonizar intención de búsqueda de instaladores
    let rawResponse = "";
    try {
      const responseWithGrounding = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.2
        }
      });
      rawResponse = responseWithGrounding.text || "";
    } catch (groundingErr) {
      // Fallback a generación sin tool si el entorno o API key bloquea googleSearch
      const fallbackResponse = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });
      rawResponse = fallbackResponse.text || "";
    }

    const cleanJson = rawResponse
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanJson);
    
    // Asignar enlaces canónicos reales a los productos sugeridos
    if (parsed.sections && Array.isArray(parsed.sections)) {
      parsed.sections = parsed.sections.map((sec: ArticleOutlineSection, idx: number) => {
        const link = sec.suggestedProductLink
          ? resolveEcomProductUrl(sec.suggestedProductLink) || sec.suggestedProductLink
          : undefined;
        return {
          ...sec,
          id: sec.id || `sec-${idx + 1}`,
          suggestedProductLink: link
        };
      });
    }

    const validated = ArticleOutlineSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
    console.warn("[OutlineGenerator] Validación Zod falló, aplicando fallback determinista:", validated.error);
  } catch (err) {
    console.warn("[OutlineGenerator] Excepción en llamada a Gemini, aplicando fallback determinista:", err);
  }

  return generateDeterministicOutlineFallback(topicOrProduct, targetAudience, vertical);
}

/**
 * Fallback de alta fidelidad técnica ante fallos de conexión o límites de API
 */
export function generateDeterministicOutlineFallback(
  topicOrProduct: string,
  targetAudience: string,
  vertical: string
): ArticleOutline {
  const isWifi7 = /wifi\s*7|ecw|inal[aá]mbric|ap\b/i.test(topicOrProduct);
  const isSwitch = /switch|poe|multi-gigabit|ecs/i.test(topicOrProduct);

  const cleanTopic = topicOrProduct.trim();
  const slug = cleanTopic
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (isWifi7) {
    return {
      title: `${cleanTopic}: Guía de Ingeniería, Presupuesto PoE y Conmutación Multi-Gigabit`,
      slug: slug || "guia-ingenieria-wifi-7-despliegue-profesional",
      metaDescription: `Criterios técnicos para instalar Wi-Fi 7 sin cuellos de botella: modulación 4096-QAM, enlaces 2.5G/10G, PoE 802.3bt y gestión EnGenius Cloud sin licencias.`,
      targetAudience,
      sections: [
        {
          id: "sec-1",
          level: "H2",
          title: "1. El Salto Físico a Wi-Fi 7: 4096-QAM, Canales de 320 MHz y Reducción de Latencia MLO",
          focusKeywords: ["Wi-Fi 7", "4096-QAM", "Multi-Link Operation", "latencia en roaming"],
          keyTakeaway: "Wi-Fi 7 multiplica el caudal pero exige canalizaciones limpias y balanceo de bandas para exprimir la banda de 6 GHz.",
          contentType: "TEXT",
          suggestedProductLink: "https://www.ecomshop.es/engenius-ecw536"
        },
        {
          id: "sec-2",
          level: "H2",
          title: "2. El Cuello de Botella Oculto: Por Qué un AP Wi-Fi 7 se Ahoga en un Puerto GbE Convencional",
          focusKeywords: ["puerto 2.5GbE", "enlaces 10G SFP+", "conmutación multi-gigabit", "estrangulamiento de enlace"],
          keyTakeaway: "Conectar puntos de acceso Wi-Fi 7 a puertos 1 GbE colapsa el rendimiento; es indispensable switching 2.5G/10G.",
          contentType: "TOPOLOGY_DIAGRAM",
          suggestedProductLink: "https://www.ecomshop.es/engenius-ecs2512fp"
        },
        {
          id: "sec-3",
          level: "H2",
          title: "3. Tabla de Comparativa Técnica: Gamas Wi-Fi 7 EnGenius Cloud para Proyectos Corporativos",
          focusKeywords: ["ECW536", "ECW526", "ECW546", "comparativa wifi 7"],
          keyTakeaway: "Elegir entre Tri-Band y Dual-Band según densidad de clientes, entorno interior o exterior IP67.",
          contentType: "COMPARISON_TABLE",
          suggestedProductLink: "https://www.ecomshop.es/engenius-cloud"
        },
        {
          id: "sec-4",
          level: "H3",
          title: "4. Tip del Instalador: Cálculo del Presupuesto PoE 802.3bt y Disipación Térmica en Racks",
          focusKeywords: ["PoE++ 802.3bt", "PoE budget", "calentamiento de cableado", "caída de tensión"],
          keyTakeaway: "Un AP Wi-Fi 7 de 4 cadenas requiere hasta 30-45W; verificar la clase de PoE del switch para evitar reinicios por potencia insuficiente.",
          contentType: "INSTALLER_CALLOUT",
          suggestedProductLink: "https://www.ecomshop.es/guias-poe"
        },
        {
          id: "sec-5",
          level: "H2",
          title: "5. Aprovisionamiento Cloud Zero-Touch y Sin Licencias Recurrentes",
          focusKeywords: ["EnGenius Cloud", "licencias gratis", "TCO", "soporte preventa de ingeniería"],
          keyTakeaway: "EnGenius Cloud elimina suscripciones anuales obligatorias manteniendo gestión multi-tenant profesional.",
          contentType: "TEXT",
          suggestedProductLink: "https://www.ecomshop.es/soporte-preventa"
        },
        {
          id: "sec-6",
          level: "H2",
          title: "6. Preguntas Frecuentes Técnicas en Obra sobre Wi-Fi 7",
          focusKeywords: ["compatibilidad Cat5e", "alcance 6GHz", "penetración paredes"],
          keyTakeaway: "Respuestas directas a las dudas habituales durante el replanteo y la certificación de la instalación.",
          contentType: "FAQ"
        }
      ]
    };
  }

  // Fallback general para conmutación / redes B2B
  return {
    title: `${cleanTopic}: Criterios de Selección, Conmutación Troncal y Despliegue B2B`,
    slug: slug || "criterios-seleccion-conmutacion-redes-b2b",
    metaDescription: `Análisis técnico de arquitectura de red para ${cleanTopic}: puertos de agregación 10G, presupuesto PoE, fiabilidad en obra y soporte técnico en España.`,
    targetAudience,
    sections: [
      {
        id: "sec-1",
        level: "H2",
        title: `1. Requisitos de Infraestructura Física para Proyectos en ${vertical}`,
        focusKeywords: ["infraestructura de red", "estándares IEEE", "ancho de banda troncal"],
        keyTakeaway: "Dimensionar la red atendiendo al crecimiento de tráfico y la densidad de dispositivos conectados.",
        contentType: "TEXT",
        suggestedProductLink: "https://www.ecomshop.es/engenius-ecs1528fp"
      },
      {
        id: "sec-2",
        level: "H2",
        title: "2. Topología de Red Recomendada: Capa de Acceso, Distribución y Uplinks 10G",
        focusKeywords: ["topología estrella", "uplink 10G SFP+", "troncal de fibra", "agregación"],
        keyTakeaway: "Separar tráfico de datos y videovigilancia mediante VLANs y uplinks de 10 Gbps para eliminar cuellos de botella.",
        contentType: "TOPOLOGY_DIAGRAM",
        suggestedProductLink: "https://www.ecomshop.es/transceptores-sfp-10g"
      },
      {
        id: "sec-3",
        level: "H2",
        title: "3. Tabla Comparativa de Modelos y Especificaciones de Conmutación",
        focusKeywords: ["ECS2512FP", "ECS1528FP", "presupuesto PoE", "capacidad de conmutación"],
        keyTakeaway: "Comparación de puertos, PoE disipada y capacidad de conmutación sin bloqueo.",
        contentType: "COMPARISON_TABLE",
        suggestedProductLink: "https://www.ecomshop.es/engenius-ecs2512fp"
      },
      {
        id: "sec-4",
        level: "H3",
        title: "4. Tip del Instalador: Prevención de Bucles con STP y Protección Contra Sobretensiones",
        focusKeywords: ["Spanning Tree RSTP", "protección contra sobretensiones", "latiguillos blindados"],
        keyTakeaway: "Configurar correctamente BPDU Guard y verificar toma de tierra del rack para evitar daños en puertos.",
        contentType: "INSTALLER_CALLOUT",
        suggestedProductLink: "https://www.ecomshop.es/garantia-ecomspain"
      },
      {
        id: "sec-5",
        level: "H2",
        title: "5. Preguntas Frecuentes Técnicas de Instalación",
        focusKeywords: ["certificación de cableado", "garantía 24h", "asistencia técnica"],
        keyTakeaway: "Puntos clave de verificación antes de la entrega y firma del acta de recepción de obra.",
        contentType: "FAQ"
      }
    ]
  };
}
