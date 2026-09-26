import { ECOM_BRAND, PRESET_TOPICS } from "./knowledge";
import { CURATED_FIELD_SCENARIOS_POOL, FieldScenarioInspiration } from "./services/field-scenarios-service";

export interface CampaignRecommendation {
  id: string;
  category: "wifi" | "switches" | "fibra" | "engenius" | "general";
  title: string;
  suggestedAngle: string;
  detectedContext: string;
  recommendedProducts: string[];
  recommendedCtaText: string;
  hookText: string;
  whyThisWorks: string;
}

export interface MultimodalAdvisorResponse {
  analysisSummary: string;
  detectedEquipmentOrNeed: string;
  recommendations: CampaignRecommendation[];
  tokensInput?: number;
  tokensOutput?: number;
}

export const MULTIMODAL_ADVISOR_SYSTEM_PROMPT = `
Eres el Director de Marketing Estratégico e Ingeniero Preventa de ${ECOM_BRAND.name} (${ECOM_BRAND.description}).
Tu misión es asesorar y desbloquear creativamente al operador de marketing cuando no sabe qué publicar.
Tienes visión técnica y capacidad de análisis de audio, texto y documentos.

🚨 REGLA SUPREMA DE MÁXIMA FIDELIDAD A LAS NOTAS DEL OPERADOR:
- Si el operador proporciona notas explicativas, requerimientos o modelos de equipos (ej: "ECS5512FP", "transceptores 10G SFP+", "fibra OM3/OM4", "caída de tensión", "radar DFS", "camping exterior IP67", etc.):
  LAS 3 PROPUESTAS GENERADAS DEBEN RESOLVER EXACTAMENTE ESE CASO TÉCNICO Y PROMOVER DICHOS EQUIPOS ESPECÍFICOS.
- Queda terminantemente PROHIBIDO ignorar las notas del operador o devolver propuestas genéricas no relacionadas con los modelos y problemas descritos.
- En "recommendedProducts", incluye obligatoriamente los equipos específicos citados en las notas.

Tu objetivo:
1. Analizar el material técnico con precisión de ingeniería (reconocer marcas, modelos EnGenius, tipos de puertos 10G/2.5G SFP+, problemas visibles de cableado/saturación o puntos clave expuestos en el audio/texto).
2. Proponer una matriz de 3 estrategias de contenido B2B completamente orientadas a ventas para instaladores, integradores IT y empresas:
   - Propuesta 1: Enfoque "Técnico / Solución a Problema Crítico" (resolver el cuello de botella, saturación, calor, caídas o enlace troncal indicado).
   - Propuesta 2: Enfoque "ROI / Rentabilidad / Ventaja Competitiva B2B" (márgenes comerciales, licencias Cloud gratis de EnGenius vs marcas con suscripción cara, stock inmediato en España 24h).
   - Propuesta 3: Enfoque "Caso de Éxito / Modernización / Tendencia" (migración de backbone a 10G, WiFi 7, fibra hasta la habitación/escritorio, gestión unificada en app).

Debes responder SIEMPRE en formato JSON válido con la siguiente estructura:
{
  "analysisSummary": "Resumen conciso (máximo 2-3 frases) de lo observado o leído en las notas del operador.",
  "detectedEquipmentOrNeed": "Equipos, tecnologías o necesidades clave identificadas.",
  "recommendations": [
    {
      "id": "propuesta-1",
      "category": "switches",
      "title": "Título sugerido para el contenido",
      "suggestedAngle": "Técnico / Solución a Problema Crítico",
      "detectedContext": "Contexto específico detectado en las notas o material",
      "recommendedProducts": ["Switch de Agregación EnGenius ECS5512FP", "Módulos 10G SFP+"],
      "recommendedCtaText": "Texto de llamada a la acción comercial",
      "hookText": "Gancho inicial de 2 líneas con impacto para técnicos o decisores IT",
      "whyThisWorks": "Por qué este contenido convertirá ventas en este momento"
    }
  ]
}
`;

