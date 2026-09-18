import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest } from "@/server/security/auth";
import { generateArticleOutline } from "@/lib/services/outline-generator";
import { GenerateOutlineRequestSchema } from "@/lib/types/article-outline";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateServerRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Sesión corporativa requerida." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = GenerateOutlineRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parámetros de outline inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { topicOrProduct, targetAudience, vertical, apiKey } = parsed.data;

    const outline = await generateArticleOutline(
      topicOrProduct,
      targetAudience || "Instaladores de Telecomunicaciones e Integradores IT",
      vertical || "EMPRESAS_OFICINAS",
      apiKey
    );

    return NextResponse.json({
      outline,
      meta: {
        topicOrProduct,
        targetAudience,
        vertical,
        sectionsCount: outline.sections.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error("[POST /api/editorial/outline] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Error al generar el outline técnico" },
      { status: 500 }
    );
  }
}
