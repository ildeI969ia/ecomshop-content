import { getActiveGeminiModel, getGenAIClient } from "@/lib/genai-client";
import { resolveBaseImageToData } from "@/lib/image-generator";
import {
  ImageCriticResultSchema,
  type ImageCriticResult,
} from "@/lib/types/image-intelligence";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export async function critiqueGeneratedImage(
  image: string,
  prompt: string,
): Promise<ImageCriticResult> {
  const imageData = await resolveBaseImageToData(image);
  if (!imageData?.data) {
    return {
      productFidelity: "warning",
      intentMatch: "warning",
      realism: "warning",
      composition: "warning",
      detectedProblems: ["La imagen generada no está disponible para revisión multimodal."],
      optimizedPromptInstructions: "",
      shouldRegenerate: false,
    };
  }

  const ai = getGenAIClient();
  const model = getActiveGeminiModel();
  const parts: GeminiPart[] = [
    {
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.data,
      },
    },
    {
      text: `You are a conservative visual quality-control reviewer for B2B networking product photography.

ORIGINAL PROMPT:
"${prompt}"

Inspect the generated image.

Only recommend regeneration when there is a clear material defect:
- product geometry is visibly distorted;
- ports, antennas, buttons or hardware are invented/changed;
- the image clearly fails the user's intended scene;
- people or environment contain obvious major generation artifacts.

Do not demand perfection that cannot be established visually.
Do not invent technical facts about the product.

Return ONLY JSON:
{
  "productFidelity": "pass|warning|fail",
  "intentMatch": "pass|warning|fail",
  "realism": "pass|warning|fail",
  "composition": "pass|warning|fail",
  "detectedProblems": [],
  "optimizedPromptInstructions": "",
  "shouldRegenerate": false
}`,
    },
  ];

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: { responseMimeType: "application/json", temperature: 0.1 },
  });

  const raw = response.text?.trim();
  if (!raw) throw new Error("El crítico visual no devolvió respuesta.");
  return ImageCriticResultSchema.parse(JSON.parse(raw));
}
