import { getActiveGeminiModel, getGenAIClient } from "@/lib/genai-client";
import { resolveBaseImageToData } from "@/lib/image-generator";
import {
  ImageCreativeRecommendationSchema,
  ImageIntentAnalysisSchema,
  ImageIntentInputSchema,
  ImagePromptResultSchema,
  type ImageIntentAnalysis,
  type ImageIntentInput,
} from "@/lib/types/image-intelligence";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function buildParts(text: string, baseImage?: string): Promise<GeminiPart[]> {
  return resolveBaseImageToData(baseImage).then((imageData) => {
    const parts: GeminiPart[] = [];
    if (imageData?.data) {
      parts.push({
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.data,
        },
      });
    }
    parts.push({ text });
    return parts;
  });
}

function parseJson<T>(raw: string, schema: { parse: (value: unknown) => T }): T {
  return schema.parse(JSON.parse(raw));
}

export async function analyzeImageIntent(input: ImageIntentInput): Promise<ImageIntentAnalysis> {
  const validated = ImageIntentInputSchema.parse(input);
  const ai = getGenAIClient();
  const model = getActiveGeminiModel();

  const instruction = `
You are the AI Creative Director for a professional B2B technology marketing studio.

Transform the user's raw idea into a commercially useful visual direction.

USER IDEA:
"${validated.userIdea}"

SELECTED SKU:
"${validated.selectedSku || "Not provided"}"

PRODUCT CONTEXT:
"${validated.productContext || "Not provided"}"

CHANNEL:
"${validated.channel || "B2B marketing"}"

AUDIENCE:
"${validated.audience || "Professional B2B technology audience"}"

REQUESTED ASPECT RATIO:
"${validated.requestedAspectRatio || "16:9"}"

If an image is supplied, analyze it as a real product/reference image.
Do not invent physical product features.
If a SKU/product context is supplied, treat that information as Product Truth
and let it override uncertain visual inference.

The goal is NOT to force a questionnaire.
Decide whether the idea is already sufficiently specified.
Ask only questions that materially affect the image.
Zero questions is valid.

Build a strong creative recommendation before writing any generation prompt.

For physical hardware:
- preserve exact geometry, proportions, ports, antennas, LEDs, buttons and branding;
- never invent or alter hardware;
- distinguish the real product from the generated environment;
- people and environments may be generated, the product identity may not.

Return ONLY JSON with this structure:
{
  "intent": "short description of the user's actual visual intent",
  "objective": "commercial objective",
  "detectedSubject": "main subject",
  "detectedProduct": "product or product category",
  "confidence": 0.0,
  "context": "recommended real-world context",
  "audience": "target audience",
  "message": "what the image should communicate",
  "vision": {
    "detectedSubject": "...",
    "detectedProduct": "...",
    "confidence": 0.0,
    "visibleAttributes": ["..."],
    "scene": "...",
    "installation": "...",
    "peopleOrAction": "...",
    "productFidelityConstraints": ["..."]
  },
  "qualification": {
    "readyForGeneration": true,
    "missingInformation": [],
    "questions": []
  },
  "recommendation": {
    "objective": "...",
    "concept": "...",
    "audience": "...",
    "message": "...",
    "scene": "...",
    "action": "...",
    "composition": "...",
    "lighting": "...",
    "camera": "...",
    "aspectRatio": "16:9",
    "productTreatment": "...",
    "negativeConstraints": ["..."],
    "rationale": "..."
  }
}`;

  const parts = await buildParts(instruction, validated.baseImage);
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: { responseMimeType: "application/json", temperature: 0.25 },
  });
  const raw = response.text?.trim();
  if (!raw) throw new Error("El motor creativo no devolvió una respuesta.");
  return parseJson(raw, ImageIntentAnalysisSchema);
}