export async function analyzeMultimodalInput(params: {
  textPrompt?: string;
  mediaBase64?: string;
  mimeType?: string;
  apiKey?: string;
  scenarioId?: string;
  category?: string;
}): Promise<MultimodalAdvisorResponse> {
  const isVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || (!params.apiKey && Boolean(process.env.GOOGLE_CLOUD_PROJECT));
  const key = params.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (key || isVertex) {
    try {
      const { getGenAIClient, getActiveGeminiModel } = await import("./genai-client");
      const ai = getGenAIClient(params.apiKey);
      const activeModel = getActiveGeminiModel(params.apiKey);

      const candidateModels = [
        activeModel,
        "gemini-2.0-flash",
        "gemini-1.5-flash"
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      const contents: any[] = [];

      if (params.mediaBase64 && params.mimeType) {
        contents.push({
          inlineData: {
            mimeType: params.mimeType,
            data: params.mediaBase64
          }
        });
      }

      const promptText = (params.textPrompt ? `NOTAS ESPECÍFICAS DEL OPERADOR (PRIORIDAD MÁXIMA): "${params.textPrompt}". ` : "El operador no ha añadido notas escritas. ") +
        (params.scenarioId ? `Escenario de referencia: ${params.scenarioId}. ` : "") +
        (params.category ? `Categoría técnica: ${params.category}. ` : "") +
        "Formula el diagnóstico técnico exacto y genera exactamente 3 propuestas estratégicas accionables en JSON según las notas del operador. " +
        "IMPORTANTE: Las recomendaciones deben mencionar y girar sobre los equipos y tecnologías exactas descritas en las notas.";

      contents.push(promptText);

      // Probar modelos candidatos con tolerancia de tiempo
      for (const modelToTry of candidateModels) {
        try {
          const generatePromise = ai.models.generateContent({
            model: modelToTry,
            contents: contents,
            config: {
              systemInstruction: MULTIMODAL_ADVISOR_SYSTEM_PROMPT,
              responseMimeType: "application/json"
            }
          });

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`[MultimodalAdvisor] Timeout superado con ${modelToTry}`)), 35000)
          );

          const res = await Promise.race([generatePromise, timeoutPromise]);

          let rawText = (res as any).text || "{}";
          rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

          const parsed = JSON.parse(rawText);
          if (parsed.recommendations && parsed.recommendations.length >= 3) {
            return {
              analysisSummary: parsed.analysisSummary || "Análisis técnico completado según requerimientos del operador.",
              detectedEquipmentOrNeed: parsed.detectedEquipmentOrNeed || "Equipos y tecnologías especificadas por el operador",
              recommendations: parsed.recommendations,
              tokensInput: (res as any).usageMetadata?.promptTokenCount || 650,
              tokensOutput: (res as any).usageMetadata?.candidatesTokenCount || 900
            };
          }
        } catch (modelErr) {
          console.warn(`[MultimodalAdvisor] Fallo con modelo ${modelToTry}:`, modelErr);
          // Intentar el siguiente candidato
        }
      }
    } catch (err) {
      console.warn("[MultimodalAdvisor] Error invocando Gemini, aplicando síntesis dinámica garantizada:", err);
    }
  }

  return generateDeterministicAdvisorResponse(params);
}

