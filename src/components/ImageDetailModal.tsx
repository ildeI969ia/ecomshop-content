"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Shield, 
  Maximize2, 
  Minimize2,
  Clock,
  Cpu,
  Trash2,
  FileText,
  Share2,
  Mail,
  ChevronDown,
  Layout,
  Image as ImageIcon
} from "lucide-react";

export interface ImageDetailItem {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
  sourceType?: string;
  warning?: string;
}

interface ImageDetailModalProps {
  image: ImageDetailItem | null;
  onClose: () => void;
  onUseAsBase?: (url: string) => void;
  onDelete?: (id: string) => void;
  onInsertIntoArticle?: (image: ImageDetailItem, mode: "hero" | "body") => void;
  onReuseInCampaign?: (image: ImageDetailItem, channel: "linkedin" | "newsletter") => void;
}

export function ImageDetailModal({ 
  image, 
  onClose, 
  onUseAsBase, 
  onDelete,
  onInsertIntoArticle,
  onReuseInCampaign
}: ImageDetailModalProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showReuseMenu, setShowReuseMenu] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Reset states on open new image
  useEffect(() => {
    setZoomLevel(1);
    setCopiedPrompt(false);
    setShowInsertMenu(false);
    setShowReuseMenu(false);
    setIsConfirmingDelete(false);
    setActionFeedback(null);
  }, [image?.id]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (image) {
      window.addEventListener("keydown", handleKeyDown);
      window.document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.document.body.style.overflow = "auto";
    };
  }, [image, onClose]);

  if (!image) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(image.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.5, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  const getSourceBadge = () => {
    switch (image.sourceType) {
      case "official_product":
        return {
          label: "Foto Oficial de Fabricante (NotebookLM)",
          color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          desc: "Hardware 100% físico real sin modificaciones de IA (0 alucinaciones)."
        };
      case "gemini_multimodal":
        return {
          label: "Google Vertex AI · Gemini Flash Image (Multimodal)",
          color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
          desc: "Composición guiada por visión multimodal conservando la imagen base de referencia."
        };
      case "imagen3":
        return {
          label: "Google Vertex AI · Gemini 2.5 Flash Image",
          color: "bg-sky-500/20 text-sky-300 border-sky-500/40",
          desc: "Generada fotorrealistamente con Gemini Flash Image en us-central1."
        };
      default:
        return {
          label: "Banco Curado Unsplash",
          color: "bg-slate-700 text-slate-300 border-slate-600",
          desc: "Fotografía de catálogo IT de alta resolución."
        };
    }
  };

  const badge = getSourceBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-6xl max-h-[95vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => {
          e.stopPropagation();
          setShowInsertMenu(false);
          setShowReuseMenu(false);
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1.5 ${badge.color}`}>
              {image.sourceType === "official_product" ? (
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              )}
              {badge.label}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {image.createdAt}
            </span>
            {actionFeedback && (
              <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full animate-in fade-in">
                {actionFeedback}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.75}
                className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-40 transition"
                title="Alejar (-)"
              >
                <ZoomOut className="w-4 h-4 text-slate-300" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 py-1 hover:bg-slate-700 rounded font-mono text-[11px] text-slate-300 transition"
                title="Restablecer tamaño (100%)"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="p-1.5 hover:bg-slate-700 rounded disabled:opacity-40 transition"
                title="Acercar (+)"
              >
                <ZoomIn className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 border border-slate-700 rounded-lg transition text-slate-400"
              title="Cerrar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Viewer: Image with Pan/Zoom Area */}
        <div className="flex-1 relative overflow-auto bg-slate-950 min-h-[380px] max-h-[60vh] flex items-center justify-center p-4">
          <div 
            className="transition-transform duration-150 ease-out flex items-center justify-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={image.url}
              alt={image.prompt}
              className="max-w-full max-h-[56vh] object-contain rounded-lg shadow-2xl border border-slate-800"
            />
          </div>
        </div>

        {/* Footer Bar: Prompt details & Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Prompt & Contexto de Generación:
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 max-h-16 overflow-y-auto select-all">
                {image.prompt}
              </p>
            </div>

            <button
              onClick={handleCopyPrompt}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shrink-0 self-center"
              title="Copiar prompt al portapapeles"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar Prompt</span>
                </>
              )}
            </button>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
            {/* Left: Delete */}
            <div>
              {isConfirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-300 font-medium">¿Confirmar borrado definitivo?</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDelete) {
                        onDelete(image.id);
                        onClose();
                      }
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    Borrar Definitivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                onDelete && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    title="Eliminar esta imagen de la base de datos y del almacenamiento permanentemente"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Borrar Definitivo</span>
                  </button>
                )
              )}
            </div>

            {/* Right: Insert, Reuse, Base, Download */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Insertar en Artículo */}
              {onInsertIntoArticle && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReuseMenu(false);
                      setShowInsertMenu(!showInsertMenu);
                    }}
                    className="bg-indigo-600/90 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                    title="Insertar esta imagen en el artículo activo"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-300" />
                    <span>Insertar en Artículo</span>
                    <ChevronDown className="w-3 h-3 text-indigo-200" />
                  </button>

                  {showInsertMenu && (
                    <div 
                      className="absolute bottom-full right-0 mb-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onInsertIntoArticle(image, "hero");
                          setShowInsertMenu(false);
                          setActionFeedback("✓ Insertada como imagen de portada (Hero)");
                          setTimeout(() => setActionFeedback(null), 3000);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                      >
                        <Layout className="w-4 h-4 text-sky-400" />
                        <div>
                          <div className="font-semibold">Como Imagen Hero</div>
                          <div className="text-[10px] text-slate-400">Portada principal del artículo</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onInsertIntoArticle(image, "body");
                          setShowInsertMenu(false);
                          setActionFeedback("✓ Insertada en el contenido del artículo");
                          setTimeout(() => setActionFeedback(null), 3000);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition border-t border-slate-800"
                      >
                        <ImageIcon className="w-4 h-4 text-purple-400" />
                        <div>
                          <div className="font-semibold">En Cuerpo del Artículo</div>
                          <div className="text-[10px] text-slate-400">Etiqueta &lt;img&gt; en el texto HTML</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Reusar en Campaña */}
              {onReuseInCampaign && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInsertMenu(false);
                      setShowReuseMenu(!showReuseMenu);
                    }}
                    className="bg-emerald-600/90 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                    title="Reutilizar esta imagen en canales de campaña"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Reusar en Campaña</span>
                    <ChevronDown className="w-3 h-3 text-emerald-200" />
                  </button>

                  {showReuseMenu && (
                    <div 
                      className="absolute bottom-full right-0 mb-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onReuseInCampaign(image, "linkedin");
                          setShowReuseMenu(false);
                          setActionFeedback("✓ Vinculada a la publicación de LinkedIn");
                          setTimeout(() => setActionFeedback(null), 3000);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                      >
                        <Share2 className="w-4 h-4 text-sky-400" />
                        <div>
                          <div className="font-semibold">Publicación LinkedIn</div>
                          <div className="text-[10px] text-slate-400">Adjuntar a post B2B</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onReuseInCampaign(image, "newsletter");
                          setShowReuseMenu(false);
                          setActionFeedback("✓ Vinculada al boletín Mailchimp");
                          setTimeout(() => setActionFeedback(null), 3000);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition border-t border-slate-800"
                      >
                        <Mail className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="font-semibold">Newsletter Mailchimp</div>
                          <div className="text-[10px] text-slate-400">Banner o bloque de email</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Usar como base */}
              {onUseAsBase && (
                <button
                  type="button"
                  onClick={() => {
                    onUseAsBase(image.url);
                    onClose();
                  }}
                  className="bg-purple-600/90 hover:bg-purple-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                  title="Usar como imagen de referencia en el Director de Arte"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Usar como Base</span>
                </button>
              )}

              {/* Descargar HD */}
              <a
                href={image.url}
                download={`ecomshop-${image.id}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar HD</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