export async function compileCreativePrompt(
  input: ImageIntentInput & {
    analysis: ImageIntentAnalysis;
    answers?: Record<string, string>;
  },
): Promise<import("@/lib/types/image-intelligence").ImagePromptResult> {
  const validated = ImageIntentInputSchema.parse(input);
  const analysis = ImageIntentAnalysisSchema.parse(input.analysis);

  const ai = getGenAIClient();
  const model = getActiveGeminiModel();

  const instruction = `
You are a senior commercial photographer and prompt engineer.

Compile a final image-generation prompt from the following approved creative direction.

USER IDEA:
"${validated.userIdea}"

PRODUCT TRUTH / SKU:
"${validated.selectedSku || "Not specified"}"

PRODUCT CONTEXT:
"${validated.productContext || "Not specified"}"

CREATIVE ANALYSIS:
${JSON.stringify(analysis, null, 2)}

USER ANSWERS:
${JSON.stringify(input.answers || {}, null, 2)}

Write one concise but highly specific English prompt for the configured image model.
The prompt must prioritize:
- exact product fidelity;
- clear subject hierarchy;
- believable physical installation;
- realistic human action;
- commercial B2B photography;
- camera, lens, perspective and lighting;
- realistic materials and depth;
- clean composition;
- explicit negative constraints.

Do not add imaginary technical specifications.
Do not change ports, antennas, buttons, LEDs, proportions or branding.
Do not use generic filler such as "8K" unless it contributes to the requested photographic result.

Return ONLY:
{
  "suggestedPrompt": "...",
  "recommendedAspectRatio": "16:9",
  "technicalNotes": "Spanish explanation of the creative decisions"
}`;

  const parts = await buildParts(instruction, validated.baseImage);
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: { responseMimeType: "application/json", temperature: 0.2 },
  });
  const raw = response.text?.trim();
  if (!raw) throw new Error("El compilador de prompts no devolvió una respuesta.");
  return parseJson(raw, ImagePromptResultSchema);
}

export function fallbackAnalysis(input: ImageIntentInput): ImageIntentAnalysis {
  const idea = input.userIdea.trim();
  const aspectRatio = input.requestedAspectRatio || "16:9";
  return ImageIntentAnalysisSchema.parse({
    intent: idea,
    objective: "Convertir la idea del cliente en una fotografía B2B comercial clara.",
    detectedSubject: input.selectedSku || "producto de networking",
    detectedProduct: input.selectedSku || "enterprise networking hardware",
    confidence: 0.5,
    context: "Entorno profesional realista.",
    audience: input.audience || "Profesionales B2B de tecnología.",
    message: idea,
    vision: {
      detectedSubject: "enterprise networking hardware",
      detectedProduct: input.selectedSku || "networking product",
      confidence: 0.5,
      visibleAttributes: [],
      scene: "Contexto profesional coherente con la idea.",
      installation: "Según la idea del usuario.",
      peopleOrAction: "Según la idea del usuario.",
      productFidelityConstraints: [
        "Preservar forma, proporciones, puertos, antenas, LEDs, botones y branding reales.",
      ],
    },
    qualification: {
      readyForGeneration: true,
      missingInformation: [],
      questions: [],
    },
    recommendation: ImageCreativeRecommendationSchema.parse({
      objective: "Crear una fotografía B2B que comunique la idea del cliente.",
      concept: "Representación profesional y fotorrealista del producto en uso.",
      audience: input.audience || "Profesionales B2B de tecnología.",
      message: idea,
      scene: "Entorno profesional realista.",
      action: "La acción indicada por el usuario.",
      composition: "Producto protagonista, contexto secundario y jerarquía visual clara.",
      lighting: "Luz natural corporativa equilibrada.",
      camera: "Fotografía comercial con perspectiva natural.",
      aspectRatio,
      productTreatment: "Fidelidad absoluta al producto de referencia.",
      negativeConstraints: [
        "No deformar el producto.",
        "No inventar puertos, antenas, botones o conectores.",
        "No alterar proporciones ni branding.",
      ],
      rationale: "La dirección prioriza la intención del cliente y la fidelidad del hardware.",
    }),
  });
}