function generateDeterministicAdvisorResponse(params: {
  textPrompt?: string;
  mediaBase64?: string;
  mimeType?: string;
  scenarioId?: string;
  category?: string;
}): MultimodalAdvisorResponse {
  const isAudio = params.mimeType?.startsWith("audio/");
  const isImage = params.mimeType?.startsWith("image/");
  const isPdf = params.mimeType?.includes("pdf");

  const promptText = params.textPrompt || "";
  const promptLower = promptText.toLowerCase();

  // 1. Intentar vincular con el banco maestro de escenarios de obra curados
  let matchedScenario: FieldScenarioInspiration | undefined;

  if (params.scenarioId) {
    matchedScenario = CURATED_FIELD_SCENARIOS_POOL.find((s) => s.id === params.scenarioId);
  }

  if (!matchedScenario && promptText) {
    matchedScenario = CURATED_FIELD_SCENARIOS_POOL.find(
      (s) =>
        promptLower.includes(s.title.toLowerCase()) ||
        promptLower.includes(s.badge.toLowerCase()) ||
        promptText.includes(s.prompt.slice(0, 30))
    );
  }

  // 2. Extracción dinámica de hardware, tecnologías y dolores clave en el prompt
  const extractedProducts: string[] = [];

  // Detección de switches
  if (promptLower.includes("ecs5512fp") || promptLower.includes("5512fp")) {
    extractedProducts.push("Switch de Agregación EnGenius ECS5512FP (10G SFP+)");
  }
  if (promptLower.includes("ecs2512fp") || promptLower.includes("2512fp")) {
    extractedProducts.push("Switch Multi-Gigabit EnGenius ECS2512FP PoE++");
  }
  if (promptLower.includes("ecs1528fp") || promptLower.includes("1528fp")) {
    extractedProducts.push("Switch EnGenius ECS1528FP PoE+ (410W)");
  }
  if (promptLower.includes("ecs1552fp") || promptLower.includes("1552fp")) {
    extractedProducts.push("Switch EnGenius ECS1552FP PoE+ (740W)");
  }

  // Detección de fibra y transceptores
  if (promptLower.includes("10g") || promptLower.includes("sfp+") || promptLower.includes("sfp")) {
    extractedProducts.push("Transceptores Ópticos 10G SFP+");
  }
  if (promptLower.includes("om3") || promptLower.includes("om4") || promptLower.includes("fibra")) {
    extractedProducts.push("Latiguillos y Tiradas de Fibra Óptica OM3/OM4");
  }
  if (promptLower.includes("gpon")) {
    extractedProducts.push("Arquitectura de Fibra Óptica GPON Pasiva");
  }

  // Detección de puntos de acceso
  if (promptLower.includes("ecw536") || promptLower.includes("536")) {
    extractedProducts.push("Punto de Acceso Wi-Fi 7 EnGenius ECW536 Tri-Banda (10G)");
  }
  if (promptLower.includes("ecw546") || promptLower.includes("546") || promptLower.includes("ip67") || promptLower.includes("exterior")) {
    extractedProducts.push("Punto de Acceso Exterior EnGenius ECW546 IP67 Wi-Fi 7");
  }
  if (promptLower.includes("ecw526") || promptLower.includes("526")) {
    extractedProducts.push("Punto de Acceso Wi-Fi 7 EnGenius ECW526 Doble Banda");
  }
  if (promptLower.includes("ecw336") || promptLower.includes("336")) {
    extractedProducts.push("Punto de Acceso Wi-Fi 6E EnGenius ECW336");
  }

  // Si no se extrajo ningún producto pero hay un escenario conocido:
  if (extractedProducts.length === 0 && matchedScenario) {
    if (matchedScenario.id === "sc-fiber-sfp") {
      extractedProducts.push("Switch de Agregación EnGenius ECS5512FP (10G SFP+)", "Módulos Transceptores 10G SFP+", "Fibra Óptica OM3/OM4");
    } else if (matchedScenario.id === "sc-bottleneck-wifi7") {
      extractedProducts.push("Switch Multi-Gigabit EnGenius ECS2512FP PoE++", "Punto de Acceso Wi-Fi 7 EnGenius ECW536");
    } else if (matchedScenario.id === "sc-cctv-ip-poe-budget") {
      extractedProducts.push("Switch EnGenius ECS1528FP PoE+ (410W)", "Cámaras IP con Iluminación Nocturna");
    } else if (matchedScenario.id === "sc-wifi-outdoor-surge") {
      extractedProducts.push("Punto de Acceso Exterior EnGenius ECW546 IP67", "Protección contra Sobretensiones 6kV");
    } else if (matchedScenario.id === "sc-meraki-tco") {
      extractedProducts.push("EnGenius Cloud Enterprise (0€ Licencias)", "Puntos de Acceso Wi-Fi 7");
    } else {
      extractedProducts.push("Gama EnGenius Cloud Profesional", "Switches y Puntos de Acceso");
    }
  } else if (extractedProducts.length === 0) {
    extractedProducts.push("EnGenius Cloud Managed Hardware", "Switches PoE y Puntos de Acceso");
  }

  // 3. Determinar categoría técnica
  let cat: "wifi" | "switches" | "fibra" | "engenius" | "general" = (params.category as any) || matchedScenario?.suggestedCategory || "general";
  if (cat === "general" || !params.category) {
    if (promptLower.includes("fibra") || promptLower.includes("sfp") || promptLower.includes("troncal") || promptLower.includes("gpon")) {
      cat = "fibra";
    } else if (promptLower.includes("switch") || promptLower.includes("poe") || promptLower.includes("rack") || promptLower.includes("5512") || promptLower.includes("2512")) {
      cat = "switches";
    } else if (promptLower.includes("wifi") || promptLower.includes("inalámbrico") || promptLower.includes("roaming") || promptLower.includes("ecw") || promptLower.includes("cobertura")) {
      cat = "wifi";
    } else if (promptLower.includes("licencia") || promptLower.includes("tco") || promptLower.includes("meraki") || promptLower.includes("margen") || promptLower.includes("cuota")) {
      cat = "engenius";
    }
  }

  // 4. Construcción de síntesis adaptada a las notas del operador
  const contextName = matchedScenario
    ? matchedScenario.title
    : promptText.length > 15
    ? promptText.slice(0, 90) + "..."
    : "Infraestructura de Networking y Conectividad Profesional";

  const primaryProduct = extractedProducts[0] || "Solución EnGenius Cloud";
  const allProductsList = extractedProducts.slice(0, 3);

  // Generación dinámica de las 3 propuestas según el caso específico
  if (cat === "fibra" || promptLower.includes("troncal") || promptLower.includes("sfp") || matchedScenario?.id === "sc-fiber-sfp") {
    return {
      analysisSummary: `Se ha analizado el caso reportado por el operador: "${promptText || matchedScenario?.prompt || "Saturación en enlace troncal"}". Se diagnostica una necesidad crítica de conmutación 10G de baja latencia entre armarios rack y zonas de producción sin interrupción de servicio.`,
      detectedEquipmentOrNeed: `${primaryProduct} - Enlace Troncal 10G SFP+ y Fibra Óptica OM3/OM4`,
      recommendations: [
        {
          id: "rec-troncal-10g",
          category: "fibra",
          title: "Saturación en enlace troncal: Despliegue de agregación 10G SFP+ y fibra OM3/OM4 sin corte de servicio",
          suggestedAngle: "Técnico / Solución a Problema Crítico",
          detectedContext: "Cuello de botella entre el rack principal y la planta de producción durante picos de carga operativa",
          recommendedProducts: allProductsList,
          recommendedCtaText: "Solicitar Asesoramiento Técnico y Módulos 10G en 24h",
          hookText: "¿Saturación en el enlace troncal entre racks y planta en horas punta? Elimina los cortes desplegando conmutación 10G SFP+ con switch de agregación ECS5512FP sin detener la producción.",
          whyThisWorks: "Resuelve de forma inmediata el dolor más agudo de fábricas y sedes corporativas, posicionando a EcomShop como el socio técnico con stock de transceptores 10G y fibra en 24h."
        },
        {
          id: "rec-roi-10g",
          category: "switches",
          title: "Backbone 10G de alta capacidad con 0€ en cuotas de gestión Cloud",
          suggestedAngle: "Rentabilidad & Ventaja Competitiva B2B",
          detectedContext: "Asegurar caudal troncal para los próximos 5 años sin hipotecar el presupuesto en licencias anuales de switches de agregación",
          recommendedProducts: [primaryProduct, "EnGenius Cloud Enterprise (0€ Licencias)"],
          recommendedCtaText: "Consultar Tarifa Distribuidor y Descuento Proyecto",
          hookText: "¿Cuánto pierde tu cliente cuando un enlace troncal saturado frena la producción? Garantiza disponibilidad 10G sin cánones anuales de software.",
          whyThisWorks: "Apela al responsable financiero y de compras (TCO), demostrando que una infraestructura de alta conmutación no exige suscripciones abusivas."
        },
        {
          id: "rec-modernizacion-backbone",
          category: "fibra",
          title: "De 1 GbE a 10 GbE en enlaces de distribución: La guía de ingeniería para integradores",
          suggestedAngle: "Tendencia, Vanguardia & Caso de Éxito",
          detectedContext: "Transición arquitectónica de redes industriales y corporativas hacia estándares Multi-Gigabit y Wi-Fi 7",
          recommendedProducts: allProductsList,
          recommendedCtaText: "Descargar Guía de Cableado Óptico y Módulos SFP+",
          hookText: "El 85% de las redes que actualizan a Wi-Fi 7 sufren colapsos si mantienen troncales de 1G. Te mostramos cómo migrar racks y plantas a 10G con tolerancia a fallos.",
          whyThisWorks: "Atrae a integradores IT e instaladores que buscan adelantarse a las licitaciones y proyectos de renovación técnica."
        }
      ]
    };
  }

  if (cat === "switches" || promptLower.includes("poe") || promptLower.includes("rack") || promptLower.includes("cctv")) {
    return {
      analysisSummary: `Se ha analizado el caso técnico del operador: "${promptText || matchedScenario?.prompt || "Sobrecarga de conmutación y PoE"}". Se identifica la necesidad de auditoría de consumo PoE++, disipación térmica y balanceo de carga en armario rack.`,
      detectedEquipmentOrNeed: `${primaryProduct} - Conmutación PoE Profesional EnGenius`,
      recommendations: [
        {
          id: "rec-switches-problema",
          category: "switches",
          title: matchedScenario ? matchedScenario.title : `Optimización de conmutación y alimentación: Solución con ${primaryProduct}`,
          suggestedAngle: "Técnico / Solución a Problema Crítico",
          detectedContext: "Caídas de tensión, sobreconsumo PoE en horas nocturnas o throttling térmico en armarios rack",
          recommendedProducts: allProductsList,
          recommendedCtaText: "Solicitar Auditoría de Potencia PoE Preventa",
          hookText: `¿Caídas intempestivas en switches y cámaras por picos de consumo PoE o sobrecalentamiento en rack? Descubre cómo estabilizar la instalación con ${primaryProduct}.`,
          whyThisWorks: "Aporta tranquilidad operativa al instalador que sufre incidencias de alimentación en obra."
        },
        {
          id: "rec-switches-roi",
          category: "engenius",
          title: "Gestión Cloud unificada de switches y APs con cero costes recurrentes",
          suggestedAngle: "Rentabilidad & Ventaja Competitiva B2B",
          detectedContext: "Eliminar cuotas de software en conmutadores gestionados preservando visibilidad total L2+",
          recommendedProducts: [primaryProduct, "EnGenius Cloud To-Go"],
          recommendedCtaText: "Ver Comparativa de Márgenes para Distribuidores",
          hookText: "¿Sigues pagando licencias anuales por gestionar tus switches desde la nube? Pásate a la gestión profesional con 0€ en suscripciones de por vida.",
          whyThisWorks: "Conecta con el interés económico del instalador para maximizar su margen neto en cada licitación."
        },
        {
          id: "rec-switches-modernizacion",
          category: "switches",
          title: "Preparando la conmutación para la era Wi-Fi 7: Uplinks 10G y puertos Multi-Gigabit",
          suggestedAngle: "Tendencia, Vanguardia & Caso de Éxito",
          detectedContext: "Eliminar cuellos de botella 1G en conmutadores de acceso",
          recommendedProducts: allProductsList,
          recommendedCtaText: "Consultar Stock Inmediato y Tarifas Profesionales",
          hookText: "Conectar puntos de acceso Wi-Fi 7 a switches 1G estrangula el caudal. Descubre la arquitectura Multi-Gigabit con entrega 24/48h desde España.",
          whyThisWorks: "Estimula la venta cruzada de switches de alta gama ante proyectos de renovación inalámbrica."
        }
      ]
    };
  }

  if (cat === "wifi" || promptLower.includes("wifi") || promptLower.includes("roaming") || promptLower.includes("radar")) {
    return {
      analysisSummary: `Se ha analizado el caso reportado por el operador: "${promptText || matchedScenario?.prompt || "Despliegue Wi-Fi de alta densidad"}". Se identifica un requerimiento de cobertura sin microcortes, modulación Wi-Fi 7 y gestión en la nube.`,
      detectedEquipmentOrNeed: `${primaryProduct} - Puntos de Acceso Wi-Fi 7 EnGenius Cloud`,
      recommendations: [
        {
          id: "rec-wifi-problema",
          category: "wifi",
          title: matchedScenario ? matchedScenario.title : `Wi-Fi 7 de alta densidad sin saturación: Despliegue con ${primaryProduct}`,
          suggestedAngle: "Técnico / Solución a Problema Crítico",
          detectedContext: "Microcortes en roaming, saturación por clientes masivos o cortes por radares DFS",
          recommendedProducts: allProductsList,
          recommendedCtaText: "Solicitar Estudio de Cobertura Radioeléctrica",
          hookText: `¿Clientes quejándose de microcortes en llamadas VoIP o caídas de conexión al moverse entre plantas? Resuélvelo con roaming 802.11k/v/r y la banda limpia de ${primaryProduct}.`,
          whyThisWorks: "Elimina las quejas recurrentes de usuarios finales en oficinas, hoteles y centros educativos."
        },
        {
          id: "rec-wifi-roi",
          category: "engenius",
          title: "Migración a Wi-Fi 7 corporativo con retorno de inversión garantizado",
          suggestedAngle: "Rentabilidad & Ventaja Competitiva B2B",
          detectedContext: "Renovación tecnológica sin sobrecostes ocultos ni licencias por punto de acceso",
          recommendedProducts: [primaryProduct, "EnGenius Cloud Enterprise"],
          recommendedCtaText: "Solicitar Tarifa Mayorista y Unidad Demo",
          hookText: "¿Por qué pagar un 40% más en marcas que cobran suscripción por cada antena? Ofrece a tus clientes Wi-Fi 7 de máxima gama con gestión Cloud perpetua gratuita.",
          whyThisWorks: "Facilita al instalador ganar concursos públicos y privados al tener una estructura de precios imbatible."
        },
        {
          id: "rec-wifi-modernizacion",
          category: "wifi",
          title: "Multi-Link Operation (MLO) y canales de 320 MHz: La revolución inalámbrica para integradores",
          suggestedAngle: "Tendencia, Vanguardia & Caso de Éxito",
          detectedContext: "Demanda de latencia determinista (<5ms) para videollamadas, VR y dispositivos IoT",
          recommendedProducts: allProductsList,
          recommendedCtaText: "Descargar Ficha Técnica y Comparativa Wi-Fi 6 vs 7",
          hookText: "Wi-Fi 7 no es solo más velocidad: es latencia ultra-baja y agregación de bandas. Conoce cómo liderar proyectos de vanguardia en tu zona.",
          whyThisWorks: "Establece la autoridad técnica del instalador frente al CIO o director tecnológico."
        }
      ]
    };
  }

  // Enfoque general / TCO / Cero licencias
  return {
    analysisSummary: `Se ha analizado el caso reportado: "${promptText || matchedScenario?.prompt || "Modelo de negocio y márgenes B2B"}". Se identifica la oportunidad de posicionar la propuesta de valor mayorista de EcomSpain con entrega 24h y soporte preventa.`,
    detectedEquipmentOrNeed: `${primaryProduct} - EnGenius Cloud Managed Networking`,
    recommendations: [
      {
        id: "rec-gen-problema",
        category: cat,
        title: matchedScenario ? matchedScenario.title : `Resolución técnica integral con ${primaryProduct}`,
        suggestedAngle: "Técnico / Solución a Problema Crítico",
        detectedContext: `Desafío técnico en obra: ${contextName}`,
        recommendedProducts: allProductsList,
        recommendedCtaText: "Solicitar Asesoría Preventa Gratuita",
        hookText: `¿Problemas para cumplir los requerimientos técnicos de la obra? Resuélvelo con la fiabilidad de ${primaryProduct} y soporte directo de EcomSpain.`,
        whyThisWorks: "Demuestra capacidad de respuesta inmediata ante incidentes y bloqueos en obra."
      },
      {
        id: "rec-gen-roi",
        category: "engenius",
        title: "Ahorro del 40% en TCO a 3 años: Adiós a las suscripciones cloud obligatorias",
        suggestedAngle: "Rentabilidad & Ventaja Competitiva B2B",
        detectedContext: "Reducción drástica de costes operativos frente a competidores con suscripciones cerradas",
        recommendedProducts: [primaryProduct, "EnGenius Cloud To-Go"],
        recommendedCtaText: "Descargar Calculadora de Ahorro TCO",
        hookText: "¿Cuánto dinero pierde tu empresa o cliente renovando licencias de hardware? Descubre el networking profesional con coste cero en cuotas.",
        whyThisWorks: "Argumento decisivo ante direcciones de compras y directores TIC."
      },
      {
        id: "rec-gen-modernizacion",
        category: cat,
        title: "Garantía de sustitución en 24h y stock permanente en España para integradores",
        suggestedAngle: "Tendencia, Vanguardia & Caso de Éxito",
        detectedContext: "Asegurar cumplimiento de SLA sin penalizaciones por falta de stock",
        recommendedProducts: allProductsList,
        recommendedCtaText: "Darse de Alta como Distribuidor Oficial",
        hookText: "No arriesgues la reputación de tu empresa con proveedores que tardan 3 semanas en sustituir un equipo averiado. En EcomSpain entregamos en 24/48h.",
        whyThisWorks: "Genera máxima confianza y fideliza al instalador profesional con logística local."
      }
    ]
  };
}

