import { NextRequest, NextResponse } from "next/server";
import { analyzeMultimodalInput } from "@/lib/multimodal-advisor";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";

export const maxDuration = 60; // 60 segundos para Cloud Run

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const body = await req.json();
    const { textPrompt, mediaBase64, mimeType, scenarioId, category } = body;

    if (!textPrompt && !mediaBase64) {
      return NextResponse.json(
        { error: "Debes proporcionar al menos una nota explicativa o un archivo multimodal (imagen, audio o PDF)." },
        { status: 400 }
      );
    }

    const advisorResult = await analyzeMultimodalInput({
      textPrompt,
      mediaBase64,
      mimeType,
      scenarioId,
      category
    });

    return NextResponse.json({
      success: true,
      data: advisorResult
    });
  } catch (error: any) {
    console.error("Error en endpoint multimodal advisor:", error);
    return NextResponse.json(
      {
        error: error.message || "Error al procesar el análisis multimodal con Gemini.",
        details: error.toString()
      },
      { status: 500 }
    );
  }
});
