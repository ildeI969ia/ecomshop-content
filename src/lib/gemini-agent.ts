import { ECOM_BRAND, PRESET_TOPICS } from "./knowledge";
import { ContentOutput, GenerateRequest } from "./schema";

export interface StrategicAngle {
  id: string;
  type: "roi" | "performance" | "operational";
  title: string;
  headline: string;
  hook: string;
  coreArgument: string;
  recommendedCta: string;
}

export const STRATEGIC_AGENT_SYSTEM_PROMPT = `
Eres el Ingeniero Jefe de Preventa y Estratega de Crecimiento B2B de ${ECOM_BRAND.name} (${ECOM_BRAND.description}).
Tu público objetivo son integradores de sistemas IT, instaladores de telecomunicaciones, distribuidores y responsables de infraestructuras de red.

Tus directrices estratégicas inquebrantables son:
1. Rigor de Ingeniería: Habla el lenguaje del técnico (estándares IEEE 802.11be/ax, modulación 4096-QAM, presupuestos PoE 802.3bt, enlaces uplink 10G SFP+, VLANs, Spanning Tree).
2. Foco en Dolor Real: Evita retórica publicitaria genérica de IA (prohibido decir "en el mundo digital actual", "en la era de la tecnología"). Enfócate en problemas de obra: cortes de servicio, quejas de clientes por saturación WiFi, sobrecostes de licencias recurrentes anuales y tiempo invertido en configuraciones.
3. Propuesta de Valor de EcomShop: Mayorista con stock permanente en España, envíos en 24h, precios especiales para profesionales y soporte preventa de ingeniería antes de comprar.
4. Especialidad EnGenius Networks: Destaca el aprovisionamiento Cloud o FitController sin costes ocultos de suscripción anual obligatoria.
`;

export async function generateStrategicAngles(
  topicTitle: string,
  category: string,
  apiKey?: string
): Promise<StrategicAngle[]> {
  const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (key) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: key });

      const prompt = `
Tema: "${topicTitle}"
Categoría: "${category}"

Genera 3 ángulos editoriales y estratégicos B2B completamente distintos para enfocar esta campaña hacia instaladores e integradores IT:
1. "roi": Enfocado en ahorro económico, márgenes para el instalador y 0€ en licencias ocultas.
2. "performance": Enfocado en especificaciones técnicas de vanguardia, latencia mínima, WiFi 7, enlaces 10G y fiabilidad extrema.
3. "operational": Enfocado en rapidez de despliegue, aprovisionamiento cloud/híbrido en minutos y reducción drástica de incidencias de soporte.

Responde ÚNICAMENTE en JSON con esta estructura:
[
  {
    "id": "roi",
    "type": "roi",
    "title": "Nombre corto del ángulo",
    "headline": "Titular de impacto",
    "hook": "Gancho inicial de 2 líneas para instaladores",
    "coreArgument": "Argumento técnico principal",
    "recommendedCta": "Llamada a la acción recomendada"
  },
  {
    "id": "performance",
    "type": "performance",
    "title": "Nombre corto del ángulo",
    "headline": "Titular de impacto",
    "hook": "Gancho inicial de 2 líneas para instaladores",
    "coreArgument": "Argumento técnico principal",
    "recommendedCta": "Llamada a la acción recomendada"
  },
  {
    "id": "operational",
    "type": "operational",
    "title": "Nombre corto del ángulo",
    "headline": "Titular de impacto",
    "hook": "Gancho inicial de 2 líneas para instaladores",
    "coreArgument": "Argumento técnico principal",
    "recommendedCta": "Llamada a la acción recomendada"
  }
]
`;

      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: STRATEGIC_AGENT_SYSTEM_PROMPT,
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(res.text || "[]");
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed as StrategicAngle[];
      }
    } catch (err) {
      console.warn("Fallo en generación de ángulos con Gemini API, usando biblioteca estratégica:", err);
    }
  }

  // Ángulos estratégicos de respaldo
  return [
    {
      id: "roi",
      type: "roi",
      title: "Enfoque Rentabilidad & Cero Licencias",
      headline: "¿Por qué seguir pagando suscripciones anuales en cada punto de acceso?",
      hook: "El modelo de licencias cloud obligatorio está asfixiando los márgenes de los instaladores. Te mostramos cómo desplegar una infraestructura corporativa con coste cero en licencias recurrentes.",
      coreArgument: "Ahorro directo de hasta un 40% en el coste total de propiedad (TCO) a 3 años mediante arquitecturas EnGenius Cloud o FitController on-premise.",
      recommendedCta: "Solicitar tarifa de instalador / Descuento por volumen"
    },
    {
      id: "performance",
      type: "performance",
      title: "Enfoque Rendimiento Extremo & WiFi 7",
      headline: "Multi-Link Operation y enlaces 10G: La red que no se satura nunca",
      hook: "¿Clientes quejándose de micro-cortes en videollamadas y saturación en horas punta? Ha llegado el momento de dar el salto al espectro limpio de 6 GHz y canales de 320 MHz.",
      coreArgument: "Despliegue con modulación 4096-QAM y switches PoE++ Multi-Gigabit para eliminar cuellos de botella en entornos de más de 100 clientes por celda.",
      recommendedCta: "Pedir unidad demo para test en laboratorio"
    },
    {
      id: "operational",
      type: "operational",
      title: "Enfoque Despliegue Rápido & Menos Soporte",
      headline: "Aprovisiona 30 APs en 5 minutos con código QR y olvídate de incidencias",
      hook: "El mayor coste de un integrador no es el hardware, son las visitas post-instalación para resolver configuraciones. Conoce el aprovisionamiento inteligente.",
      coreArgument: "Diagnóstico remoto de cableado, auto-reinicio PoE de equipos colgados y mapa de topología en tiempo real sin necesidad de desplazarse a la sede del cliente.",
      recommendedCta: "Descargar documentación técnica / Caso de éxito"
    }
  ];
}
