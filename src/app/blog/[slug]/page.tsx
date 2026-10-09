import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublishedBlogPostBySlug, getPublishedBlogPosts } from "@/lib/blog/public-blog-service";
import { BlogHeader, BlogFooter } from "@/components/blog/BlogLayoutComponents";
import { Clock, ArrowLeft, Tag, Share2, Sparkles, CheckCircle2 } from "lucide-react";
import { SafeHtml } from "@/components/SafeHtml";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const revalidate = 60;

/**
 * Metadatos dinámicos para SEO y AEO (OpenGraph, Twitter Cards, Canonical)
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Artículo no encontrado | Blog EcomShop",
      description: "El artículo solicitado no existe o no está publicado."
    };
  }

  const ogImages = post.featuredImageUrl
    ? [{ url: post.featuredImageUrl, width: 1200, height: 630, alt: post.title }]
    : [];

  return {
    title: `${post.title} | Blog Técnico EcomShop`,
    description: post.metaDescription,
    keywords: post.targetKeywords,
    authors: [{ name: post.author.name }],
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.publishedAt,
      authors: [post.author.name],
      images: ogImages,
      locale: "es_ES"
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
      images: post.featuredImageUrl ? [post.featuredImageUrl] : []
    }
  };
}

export default async function BlogPostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Estructura JSON-LD exhaustiva para Google Gemini, Claude, ChatGPT y Perplexity
  const structuredDataGraph: any[] = [
    {
      "@type": "TechArticle",
      "@id": `https://ecomshop.es/blog/${post.slug}#article`,
      "isPartOf": {
        "@type": "WebPage",
        "@id": `https://ecomshop.es/blog/${post.slug}`
      },
      "headline": post.title,
      "description": post.metaDescription,
      "image": post.featuredImageUrl ? [post.featuredImageUrl] : [],
      "datePublished": post.publishedAt,
      "dateModified": post.publishedAt,
      "inLanguage": "es-ES",
      "keywords": post.targetKeywords.join(", "),
      "articleSection": post.category,
      "proficiencyLevel": "Expert",
      "author": {
        "@type": "Organization",
        "name": post.author.name,
        "url": "https://ecomshop.es"
      },
      "publisher": {
        "@type": "Organization",
        "name": "EcomShop",
        "url": "https://ecomshop.es",
        "logo": {
          "@type": "ImageObject",
          "url": "https://ecomshop.es/logo.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://ecomshop.es/blog/${post.slug}`
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": `https://ecomshop.es/blog/${post.slug}#breadcrumb`,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Inicio",
          "item": "https://ecomshop.es/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Blog Técnico",
          "item": "https://ecomshop.es/blog"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": post.title,
          "item": `https://ecomshop.es/blog/${post.slug}`
        }
      ]
    }
  ];

  // Si existe tesis editorial, inyectar entidad FAQPage para que Google Gemini y Claude extraigan Q&A directos
  if (post.editorialThesis) {
    structuredDataGraph.push({
      "@type": "FAQPage",
      "@id": `https://ecomshop.es/blog/${post.slug}#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": post.editorialThesis.technicalQuestion,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `${post.editorialThesis.centralArgument} ${post.editorialThesis.solutionApproach}`
          }
        },
        {
          "@type": "Question",
          "name": `¿Cuál es el principal problema operativo que resuelve en ${post.category}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": post.editorialThesis.problem
          }
        }
      ]
    });
  }

  const jsonLdData = {
    "@context": "https://schema.org",
    "@graph": structuredDataGraph
  };

  const jsonLdContent = post.jsonLd
    ? post.jsonLd.replace(/^<script[^>]*>\s*/i, "").replace(/\s*<\/script>$/i, "")
    : JSON.stringify(jsonLdData);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950">
      <BlogHeader />

      {/* Structured Data (JSON-LD con @graph) para Google Search, Gemini, Claude y ChatGPT */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdContent }}
      />

      <article className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Breadcrumb & Navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a todos los artículos
          </Link>
        </div>

        {/* Header Metadata */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {post.category}
            </span>
            {post.productId && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                SKU: {post.productId}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400 font-mono ml-auto">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              {post.readingTimeMinutes} min de lectura
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {post.title}
          </h1>

          <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 text-sm">
                ES
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{post.author.name}</p>
                <p className="text-xs text-slate-500">
                  Publicado el {new Date(post.publishedAt).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImageUrl && (
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 mb-10 aspect-[16/9]">
            <img
              src={post.featuredImageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Bloque Answer-First para AEO (Google Gemini, Claude, SearchGPT, Perplexity) */}
        {post.editorialThesis && (
          <aside className="mb-10 rounded-2xl border border-sky-500/30 bg-slate-900/80 p-6 sm:p-7 shadow-lg shadow-sky-500/5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Resumen Técnico de Ingeniería (Answer-First / AEO)</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-3">
              {post.editorialThesis.technicalQuestion}
            </h2>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              {post.editorialThesis.centralArgument}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <strong className="text-slate-300 block mb-0.5">Problema Operativo:</strong>
                <span>{post.editorialThesis.problem}</span>
              </div>
              <div>
                <strong className="text-slate-300 block mb-0.5">Resolución Técnica:</strong>
                <span>{post.editorialThesis.solutionApproach}</span>
              </div>
            </div>
          </aside>
        )}

        {/* Article Body */}
        <div className="prose prose-invert prose-sky max-w-none text-slate-300 leading-relaxed text-base sm:text-lg">
          {post.htmlContent ? (
            <SafeHtml html={post.htmlContent} />
          ) : (
            <div className="whitespace-pre-line font-normal text-slate-300">
              {post.cleanPlainTextExcerpt}
            </div>
          )}
        </div>

        {/* Tabla Comparativa de Ingeniería para IAs y Consultas Técnicas */}
        {post.comparativeTableHtml && (
          <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 overflow-x-auto">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <span>Especificaciones Comparativas Contrastadas</span>
            </h3>
            <SafeHtml html={post.comparativeTableHtml} />
          </div>
        )}

        {/* Keywords Footer */}
        {post.targetKeywords && post.targetKeywords.length > 0 && (
          <div className="mt-12 pt-6 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Términos clave y especificaciones técnicas:
            </h4>
            <div className="flex flex-wrap gap-2">
              {post.targetKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md text-xs bg-slate-900 text-slate-400 border border-slate-800 font-mono"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* B2B Contact Banner */}
        <div className="mt-12 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-900 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-base font-bold text-white">
              ¿Necesitas asesoramiento técnico para tu despliegue?
            </h3>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Nuestros ingenieros de preventa validan diagramas de conectividad, compatibilidad de transceptores y dimensionamiento de enlaces sin coste.
            </p>
          </div>
          <a
            href="https://ecomshop.es"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs hover:bg-sky-400 transition-colors shadow-md shadow-sky-500/10"
          >
            Consultar con Soporte B2B
          </a>
        </div>
      </article>

      <BlogFooter />
    </div>
  );
}
