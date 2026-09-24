import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { ArticleOutlineSchema, ArticleOutlineSectionSchema } from "@/lib/types/article-outline";
import {
  writeArticleSection,
  writeFullArticleFromOutline,
  finalizeArticleFromSections,
  WrittenSectionResult
} from "@/lib/services/deep-section-writer";
import { deriveOmnichannelAssets } from "@/lib/services/omnichannel-deriver";
import { z } from "zod";

const WrittenSectionResultSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  level: z.enum(["H2", "H3"]),
  htmlContent: z.string(),
  wordCount: z.number()
});

const WriteSectionRequestSchema = z.object({
  action: z.enum(["WRITE_SECTION", "FINALIZE_ARTICLE", "WRITE_FULL_ARTICLE"]).default("WRITE_FULL_ARTICLE"),
  outline: ArticleOutlineSchema,
  section: ArticleOutlineSectionSchema.optional(),
  writtenSections: z.array(WrittenSectionResultSchema).optional(),
  previousSectionsSummary: z.string().optional(),
  category: z.string().default("wifi")
}).strict();

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = WriteSectionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parámetros de redacción inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { action, outline, section, writtenSections, previousSectionsSummary, category } = parsed.data;

    if (action === "WRITE_SECTION") {
      if (!section) {
        return NextResponse.json(
          { error: "La sección a redactar es obligatoria para action=WRITE_SECTION" },
          { status: 400 }
        );
      }

      const written = await writeArticleSection(section, outline, previousSectionsSummary || "");
      return NextResponse.json({ section: written });
    }

    if (action === "FINALIZE_ARTICLE") {
      if (!writtenSections || writtenSections.length === 0) {
        return NextResponse.json(
          { error: "Se requiere la lista de secciones redactadas para action=FINALIZE_ARTICLE" },
          { status: 400 }
        );
      }

      const fullArticle = finalizeArticleFromSections(outline, writtenSections);
      const contentOutput = await deriveOmnichannelAssets(
        fullArticle,
        `junia-${Date.now()}`,
        category
      );

      return NextResponse.json({
        article: fullArticle,
        contentOutput
      });
    }

    const fullArticle = await writeFullArticleFromOutline(outline, undefined);
    const contentOutput = await deriveOmnichannelAssets(
      fullArticle,
      `junia-${Date.now()}`,
      category
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
});
