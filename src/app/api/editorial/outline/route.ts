import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { generateArticleOutline } from "@/lib/services/outline-generator";
import { GenerateOutlineRequestSchema } from "@/lib/types/article-outline";

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = GenerateOutlineRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parámetros de outline inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { topicOrProduct, targetAudience, vertical } = parsed.data;

    const outline = await generateArticleOutline(
      topicOrProduct,
      targetAudience || "Instaladores de Telecomunicaciones e Integradores IT",
      vertical || "EMPRESAS_OFICINAS"
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
});
