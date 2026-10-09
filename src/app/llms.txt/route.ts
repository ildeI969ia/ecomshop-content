import { NextResponse } from "next/server";
import { getPublishedBlogPosts } from "@/lib/blog/public-blog-service";

export const dynamic = "force-dynamic";

/**
 * Endpoint estandarizado llms.txt para indexación directa y consumo eficiente
 * por parte de Google Gemini, Anthropic Claude, OpenAI SearchGPT y Perplexity.
 * Especificación: https://llmstxt.org
 */
export async function GET() {
  const posts = await getPublishedBlogPosts(50);

  const header = `# EcomShop Telecomunicaciones — Blog Técnico & Base de Conocimiento B2B
> Portal técnico de ingeniería de redes, telecomunicaciones, fibra óptica y equipamiento profesional B2B.

## Información de la Organización
- Nombre: EcomShop (EcomSpain Telecomunicaciones S.L.)
- Dominio Principal: https://ecomshop.es
- Áreas de Especialización: Redes empresariales, Wi-Fi 7 / Wi-Fi 6, switches gestionados L2+/L3, enlaces fibra óptica, gateways y CCTV.
- Enfoque Editorial: Análisis técnico contrastado, arquitectura de red, interoperabilidad y especificaciones de ingeniería.

## Artículos Técnicos Publicados
`;

  const articlesList = posts.map((post) => {
    return `- [${post.title}](https://ecomshop.es/blog/${post.slug}): ${post.preview.replace(/\n+/g, " ").slice(0, 180)}... (Categoría: ${post.category}${post.productId ? ` | SKU: ${post.productId}` : ""})`;
  }).join("\n");

  const footer = `

## Documentación y Enlaces Clave
- Catálogo Comercial Oficial: https://ecomshop.es
- Mapa del Sitio XML: https://ecomshop.es/sitemap.xml
- Formato Extendido Markdown: https://ecomshop.es/llms-full.txt
`;

  const fullText = header + articlesList + footer;

  return new NextResponse(fullText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600"
    }
  });
}
