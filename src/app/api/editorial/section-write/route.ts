import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest } from "@/server/security/auth";
import { ArticleOutlineSchema, ArticleOutlineSectionSchema } from "@/lib/types/article-outline";
import {
  writeArticleSection,
  writeFullArticleFromOutline
} from "@/lib/services/deep-section-writer";
import { deriveOmnichannelAssets } from "@/lib/services/omnichannel-deriver";
import { z } from "zod";

const WriteSectionRequestSchema = z.object({
  action: z.enum(["WRITE_SECTION", "WRITE_FULL_ARTICLE"]).default("WRITE_FULL_ARTICLE"),
  outline: ArticleOutlineSchema,
  section: ArticleOutlineSectionSchema.optional(),
  previousSectionsSummary: z.string().optional(),
  category: z.string().default("wifi"),
  apiKey: z.string().optional()
});

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
    const parsed = WriteSectionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parámetros de redacción inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { action, outline, section, previousSectionsSummary, category, apiKey } = parsed.data;

    if (action === "WRITE_SECTION") {
      if (!section) {
        return NextResponse.json(
          { error: "La sección a redactar es obligatoria para action=WRITE_SECTION" },
          { status: 400 }
        );
      }

      const written = await writeArticleSection(section, outline, previousSectionsSummary || "", apiKey);
      return NextResponse.json({ section: written });
    }

    // action === "WRITE_FULL_ARTICLE"
    const fullArticle = await writeFullArticleFromOutline(outline, undefined, apiKey);
    const contentOutput = await deriveOmnichannelAssets(
      fullArticle,
      `junia-${Date.now()}`,
      category,
      apiKey
    );

    return NextResponse.json({
      article: fullArticle,
      contentOutput
    });
  } catch (err: any) {
    console.error("[POST /api/editorial/section-write] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Error al redactar artículo con Junia Engine" },
      { status: 500 }
    );
  }
}
