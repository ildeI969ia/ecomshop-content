import { NextResponse } from "next/server";
import { generateImageWithImagen } from "@/lib/image-generator";

export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio, apiKey } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Falta el prompt para generar la imagen" }, { status: 400 });
    }

    const imageUrl = await generateImageWithImagen({
      prompt,
      aspectRatio: aspectRatio || "16:9",
      apiKey
    });

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Error generating image:", error);
    return NextResponse.json({ error: error.message || "Error al generar imagen" }, { status: 500 });
  }
}
