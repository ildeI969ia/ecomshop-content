"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Table,
  Network,
  AlertTriangle,
  HelpCircle,
  FileText,
  CheckCircle2,
  Loader2,
  Square,
  RefreshCw
} from "lucide-react";
import {
  ArticleOutline,
  ArticleOutlineSection,
  ArticleContentType,
  SectionLevel
} from "@/lib/types/article-outline";
import { ContentOutput } from "@/lib/schema";
import { WrittenSectionResult } from "@/lib/services/deep-section-writer";

interface OutlineEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOutline: ArticleOutline;
  category?: string;
  onArticleGenerated: (content: ContentOutput) => void;
}

export function OutlineEditorModal({
  isOpen,
  onClose,
  initialOutline,
  category = "wifi",
  onArticleGenerated
}: OutlineEditorModalProps) {
  const [outline, setOutline] = useState<ArticleOutline>(initialOutline);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeWritingIndex, setActiveWritingIndex] = useState<number | null>(null);
  const [completedSections, setCompletedSections] = useState<Record<string, { wordCount: number }>>({});
  const [writtenSectionsStore, setWrittenSectionsStore] = useState<WrittenSectionResult[]>([]);
  const [totalWordsWritten, setTotalWordsWritten] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedSectionIndex, setFailedSectionIndex] = useState<number | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Comprobar si hay cambios sin guardar
  const isDirty = useMemo(() => {
    return JSON.stringify(outline) !== JSON.stringify(initialOutline);
  }, [outline, initialOutline]);

  // Sincronizar initialOutline cuando se abre o cambia
  useEffect(() => {
    setOutline(initialOutline);
    setCompletedSections({});
    setWrittenSectionsStore([]);
    setTotalWordsWritten(0);
    setErrorMsg(null);
    setFailedSectionIndex(null);
    setInlineNotice(null);
    setShowCloseConfirm(false);
  }, [initialOutline, isOpen]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleSafeClose = () => {
    if (isGenerating) {
      if (window.confirm("Hay una generación en curso. ¿Deseas cancelarla y cerrar el editor?")) {
        handleCancelGeneration();
        onClose();
      }
      return;
    }
    if (isDirty) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  const handleUpdateTitle = (title: string) => {
    setInlineNotice(null);
    setOutline((prev) => ({ ...prev, title }));
  };

  const handleUpdateMetaDescription = (metaDescription: string) => {
    setInlineNotice(null);
    setOutline((prev) => ({ ...prev, metaDescription }));
  };

  const handleUpdateTargetAudience = (targetAudience: string) => {
    setInlineNotice(null);
    setOutline((prev) => ({ ...prev, targetAudience }));
  };

  const handleUpdateSection = (index: number, updates: Partial<ArticleOutlineSection>) => {
    setInlineNotice(null);
    setOutline((prev) => {
      const updated = [...prev.sections];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, sections: updated };
    });
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    setInlineNotice(null);
    setOutline((prev) => {
      const updated = [...prev.sections];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return { ...prev, sections: updated };
    });
  };

  const handleDeleteSection = (index: number) => {
    if (outline.sections.length <= 1) {
      setInlineNotice("El artículo debe contener al menos una sección obligatoria.");
      return;
    }
    setInlineNotice(null);
    setOutline((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const handleAddSection = () => {
    setInlineNotice(null);
    const newId = `sec-${Date.now()}`;
    const newSection: ArticleOutlineSection = {
      id: newId,
      level: "H2",
      title: "Nueva Sección de Ingeniería",
      focusKeywords: ["networking", "especificaciones"],
      keyTakeaway: "Punto técnico clave a desarrollar en esta sección.",
      contentType: "TEXT"
    };
    setOutline((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setActiveWritingIndex(null);
    setProgressStatus("Generación cancelada por el usuario.");
  };

  /**
   * Orquestación Sección por Sección con AbortController y Reintento de Sección Fallida
   */
  const handleLaunchDeepWriter = async (startFromIndex = 0) => {
    setIsGenerating(true);
    setErrorMsg(null);
    setInlineNotice(null);
    setFailedSectionIndex(null);

    // Crear nuevo AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const writtenSectionsList: WrittenSectionResult[] = [...writtenSectionsStore.slice(0, startFromIndex)];
    let accumulatedSummary = writtenSectionsList
      .map((s, idx) => `\n- [${s.level}] ${s.title}: ${outline.sections[idx]?.keyTakeaway || ""}`)
      .join("");
    let runningWords = writtenSectionsList.reduce((acc, s) => acc + (s.wordCount || 0), 0);
    const totalSecs = outline.sections.length;

    try {
      // 1. Redacción interactiva sección por sección a partir de startFromIndex
      for (let i = startFromIndex; i < totalSecs; i++) {
        if (controller.signal.aborted) {
          throw new DOMException("Generación abortada por el usuario", "AbortError");
        }

        const sec = outline.sections[i];
        setActiveWritingIndex(i);
        setProgressStatus(`Redactando sección ${i + 1} de ${totalSecs}: "${sec.title.slice(0, 38)}..."`);

        const res = await fetch("/api/editorial/section-write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "WRITE_SECTION",
            outline,
            section: sec,
            previousSectionsSummary: accumulatedSummary,
            category
          }),
          signal: controller.signal
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          setFailedSectionIndex(i);
          throw new Error(errorData.error || `Error al redactar sección ${i + 1}: ${sec.title}`);
        }

        const data = await res.json();
        const writtenSec: WrittenSectionResult = data.section;
        writtenSectionsList.push(writtenSec);
        setWrittenSectionsStore([...writtenSectionsList]);

        runningWords += writtenSec.wordCount || 0;
        setTotalWordsWritten(runningWords);
        accumulatedSummary += `\n- [${sec.level}] ${sec.title}: ${sec.keyTakeaway}`;

        setCompletedSections((prev) => ({
          ...prev,
          [sec.id]: { wordCount: writtenSec.wordCount || 0 }
        }));
      }

      // 2. Ensamblado final, enlazado interno y derivación omnicanal
      setActiveWritingIndex(null);
      setProgressStatus("Enlazando términos a ecomshop.es y generando activos omnicanal (LinkedIn, Mailchimp, WhatsApp)...");

      const finalRes = await fetch("/api/editorial/section-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FINALIZE_ARTICLE",
          outline,
          writtenSections: writtenSectionsList,
          category
        }),
        signal: controller.signal
      });

      if (!finalRes.ok) {
        const errorData = await finalRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al ensamblar los activos omnicanal finales");
      }

      const finalData = await finalRes.json();
      if (finalData.contentOutput) {
        onArticleGenerated(finalData.contentOutput);
        onClose();
      } else {
        throw new Error("No se recibieron los activos multicanal generados.");
      }
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        console.log("Generación abortada voluntariamente.");
        setProgressStatus("Generación cancelada por el usuario.");
      } else {
        console.error("Error en Deep Section Writer:", err);
        setErrorMsg(err.message || "Ocurrió un error durante la redacción por secciones.");
      }
    } finally {
      setIsGenerating(false);
      setActiveWritingIndex(null);
      abortControllerRef.current = null;
    }
  };

  const renderContentTypeIcon = (type: ArticleContentType) => {
    switch (type) {
      case "COMPARISON_TABLE":
        return <Table className="w-4 h-4 text-emerald-600" />;
      case "TOPOLOGY_DIAGRAM":
        return <Network className="w-4 h-4 text-blue-600" />;
      case "INSTALLER_CALLOUT":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "FAQ":
        return <HelpCircle className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const completedCount = Object.keys(completedSections).length;
  const progressPercent = outline.sections.length > 0 ? Math.round((completedCount / outline.sections.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
              <Layers className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">The Junia Engine — Outline Técnico Interactivo</h3>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-400/20 text-indigo-200 border border-indigo-400/30 rounded-full">
                  Fase 09 Multi-Paso
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Personaliza la arquitectura semántica, tablas y callouts antes de la redacción profunda.
              </p>
            </div>
          </div>
          <button
            onClick={handleSafeClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal de confirmación si hay cambios sin guardar */}
        {showCloseConfirm && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-900 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Tienes cambios sin guardar en la estructura de secciones. ¿Seguro que deseas salir?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose();
                }}
                className="px-2.5 py-1 rounded-md bg-rose-600 font-bold text-white hover:bg-rose-500 cursor-pointer"
              >
                Descartar cambios
              </button>
            </div>
          </div>
        )}

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Mensaje de error de red con opción de reintentar sección fallida */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              {failedSectionIndex !== null && !isGenerating && (
                <button
                  type="button"
                  onClick={() => handleLaunchDeepWriter(failedSectionIndex)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer transition shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar desde sección {failedSectionIndex + 1}</span>
                </button>
              )}
            </div>
          )}

          {/* Aviso inline de validación (ej. intento de borrar única sección) */}
          {inlineNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{inlineNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setInlineNotice(null)}
                className="text-amber-600 hover:text-amber-800 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Metadatos Principales */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Título del Artículo
              </label>
              <input
                type="text"
                value={outline.title}
                onChange={(e) => handleUpdateTitle(e.target.value)}
                disabled={isGenerating}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Audiencia Objetivo
                </label>
                <input
                  type="text"
                  value={outline.targetAudience}
                  onChange={(e) => handleUpdateTargetAudience(e.target.value)}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Meta Descripción (Google Snippet)
                </label>
                <input
                  type="text"
                  value={outline.metaDescription}
                  onChange={(e) => handleUpdateMetaDescription(e.target.value)}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Lista de Secciones Editables */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Estructura de Secciones ({outline.sections.length})
                </span>
                <span className="text-xs text-slate-500">
                  {isGenerating
                    ? `• Redacción en progreso (${completedCount}/${outline.sections.length} secciones listas)`
                    : "(Cada sección será redactada con memoria contextual de las anteriores)"}
                </span>
              </div>
              <button
                onClick={handleAddSection}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Sección
              </button>
            </div>

            <div className="space-y-3">
              {outline.sections.map((section, idx) => {
                const isWriting = activeWritingIndex === idx;
                const isCompleted = Boolean(completedSections[section.id]);
                const words = completedSections[section.id]?.wordCount || 0;

                return (
                  <div
                    key={section.id}
                    className={`p-4 rounded-xl transition-all shadow-xs space-y-3 border ${
                      isWriting
                        ? "bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-400/40"
                        : isCompleted
                        ? "bg-emerald-50/30 border-emerald-300"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        {/* Indicador de Estado de Redacción en Vivo */}
                        {isWriting && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[11px] font-bold animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Redactando...</span>
                          </div>
                        )}
                        {isCompleted && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{words} palabras</span>
                          </div>
                        )}

                        {/* Nivel H2 / H3 */}
                        <select
                          value={section.level}
                          onChange={(e) =>
                            handleUpdateSection(idx, { level: e.target.value as SectionLevel })
                          }
                          disabled={isGenerating}
                          className="px-2 py-1 text-xs font-bold bg-slate-100 border border-slate-300 rounded-md text-slate-800"
                        >
                          <option value="H2">H2</option>
                          <option value="H3">H3</option>
                        </select>

                        {/* Tipo de Contenido */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md">
                          {renderContentTypeIcon(section.contentType)}
                          <select
                            value={section.contentType}
                            onChange={(e) =>
                              handleUpdateSection(idx, {
                                contentType: e.target.value as ArticleContentType
                              })
                            }
                            disabled={isGenerating}
                            className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer"
                          >
                            <option value="TEXT">Texto Técnico</option>
                            <option value="COMPARISON_TABLE">Tabla Comparativa</option>
                            <option value="TOPOLOGY_DIAGRAM">Diagrama de Topología</option>
                            <option value="INSTALLER_CALLOUT">Tip del Instalador (Callout)</option>
                            <option value="FAQ">Preguntas Frecuentes (FAQ)</option>
                          </select>
                        </div>

                        {/* Título de la sección */}
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => handleUpdateSection(idx, { title: e.target.value })}
                          disabled={isGenerating}
                          placeholder="Título de la sección..."
                          className="flex-1 px-3 py-1 text-xs font-semibold text-slate-900 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Controles de orden y eliminación */}
                      {!isGenerating && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveSection(idx, "up")}
                            disabled={idx === 0 || isGenerating}
                            title="Subir sección"
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveSection(idx, "down")}
                            disabled={idx === outline.sections.length - 1 || isGenerating}
                            title="Bajar sección"
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSection(idx)}
                            disabled={isGenerating}
                            title="Eliminar sección"
                            className="p-1 text-rose-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Fila inferior: Key Takeaway y Link Sugerido */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Conclusión de Ingeniería (Key Takeaway)
                        </label>
                        <input
                          type="text"
                          value={section.keyTakeaway}
                          onChange={(e) =>
                            handleUpdateSection(idx, { keyTakeaway: e.target.value })
                          }
                          disabled={isGenerating}
                          className="w-full px-2 py-1 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Enlace Sugerido (SKU / EcomShop)
                        </label>
                        <input
                          type="text"
                          value={section.suggestedProductLink || ""}
                          onChange={(e) =>
                            handleUpdateSection(idx, { suggestedProductLink: e.target.value })
                          }
                          disabled={isGenerating}
                          placeholder="ej: ECW536 o URL"
                          className="w-full px-2 py-1 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer con Barra de Progreso Dinámica y Acción de Lanzamiento */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full sm:w-auto">
            {isGenerating ? (
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                    <span className="truncate">{progressStatus}</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] shrink-0">
                    {completedCount}/{outline.sections.length} ({progressPercent}%) • {totalWordsWritten} palabras
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {outline.sections.length} secciones preparadas • Enlazado interno automático activado
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {isGenerating ? (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="px-4 py-2 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Cancelar generación en curso"
              >
                <Square className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                <span>Cancelar generación</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSafeClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            )}
            <button
              onClick={() => handleLaunchDeepWriter(0)}
              disabled={isGenerating || outline.sections.length === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-md hover:shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redactando ({completedCount}/{outline.sections.length})...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Redactar Artículo Completo (The Junia Engine)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
