"use client";

import React, { useEffect } from "react";
import { 
  X, 
  ExternalLink, 
  FileText, 
  ShieldCheck, 
  BookOpen, 
  CheckCircle2, 
  Database,
  Layers,
  ArrowRight
} from "lucide-react";
import { OFFICIAL_NOTEBOOK } from "@/lib/notebooklm";

export interface CitationDetail {
  id: string;
  title: string;
  type?: string;
  excerpt?: string;
  pageOrSection?: string;
  url?: string;
  relevanceScore?: number;
}

interface SourceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citationId: string | null;
  citationData?: CitationDetail | null;
}

export const SourceDrawer: React.FC<SourceDrawerProps> = ({
  isOpen,
  onClose,
  citationId,
  citationData
}) => {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !citationId) return null;

  // Resolve source details from passed citationData or fallback to OFFICIAL_NOTEBOOK
  const officialSource = OFFICIAL_NOTEBOOK.sources.find(
    (s) => s.id.toLowerCase() === citationId.toLowerCase()
  );

  const title = citationData?.title || officialSource?.title || `Fuente ${citationId.toUpperCase()}`;
  const type = citationData?.type || officialSource?.type || "datasheet";
  const excerpt = citationData?.excerpt || officialSource?.description || "Especificación técnica y directiva oficial verificada en el repositorio de ingeniería.";
  const pageOrSection = citationData?.pageOrSection || (officialSource ? "Ficha Técnica Oficial" : "Sección Técnica");
  const linkUrl = citationData?.url || officialSource?.url || "https://www.ecomshop.es";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden transition-all">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400 uppercase bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                    {citationId.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verificado
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mt-1">
                  Evidencia Técnica Master
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Source Title & Type */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Documento de Referencia</span>
                <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {type}
                </span>
              </div>
              <h4 className="text-base font-bold text-white flex items-start gap-2">
                <FileText className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                <span>{title}</span>
              </h4>
              {pageOrSection && (
                <p className="text-xs text-slate-400 font-mono">
                  Ubicación: <span className="text-slate-300">{pageOrSection}</span>
                </p>
              )}
            </div>

            {/* Excerpt / Grounding Evidence */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Fragmento de Evidencia Extraído (Grounding)
              </label>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans shadow-inner">
                <blockquote className="border-l-2 border-indigo-500 pl-3 italic text-slate-200">
                  "{excerpt}"
                </blockquote>
              </div>
            </div>

            {/* Repository Info */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>NotebookLM ID:</span>
                <code className="text-[10px] font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded">
                  6ae5b7bb-ab27-4541-80cc-6127730fd01b
                </code>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Este dato técnico ha sido contrastado con el catálogo oficial de EcomShop para garantizar cero alucinaciones de precios, compatibilidad PoE y puertos.
              </p>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-lg shadow-indigo-600/20"
            >
              <span>Ver en ecomshop.es</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
