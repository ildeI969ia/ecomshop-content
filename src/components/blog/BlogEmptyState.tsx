import React from "react";
import Link from "next/link";
import { Sparkles, Terminal, FileText, ArrowRight } from "lucide-react";

export function BlogEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center max-w-2xl mx-auto my-12">
      <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center mb-5">
        <FileText className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold text-slate-100 tracking-tight">
        Aún no hay artículos publicados en el blog
      </h3>
      <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
        Puedes entrar al Generador Multicanal con tu cuenta de equipo, seleccionar cualquier producto de nuestro catálogo y publicar tu primer artículo con fotos fotorrealistas e indexación SEO en segundos.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-slate-950 font-bold text-sm hover:bg-sky-400 transition-colors shadow-lg shadow-sky-500/20"
        >
          <Sparkles className="w-4 h-4" />
          <span>Acceder al Generador de Artículos</span>
          <ArrowRight className="w-4 h-4 ml-0.5" />
        </Link>
      </div>
    </div>
  );
}
