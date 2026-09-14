import { NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/schema";
import { generateB2BContent } from "@/lib/generator";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = GenerateRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de entrada inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const content = await generateB2BContent({
      ...parsed.data,
      apiKey: json.apiKey
    });
    return NextResponse.json(content);
  } catch (error: any) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Error interno al procesar el contenido", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
