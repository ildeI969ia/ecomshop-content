import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { getPublishedBlogPosts } from "@/lib/blog/public-blog-service";
import { BlogHeader, BlogFooter } from "@/components/blog/BlogLayoutComponents";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { BlogEmptyState } from "@/components/blog/BlogEmptyState";
import { Sparkles, ArrowRight, BookOpen, Layers, ShieldCheck, Cpu } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog Técnico B2B | EcomShop Telecomunicaciones y Redes",
  description: "Análisis técnico de equipamiento de telecomunicaciones, guías de despliegue en campo y arquitectura de red para ingenieros e integradores.",
  openGraph: {
    title: "Blog Técnico B2B | EcomShop Telecomunicaciones y Redes",
    description: "Análisis técnico de equipamiento de telecomunicaciones, guías de despliegue en campo y arquitectura de red.",
    type: "website",
    locale: "es_ES"
  }
};

export default async function BlogHomePage() {
  const posts = await getPublishedBlogPosts(30);

  const featuredPost = posts[0] || null;
  const secondaryPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950">
      <BlogHeader />

      {/* Hero Section */}
      <section className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900/50 via-slate-950 to-slate-950 py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Conocimiento Técnico y Redes B2B</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Ingeniería de conectividad, fibra y telecomunicaciones.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
              Análisis riguroso de equipamiento, comparativas de rendimiento en campo y buenas prácticas de instalación para profesionales de telecomunicaciones.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white hover:border-sky-500/50 hover:bg-slate-800/80 transition-all shadow-sm"
              >
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>Panel de Redacción & IA</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {posts.length === 0 ? (
          <BlogEmptyState />
        ) : (
          <div>
            {/* Featured Post */}
            {featuredPost && (
              <BlogPostCard post={featuredPost} featured={true} />
            )}

            {/* Grid of Secondary Posts */}
            {secondaryPosts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-bold tracking-tight text-slate-200 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-sky-400" />
                    Artículos Recientes
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">
                    {secondaryPosts.length} artículos disponibles
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {secondaryPosts.map((post) => (
                    <BlogPostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <BlogFooter />
    </div>
  );
}
