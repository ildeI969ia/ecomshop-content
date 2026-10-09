import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, ArrowRight, Sparkles, Tag, Layers } from "lucide-react";
import { PublicBlogPostItem } from "@/lib/blog/public-blog-service";

interface BlogCardProps {
  post: PublicBlogPostItem;
  featured?: boolean;
}

export function BlogPostCard({ post, featured = false }: BlogCardProps) {
  const fallbackImage = "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80";
  const displayImage = post.featuredImageUrl || fallbackImage;

  if (featured) {
    return (
      <article className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:border-sky-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/10 grid grid-cols-1 lg:grid-cols-12 gap-0 mb-12">
        <div className="lg:col-span-7 relative min-h-[300px] lg:min-h-[420px] w-full overflow-hidden bg-slate-950">
          <img
            src={displayImage}
            alt={post.title}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent lg:hidden" />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500 text-slate-950 shadow-md">
              Destacado
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-900/90 text-sky-400 border border-slate-700 backdrop-blur-md">
              {post.category}
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                {post.readingTimeMinutes} min de lectura
              </span>
              <span>•</span>
              <time dateTime={post.publishedAt} className="text-slate-400">
                {new Date(post.publishedAt).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })}
              </time>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 group-hover:text-sky-400 transition-colors tracking-tight line-clamp-3">
              <Link href={`/blog/${post.slug}`}>
                {post.title}
              </Link>
            </h2>

            <p className="mt-4 text-sm text-slate-300 line-clamp-4 leading-relaxed font-normal">
              {post.preview}
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between">
            <div className="text-xs">
              <span className="font-medium text-slate-200 block">{post.author.name}</span>
              <span className="text-slate-500 block text-[11px]">{post.author.role}</span>
            </div>

            <Link
              href={`/blog/${post.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 group-hover:text-sky-300 transition-colors"
            >
              Leer artículo
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-black/40">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
        <img
          src={displayImage}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900/90 text-sky-400 border border-slate-700/80 backdrop-blur-md">
            {post.category}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2.5">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-sky-400" />
              {post.readingTimeMinutes} min
            </span>
            <span>•</span>
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                year: "numeric"
              })}
            </time>
          </div>

          <h3 className="text-base font-bold text-slate-100 group-hover:text-sky-400 transition-colors tracking-tight line-clamp-2">
            <Link href={`/blog/${post.slug}`}>
              {post.title}
            </Link>
          </h3>

          <p className="mt-2.5 text-xs text-slate-400 line-clamp-3 leading-relaxed">
            {post.preview}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
            {post.productId ? `Ref. ${post.productId}` : "Guía Técnica"}
          </span>

          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1 font-semibold text-sky-400 hover:text-sky-300 transition-colors"
          >
            Leer
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </article>
  );
}
