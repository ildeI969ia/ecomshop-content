"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  ExternalLink, 
  Edit3, 
  FileText, 
  Code, 
  Info, 
  Calendar, 
  Tag, 
  Clock, 
  Layers, 
  Share2, 
  Mail, 
  MessageSquare
} from "lucide-react";
import { ContentOutput } from "@/lib/schema";
import { SafeHtml } from "@/components/SafeHtml";
import { formatMadridDate } from "@/lib/formatters";

export interface StoredDocument {
  id: string;
  title: string;
  category: string;
  status: "draft" | "reviewed" | "approved" | "published";
  createdAt: string;
  content: ContentOutput;
}

interface DocumentDetailModalProps {
  document: StoredDocument | null;
  onClose: () => void;
  onLoadInEditor?: (doc: StoredDocument) => void;
  onDelete?: (id: string) => void;
}

export function DocumentDetailModal({
  document,
  onClose,
  onLoadInEditor,
  onDelete
}: DocumentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "raw" | "metadata">("preview");
  const [copiedType, setCopiedType] = useState<"md" | "html" | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (document) {
      window.addEventListener("keydown", handleKeyDown);
      window.document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.document.body.style.overflow = "auto";
    };
  }, [document, onClose]);

  // Reset tab on doc change
  useEffect(() => {
    setActiveTab("preview");
    setCopiedType(null);
    setIsConfirmingDelete(false);
  }, [document?.id]);

  // Derive content strings
  const htmlContent = document?.content?.blog?.htmlContent || "";
  const plainExcerpt = document?.content?.blog?.cleanPlainTextExcerpt || "";
  const slug = document?.content?.blog?.slug || "general";

  // Calculate word count
  const wordCount = useMemo(() => {
    if (!htmlContent) return 0;
    const textOnly = htmlContent.replace(/<[^>]*>/g, " ");
    const words = textOnly.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [htmlContent]);

  // Generate markdown representation
  const markdownContent = useMemo(() => {
    if (!document) return "";
    const metaKeywords = document.content?.blog?.targetKeywords?.join(", ") || "";
    const metaDesc = document.content?.blog?.metaDescription || "";
    const title = document.title || document.content?.blog?.title || "Sin título";

    // Basic html to markdown conversion for headings and paragraphs
    let bodyMd = htmlContent
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
      .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
      .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
      .replace(/<ul[^>]*>/gi, "\n")
      .replace(/<\/ul>/gi, "\n")
      .replace(/<ol[^>]*>/gi, "\n")
      .replace(/<\/ol>/gi, "\n")
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)")
      .replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']?([^"'>]*)["']?[^>]*>/gi, "![$2]($1)\n\n")
      .replace(/<hr\s*\/?>/gi, "\n---\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .trim();

    if (!bodyMd) {
      bodyMd = plainExcerpt;
    }

    return `---
title: "${title.replace(/"/g, '\\"')}"
slug: "${slug}"
category: "${document.category}"
status: "${document.status}"
createdAt: "${document.createdAt}"
metaDescription: "${metaDesc.replace(/"/g, '\\"')}"
keywords: [${metaKeywords}]
readingTimeMinutes: ${document.content?.blog?.readingTimeMinutes || 5}
wordCount: ${wordCount}
---

# ${title}

${bodyMd}
`;
  }, [document, htmlContent, plainExcerpt, slug, wordCount]);

  if (!document) return null;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopiedType("md");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(htmlContent);
    setCopiedType("html");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${slug || "articulo"}.md`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: StoredDocument["status"]) => {
    switch (status) {
      case "published":
        return { label: "Publicado", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" };
      case "approved":
        return { label: "Aprobado", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
      case "reviewed":
        return { label: "Revisado", color: "bg-sky-500/20 text-sky-300 border-sky-500/40" };
      default:
        return { label: "Borrador", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
    }
  };

  const badge = getStatusBadge(document.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${badge.color}`}>
                ● {badge.label}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                {document.category}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {formatMadridDate(document.createdAt)}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                {wordCount} palabras
              </span>
              <span className="text-xs text-slate-400 font-mono">
                /{slug}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 border border-slate-700 rounded-lg transition text-slate-400"
              title="Cerrar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-editorial text-xl font-bold text-white leading-snug">
            {document.title}
          </h3>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900/60">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "preview"
                ? "border-sky-500 text-sky-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Vista Previa (HTML)</span>
          </button>
          <button
            onClick={() => setActiveTab("raw")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "raw"
                ? "border-sky-500 text-sky-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Markdown / Raw</span>
          </button>
          <button
            onClick={() => setActiveTab("metadata")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "metadata"
                ? "border-sky-500 text-sky-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Metadatos & Canales</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/70 min-h-[350px]">
          {activeTab === "preview" && (
            <div className="bg-white text-slate-900 rounded-xl p-8 shadow-inner border border-slate-200 max-w-4xl mx-auto">
              <SafeHtml
                className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-img:rounded-xl prose-img:shadow-md"
                html={htmlContent || `<p>${plainExcerpt || "Sin contenido disponible"}</p>`}
              />
            </div>
          )}

          {activeTab === "raw" && (
            <div className="relative">
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  {copiedType === "md" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copiar Markdown</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  {copiedType === "html" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Code className="w-3 h-3 text-slate-400" />
                      <span>Copiar HTML</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-5 font-mono text-xs text-slate-200 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[58vh]">
                {markdownContent}
              </pre>
            </div>
          )}

          {activeTab === "metadata" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {/* Bloque SEO */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
                  <Tag className="w-4 h-4" />
                  <span>Posicionamiento SEO & Durable</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Meta Descripción:</span>
                  <p className="text-xs text-slate-200 mt-0.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    {document.content?.blog?.metaDescription || "No definida"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Palabras Clave Objetivo:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {document.content?.blog?.targetKeywords?.map((kw, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-sky-950/70 text-sky-300 border border-sky-800/60">
                        {kw}
                      </span>
                    )) || <span className="text-xs text-slate-500">Ninguna</span>}
                  </div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tiempo de lectura: ~{document.content?.blog?.readingTimeMinutes || 5} minutos</span>
                </div>
              </div>

              {/* Bloque Canales Complementarios */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <Share2 className="w-4 h-4" />
                  <span>Canales Multicanal Integrados</span>
                </div>

                {document.content?.linkedin && (
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1 mb-1">
                      <Share2 className="w-3 h-3 text-sky-400" />
                      LinkedIn B2B Hook:
                    </span>
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {document.content.linkedin.hook || document.content.linkedin.fullPostText?.substring(0, 100)}
                    </p>
                  </div>
                )}

                {document.content?.mailchimp && (
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 mb-1">
                      <Mail className="w-3 h-3 text-amber-400" />
                      Mailchimp Asunto A:
                    </span>
                    <p className="text-xs text-slate-300 line-clamp-1">
                      {document.content.mailchimp.subjectA}
                    </p>
                  </div>
                )}

                {document.content?.whatsapp && (
                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1 mb-1">
                      <MessageSquare className="w-3 h-3 text-emerald-400" />
                      WhatsApp Broadcast:
                    </span>
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {document.content.whatsapp.headline}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Delete with confirmation */}
          <div>
            {isConfirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-300 font-medium">¿Seguro que deseas eliminarlo?</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onDelete) {
                      onDelete(document.id);
                      onClose();
                    }
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                >
                  Sí, Borrar
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              onDelete && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-rose-900/60"
                  title="Eliminar este documento permanentemente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Borrar Documento</span>
                </button>
              )
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              {copiedType === "md" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar Markdown</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyHtml}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              {copiedType === "html" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Code className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar HTML</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadMd}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="Descargar archivo Markdown (.md)"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Descargar .md</span>
            </button>

            {onLoadInEditor && (
              <button
                type="button"
                onClick={() => {
                  onLoadInEditor(document);
                  onClose();
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-sky-950/50"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Cargar en Editor</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-medium transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
