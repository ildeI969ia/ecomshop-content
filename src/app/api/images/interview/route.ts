import { NextResponse } from "next/server";
import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";

interface QuestionOption {
  id: string;
  label: string;
  detail: string;
}

interface InterviewQuestion {
  id: string;
  question: string;
  options: QuestionOption[];
}

export async function POST(req: Request) {
  try {
    const { mode, userIdea, answers, baseImage, apiKey } = await req.json();
    const isVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || (!apiKey && Boolean(process.env.GOOGLE_CLOUD_PROJECT));
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // MODO 1: INTERROGAR -> Generar preguntas contextuales
    if (mode === "interrogate") {
      if (key || isVertex) {
        try {
          const ai = getGenAIClient(apiKey);
          const activeModel = getActiveGeminiModel(apiKey);

          const promptParts: any[] = [];
          if (baseImage) {
            const match = baseImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            promptParts.push({
              inlineData: {
                mimeType: match ? match[1] : "image/jpeg",
                data: match ? match[2] : baseImage
              }
            });
          }

          promptParts.push({
            text: `Eres un Director de Arte y Fotógrafo B2B especializado en Telecomunicaciones, Redes Empresariales y Hardware (Switches EnGenius, Routers, Racks, Wi-Fi 7, Fibra Óptica).
El usuario quiere generar una imagen con esta idea o intención: "${userIdea || "Infraestructura de red profesional"}".
Genera exactamente 3 preguntas con 3-4 opciones cada una para interrogar al usuario y definir la toma perfecta (por ejemplo: atmósfera y estilo, plano y ángulo, y elemento de hardware o acción).
Devuelve ÚNICAMENTE un JSON válido con este formato:
{
  "questions": [
    {
      "id": "ambience",
      "question": "¿Qué atmósfera y entorno buscas?",
      "options": [
        { "id": "opt1", "label": "Centro de Datos Hi-Tech", "detail": "Luces LED cian/azul, suelo técnico, racks impecables" },
        { "id": "opt2", "label": "Oficina Corporativa Abierta", "detail": "Luz natural, techos acústicos modernos, entorno limpio" }
      ]
    }
  ]
}`
          });

          const res = await ai.models.generateContent({
            model: activeModel,
            contents: [{ role: "user", parts: promptParts }],
            config: { responseMimeType: "application/json" }
          });

          const rawText = res.text?.trim();
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return NextResponse.json({ success: true, questions: parsed.questions });
          }
        } catch (err: any) {
          console.warn("Error en Gemini interview interrogation:", err?.message);
        }
      }

      // Fallback predeterminado de preguntas de interrogación
      const defaultQuestions: InterviewQuestion[] = [
        {
          id: "scenario",
          question: "¿En qué entorno o escenario debe ubicarse la imagen?",
          options: [
            { id: "rack_dc", label: "Centro de Datos / Rack 42U", detail: "Servidores en hilera, luces LED de actividad, cableado estructurado perfecto" },
            { id: "corp_office", label: "Oficina Corporativa Minimalista", detail: "Techo acústico, diseño arquitectónico nórdico, luz natural, APs sutiles" },
            { id: "field_tech", label: "Trabajo de Campo Telecom", detail: "Técnico cualificado fusionando fibra o certificando tomas de red" },
            { id: "topology_abstract", label: "Composición 3D Tecnológica", detail: "Visualización isométrica abstracta de enlaces de red y cloud" }
          ]
        },
        {
          id: "shot_type",
          question: "¿Qué tipo de encuadre o perspectiva fotográfica prefieres?",
          options: [
            { id: "macro_ports", label: "Primer Plano Macro / Detalle", detail: "Enfoque crítico en puertos RJ45/SFP+, latiguillos y LEDs brillantes" },
            { id: "medium_angle", label: "Plano Medio Profesional (Ángulo Holandés)", detail: "Vista diagonal dinámica mostrando profundidad de bastidores" },
            { id: "wide_room", label: "Plano General / Sala Completa", detail: "Perspectiva amplia de la instalación transmitiendo escala y orden" }
          ]
        },
        {
          id: "lighting_style",
          question: "¿Qué iluminación y tono visual debe transmitir?",
          options: [
            { id: "cyber_blue", label: "Ciberseguridad y Alta Tecnología", detail: "Contrastes profundos, tonos azul eléctrico, turquesa y violeta" },
            { id: "clean_enterprise", label: "Editorial Corporativo Limpio", detail: "Blanco puro, luz neutra diurna 5500K, colores naturales sin saturar" },
            { id: "industrial_warm", label: "Industrial de Precisión", detail: "Luz de trabajo focalizada tipo linterna técnica de precisión" }
          ]
        }
      ];

      return NextResponse.json({ success: true, questions: defaultQuestions });
    }

    // MODO 2: SINTETIZAR -> Compilar prompt final a partir de las respuestas
    if (mode === "synthesize") {
      if (key || isVertex) {
        try {
          const ai = getGenAIClient(apiKey);
          const activeModel = getActiveGeminiModel(apiKey);

          const promptParts: any[] = [];
          if (baseImage) {
            const match = baseImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            promptParts.push({
              inlineData: {
                mimeType: match ? match[1] : "image/jpeg",
                data: match ? match[2] : baseImage
              }
            });
          }

          promptParts.push({
            text: `Eres el Director de Arte de Imagen B2B para Telecomunicaciones.
La idea original del usuario es: "${userIdea || "Infraestructura de red empresarial"}".
Las respuestas seleccionadas en el interrogatorio son:
${JSON.stringify(answers, null, 2)}

Genera un prompt fotográfico hiper-detallado y profesional en INGLÉS optimizado para Google Imagen 3 y Midjourney. Incluye tipo de lente (e.g. 50mm f/1.8, 85mm macro), condiciones de luz de estudio, textura de los materiales (chapa de acero anodizado, conectores dorados), detalles de iluminación de estado y fotorrealismo cinematográfico 8K.
Devuelve ÚNICAMENTE un JSON:
{
  "suggestedPrompt": "...el prompt completo en inglés...",
  "recommendedAspectRatio": "16:9",
  "technicalNotes": "Breve resumen en español de los detalles fotográficos aplicados"
}`
          });

          const res = await ai.models.generateContent({
            model: activeModel,
            contents: [{ role: "user", parts: promptParts }],
            config: { responseMimeType: "application/json" }
          });

          const rawText = res.text?.trim();
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return NextResponse.json({ success: true, data: parsed });
          }
        } catch (err: any) {
          console.warn("Error en Gemini prompt synthesis:", err?.message);
        }
      }

      // Fallback de síntesis de prompt en inglés
      const partsSummary = Object.values(answers || {}).join(", ");
      const synthesized = `High-end enterprise telecommunications infrastructure, professional editorial photography of ${userIdea || "enterprise network switches and fiber cables"}, ${partsSummary || "clean server room, glowing LED indicators, organized patch cords"}, shot on Sony A7R V with 35mm f/1.8 lens, natural corporate studio lighting, ultra-sharp 8k, photorealistic architectural detail.`;

      return NextResponse.json({
        success: true,
        data: {
          suggestedPrompt: synthesized,
          recommendedAspectRatio: "16:9",
          technicalNotes: "Compilado con especificaciones técnicas B2B y lente de 35mm f/1.8."
        }
      });
    }

    return NextResponse.json({ error: "Modo no válido" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in /api/images/interview:", error);
    return NextResponse.json({ error: error.message || "Error en el agente interrogador" }, { status: 500 });
  }
}
