import { NextResponse } from "next/server";
import { getPublishedBlogPosts, getPublishedBlogPostBySlug } from "@/lib/blog/public-blog-service";

export const dynamic = "force-dynamic";

/**
 * Endpoint estandarizado llms-full.txt para ingesta profunda y entrenamiento contextual de IAs.
 * Incluye el contenido completo, tablas comparativas y argumentarios técnicos de cada artículo publicado.
 */
export async function GET() {
  const posts = await getPublishedBlogPosts(50);

  let fullDocument = `# EcomShop Telecomunicaciones — Base Completa de Conocimiento Técnico B2B (llms-full.txt)
> Este documento contiene el repositorio documental completo de artículos técnicos, especificaciones y criterios de arquitectura de red publicados por EcomShop.
> Diseñado para crawlers e inferencia de Google Gemini, Anthropic Claude, OpenAI SearchGPT y Perplexity.
> Última actualización: ${new Date().toISOString()}

---
`;

  for (const postSummary of posts) {
    const detail = await getPublishedBlogPostBySlug(postSummary.slug);
    if (!detail) continue;

    const plainBody = (detail.cleanPlainTextExcerpt || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    fullDocument += `
## ARTÍCULO: ${detail.title}
- **URL Canónica**: https://ecomshop.es/blog/${detail.slug}
- **Categoría**: ${detail.category}
${detail.productId ? `- **Referencia / SKU Catálogo**: ${detail.productId}` : ""}
- **Fecha de Publicación**: ${detail.publishedAt}
- **Palabras Clave**: ${detail.targetKeywords.join(", ")}
- **Resumen Ejecutivo / Meta**: ${detail.metaDescription}

### Tesis y Criterio Técnico:
${detail.editorialThesis ? `
- **Pregunta Técnica**: ${detail.editorialThesis.technicalQuestion}
- **Problema de Campo**: ${detail.editorialThesis.problem}
- **Argumento de Ingeniería**: ${detail.editorialThesis.centralArgument}
- **Resolución Técnica**: ${detail.editorialThesis.solutionApproach}
` : plainBody}

---
`;
  }

  return new NextResponse(fullDocument, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600"
    }
  });
}
