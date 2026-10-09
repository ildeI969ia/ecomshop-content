import React from "react";
import Link from "next/link";
import { BookOpen, Sparkles, ArrowRight, ShieldCheck, Cpu } from "lucide-react";

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <span className="font-bold text-slate-100 tracking-tight text-lg">EcomShop</span>
              <span className="text-xs ml-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-sky-500/20 font-medium">
                Blog Técnico B2B
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Artículos
          </Link>
          <a
            href="https://ecomshop.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors hidden sm:inline"
          >
            Catálogo Comercial
          </a>

          {/* Acceso directo a la plataforma de generación y marketing */}
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/30 hover:bg-sky-600/30 hover:text-white transition-all shadow-sm shadow-sky-500/10"
            title="Acceso al panel interno de generación multicanal con IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Generador & Panel</span>
            <ArrowRight className="w-3 h-3 text-sky-400/70" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function BlogFooter() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <p className="font-medium text-slate-300">
            EcomShop Telecomunicaciones & Networking B2B
          </p>
          <p className="mt-1 text-slate-500">
            Artículos técnicos, análisis de equipamiento y guías de despliegue para ingenieros e integradores.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="hover:text-slate-200 transition-colors">
            Inicio Blog
          </Link>
          <Link href="/sitemap.xml" className="hover:text-slate-200 transition-colors">
            Sitemap
          </Link>
          <Link href="/admin" className="hover:text-sky-400 transition-colors flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Área de Redacción
          </Link>
        </div>
      </div>
    </footer>
  );
}
