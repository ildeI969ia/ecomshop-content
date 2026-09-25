import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";
import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const body = await req.json();
    const { channel, topicTitle, category, currentText, instructions } = body;

    if (!channel || !topicTitle) {
      return NextResponse.json(
        { error: "Canal y topicTitle son obligatorios" },
        { status: 400 }
      );
    }

    // Comprobar presupuesto FinOps (estimación ~0.001€ para un único canal)
    const budgetCheck = await checkAiBudget(user.uid, user.role, 0.001);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        { error: "Presupuesto FinOps superado para esta acción" },
        { status: 429 }
      );
    }

    const ai = getGenAIClient();
    const activeModel = getActiveGeminiModel();

    const prompt = `
Eres el Director de Estrategia B2B de EcomShop.
Re-genera ÚNICAMENTE el activo para el canal "${channel}" manteniendo la máxima fidelidad técnica.

TÍTULO/PRODUCTO: "${topicTitle}"
CATEGORÍA: "${category || "general"}"
CONTENIDO PREVIO: "${currentText || ""}"
${instructions ? `INSTRUCCIONES DE MEJORA: "${instructions}"` : ""}

REGLAS DE REGENERACIÓN POR CANAL:
- BLOG: HTML estructurado con H2/H3, photo-recommendation-box y cta-placement-box.
- WHATSAPP: ≤ 600 caracteres, máximo 3 emojis, 1 enlace con UTM.
- LINKEDIN: Gancho ≤ 210 car, 3-5 hashtags B2B, sin enlace en el cuerpo.
- MAILCHIMP: Asunto ≤ 50 car, preheader ≤ 90 car, CTA claro.

Devuelve un JSON estrictamente con la clave "${channel}".
`;

    const generatePromise = ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout en regeneración de sección")), 15000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const rawText = (response.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(rawText);

    // Registrar consumo en FinOps
    const tokensIn = response.usageMetadata?.promptTokenCount ?? 450;
    const tokensOut = response.usageMetadata?.candidatesTokenCount ?? 800;
    await recordAiUsage(user.uid, `regenerate_${channel}`, tokensIn, tokensOut, 0);

    return NextResponse.json({
      success: true,
      channel,
      updatedPayload: parsed[channel] || parsed,
      tokensUsed: tokensIn + tokensOut
    });
  } catch (err: any) {
    console.error("[API RegenerateSection] Error:", err);
    return NextResponse.json(
      { error: "La IA no ha respondido, vuelve a intentarlo", details: err?.message || String(err) },
      { status: 500 }
    );
  }
});
