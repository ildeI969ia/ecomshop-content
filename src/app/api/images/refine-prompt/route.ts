import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";
import { resolveBaseImageToData } from "@/lib/image-generator";

export interface PromptRefinementResponse {
  originalIdea: string;
  improvedPrompt: string;
  cameraDetails: string;
  improvements: string[];
  suggestedAspectRatio: "16:9" | "1:1" | "4:3";
}

import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest, user) => {
  try {
    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.001);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          code: "AI_BUDGET_EXCEEDED",
          error: "Has superado el límite de presupuesto de IA asignado para este mes.",
          limitEur: budgetCheck.limitEur,
          spentEur: budgetCheck.currentSpentEur,
          pct: budgetCheck.pct,
          resetsAt: "Inicio del próximo mes (Hora de Madrid)"
        },
        { status: 429 }
      );
    }

    const { prompt, baseImage, aspectRatio } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Se requiere un prompt o idea inicial para cualificar" },
        { status: 400 }
      );
    }

    const trimmedPrompt = prompt.trim();
    const currentAspectRatio = aspectRatio === "4:3" || aspectRatio === "1:1" ? aspectRatio : "16:9";

    try {
      const ai = getGenAIClient();
      const model = getActiveGeminiModel();
      const baseImageData = await resolveBaseImageToData(baseImage);

      const parts: any[] = [];
      if (baseImageData?.data) {
        parts.push({
          inlineData: {
            mimeType: baseImageData.mimeType,
            data: baseImageData.data,
          },
        });
      }

      const promptInstruction = `You are a World-Class B2B Telecom Art Director and Commercial Photographer specialized in enterprise networking hardware, datacenter infrastructures, Wi-Fi 7 access points, EnGenius Cloud PoE+ switches, SD-WAN security gateways, and optical fiber patch systems.

The user wants to generate an image for a corporate B2B website. Their initial idea or draft prompt is:
"${trimmedPrompt}"

Target aspect ratio: ${currentAspectRatio}.
${baseImageData ? "A reference hardware image is provided. Make sure the improved prompt preserves the authentic hardware model, ports and physical attributes shown." : ""}

Your task is to transform this raw idea into a highly qualified, professional, photorealistic prompt in ENGLISH optimized for Google Imagen 3 and Gemini Flash Image.

Follow these photographic rules:
1. Specify photographic camera gear, focal length, aperture and angle (e.g. 50mm f/2.0, 85mm macro, sharp industrial close-up, 45-degree isometric, or wide architectural).
2. Detail authentic corporate textures: anodized matte metal chassis, neat blue/cyan patch cables with velcro ties, golden RJ45 connectors, realistic LED status lights (not blinding, subtle 470nm cyan/green).
3. Specify lighting: soft diffused 5500K studio key light, subtle datacenter fill light, zero AI plastic gloss or distorted ports.
4. Keep the improved prompt under 90 words, focused, clear and directly executable.
5. Provide 3-4 bullet points in Spanish explaining why this prompt is superior and what technical aspects were qualified.

Respond ONLY with valid JSON in this exact structure:
{
  "improvedPrompt": "Clean modern corporate server room, 42U rack cabinet filled with EnGenius PoE+ enterprise switches...",
  "cameraDetails": "50mm f/2.8 lens, shallow depth of field, 5500K balanced daylight with soft cyan LED accent",
  "improvements": [
    "Incorporación de óptica 50mm para profundidad de campo profesional",
    "Definición exacta de chasis metálico anodizado y cables de fibra ordenados",
    "Iluminación calibrada para eliminar brillos artificiales",
    "Contexto corporativo B2B realista sin distorsiones"
  ],
  "suggestedAspectRatio": "${currentAspectRatio}"
}`;

      parts.push({ text: promptInstruction });

      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      });

      const text = response.text?.trim();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed.improvedPrompt && typeof parsed.improvedPrompt === "string") {
            const tokensIn = response.usageMetadata?.promptTokenCount ?? 400;
            const tokensOut = response.usageMetadata?.candidatesTokenCount ?? 300;
            try {
              await recordAiUsage(user.uid, "image_refine_prompt", tokensIn, tokensOut, 0);
            } catch (usageErr) {
              console.error("[refine-prompt] Warning: Falló el registro de uso de IA:", usageErr);
            }
            return NextResponse.json({
              originalIdea: trimmedPrompt,
              improvedPrompt: parsed.improvedPrompt.trim(),
              cameraDetails: parsed.cameraDetails || "50mm f/2.0, iluminación fotográfica B2B",
              improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [
                "Cualificación fotográfica profesional para evitar alucinaciones",
                "Optimización de iluminación y texturas de hardware de red",
                "Traducción y enriquecimiento de descriptores técnicos en inglés"
              ],
              suggestedAspectRatio: parsed.suggestedAspectRatio || currentAspectRatio,
            });
          }
        } catch {
          // JSON parsing fallback
        }
      }
    } catch (aiErr) {
      console.warn("[RefinePrompt] Error invocando Gemini, recurriendo a cualificador determinista:", aiErr);
    }

    const lower = trimmedPrompt.toLowerCase();
    let categoryFocus = "general";
    let hardwareKeywords = "enterprise networking hardware, clean server rack, patch panels";

    if (lower.includes("rack") || lower.includes("datacenter") || lower.includes("armario") || lower.includes("servidor")) {
      categoryFocus = "rack";
      hardwareKeywords = "42U matte black server cabinet, EnGenius Cloud PoE+ switches, organized blue and cyan fiber optic patch cords with velcro management, glowing LED activity indicators";
    } else if (lower.includes("wifi") || lower.includes("ap") || lower.includes("punto de acceso") || lower.includes("techo") || lower.includes("access point")) {
      categoryFocus = "wifi";
      hardwareKeywords = "circular enterprise Wi-Fi 7 access point mounted cleanly on modern acoustic ceiling tiles, subtle cyan status LED ring, bright corporate daylight, minimalist architecture";
    } else if (lower.includes("fibra") || lower.includes("fiber") || lower.includes("fusion") || lower.includes("empalme") || lower.includes("cable")) {
      categoryFocus = "fiber";
      hardwareKeywords = "high-precision optical fiber fusion splicer and optical power meter, glowing glass core, clean telecom tool kit, industrial macro photography";
    } else if (lower.includes("switch") || lower.includes("puerto") || lower.includes("poe")) {
      categoryFocus = "switch";
      hardwareKeywords = "multi-gigabit 2.5G/10G enterprise switch, robust anodized dark chassis, gold-plated RJ45 ports with connected Cat6A shielded cables, precise status LEDs";
    }

    const fallbackImproved = `Professional photorealistic ${currentAspectRatio} commercial photograph: ${hardwareKeywords}. Inspired by "${trimmedPrompt}". Sharp 50mm f/2.8 focus, clean corporate studio lighting, realistic industrial materials, zero distortion, 8k resolution.`;

    return NextResponse.json({
      originalIdea: trimmedPrompt,
      improvedPrompt: fallbackImproved,
      cameraDetails: "50mm f/2.8, iluminación difusa de estudio 5500K y foco nítido",
      improvements: [
        "Enriquecimiento de terminología técnica de hardware para evitar deformaciones",
        "Ajuste de profundidad de campo y luz de estudio corporativo",
        "Estructuración de descriptores fotográficos en inglés optimizados para Google Imagen 3",
        "Composición fidedigna para telecomunicaciones B2B"
      ],
      suggestedAspectRatio: currentAspectRatio,
    });
  } catch (error: any) {
    console.error("[RefinePrompt] Error fatal:", error);
    return NextResponse.json(
      { error: error.message || "Error procesando la cualificación del prompt" },
      { status: 500 }
    );
  }
});
