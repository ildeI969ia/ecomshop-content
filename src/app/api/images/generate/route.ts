import { NextResponse } from "next/server";
import { generateImageWithImagen } from "@/lib/image-generator";

export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio, apiKey, baseImage } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Falta el prompt para generar la imagen" }, { status: 400 });
    }

    const result = await generateImageWithImagen({
      prompt,
      aspectRatio: aspectRatio || "16:9",
      apiKey,
      baseImage
    });

    return NextResponse.json({
      imageUrl: result.imageUrl,
      sourceType: result.sourceType,
      warning: result.warning,
      refinedPrompt: result.refinedPrompt
    });
  } catch (error: any) {
    console.error("Error generating image:", error);
    return NextResponse.json({ error: error.message || "Error al generar imagen" }, { status: 500 });
  }
}
