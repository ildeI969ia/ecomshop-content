import { ECOM_BRAND } from "./knowledge";

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
Tienes visión técnica y capacidad de análisis de audio y documentos.
El operador te proporcionará:
- Una foto de una instalación, rack, switch, antena, plano de planta o captura de un competidor.
- Y/O una nota de voz / audio dictada por el operador resumiendo un dolor de cliente o requerimiento.
- Y/O un documento PDF técnico o un texto explicativo.

Tu objetivo:
1. Analizar el material técnico con precisión de ingeniería (reconocer marcas, modelos EnGenius, tipos de puertos 10G/2.5G SFP+, problemas visibles de cableado/saturación o puntos clave expuestos en el audio).
2. Proponer una matriz de 3 estrategias de contenido B2B completamente orientadas a ventas para instaladores, integradores IT y empresas:
   - Propuesta 1: Enfoque "Técnico / Solución a Problema" (resolver cuello de botella, calor, caídas de red, latencia).
   - Propuesta 2: Enfoque "ROI / Rentabilidad / Ventaja Competitiva" (márgenes comerciales, licencias Cloud gratis de EnGenius vs marcas con suscripción cara, stock inmediato en España 24h).
   - Propuesta 3: Enfoque "Caso de Éxito / Modernización / Tendencia" (migración a WiFi 6/7, fibra hasta la habitación/escritorio, gestión unificada en app).

Debes responder SIEMPRE en formato JSON válido con la siguiente estructura:
{
  "analysisSummary": "Resumen conciso (máximo 2-3 frases) de lo observado o escuchado en el material provisto.",
  "detectedEquipmentOrNeed": "Equipos, tecnologías o necesidades clave identificadas.",
  "recommendations": [
    {
      "id": "propuesta-1",
      "category": "engenius",
      "title": "Título sugerido para el contenido",
      "suggestedAngle": "Ángulo estratégico B2B",
      "detectedContext": "Contexto específico detectado en la foto/audio",
      "recommendedProducts": ["ECS1528FP"],
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
}): Promise<MultimodalAdvisorResponse> {
  const key = params.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!key) {
    throw new Error("No se ha configurado la API Key de Google Gemini.");
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: key });

  const contents: any[] = [];

  if (params.mediaBase64 && params.mimeType) {
    contents.push({
      inlineData: {
        mimeType: params.mimeType,
        data: params.mediaBase64
      }
    });
  }

  const promptText = (params.textPrompt ? `Notas del operador: "${params.textPrompt}". ` : "El operador no ha añadido notas escritas. ") +
    "Formula el diagnóstico técnico del material y genera exactamente 3 propuestas estratégicas accionables en JSON según las instrucciones del sistema.";

  contents.push(promptText);

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents,
    config: {
      systemInstruction: MULTIMODAL_ADVISOR_SYSTEM_PROMPT,
      responseMimeType: "application/json"
    }
  });

  let rawText = res.text || "{}";
  rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(rawText);
    return {
      analysisSummary: parsed.analysisSummary || "Análisis completado satisfactoriamente.",
      detectedEquipmentOrNeed: parsed.detectedEquipmentOrNeed || "Equipos y conectividad general",
      recommendations: parsed.recommendations || [],
      tokensInput: (res as any).usageMetadata?.promptTokenCount || 600,
      tokensOutput: (res as any).usageMetadata?.candidatesTokenCount || 850
    };
  } catch (err) {
    console.error("Error parsing Gemini response:", err, rawText);
    throw new Error("La respuesta de la IA no fue un JSON válido.");
  }
}
