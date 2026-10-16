"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Eye, Sparkles } from "lucide-react";
import { SafeHtml } from "@/components/SafeHtml";
import { PhotoPlacement } from "@/lib/services/visual-planner";
import {
  EditableArticleSection,
  parseHtmlIntoEditableSections,
  serializeEditableSectionsToHtml,
  buildSectionPhotoSuggestion
} from "@/lib/editorial-photo-suggester";
import { WysiwygToolbar, EditorViewMode } from "./WysiwygToolbar";
import { PhotoSlotCard } from "./PhotoSlotCard";

interface EditableHtmlBlockProps {
  sectionId: string;
  initialHtml: string;
  onChangeHtml: (sectionId: string, newHtml: string) => void;
}

const EditableHtmlBlock: React.FC<EditableHtmlBlockProps> = ({
  sectionId,
  initialHtml,
  onChangeHtml
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmittedHtmlRef = useRef<string>(initialHtml);

  useEffect(() => {
    if (ref.current && initialHtml !== lastEmittedHtmlRef.current) {
      ref.current.innerHTML = initialHtml;
      lastEmittedHtmlRef.current = initialHtml;
    }
  }, [initialHtml]);

  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) {
      ref.current.innerHTML = initialHtml;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = () => {
    if (!ref.current) return;
    const current = ref.current.innerHTML;
    lastEmittedHtmlRef.current = current;
    onChangeHtml(sectionId, current);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleInput}
      className="prose prose-slate max-w-none bg-white text-slate-900 rounded-xl p-5 border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none text-[15px] leading-relaxed shadow-xs transition [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-950 [&_h2]:mt-1 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-3 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_a]:text-indigo-600 [&_a]:underline"
    />
  );
};

interface RichArticleEditorProps {
  htmlContent: string;
  onChangeHtmlContent: (html: string) => void;
  sku: string;
  articleTitle: string;
  featuredImageUrl?: string;
  existingPlacements?: PhotoPlacement[];
  onOpenImageStudio?: (prompt: string) => void;
}

export const RichArticleEditor: React.FC<RichArticleEditorProps> = ({
  htmlContent,
  onChangeHtmlContent,
  sku,
  articleTitle,
  featuredImageUrl,
  existingPlacements = [],
  onOpenImageStudio
}) => {
  const [viewMode, setViewMode] = useState<EditorViewMode>("SPLIT_LIVE");
  const [sections, setSections] = useState<EditableArticleSection[]>(() =>
    parseHtmlIntoEditableSections(htmlContent, sku, existingPlacements)
  );

  const syncSectionsToParent = useCallback(
    (nextSections: EditableArticleSection[]) => {
      setSections(nextSections);
      const serialized = serializeEditableSectionsToHtml(nextSections);
      onChangeHtmlContent(serialized);
    },
    [onChangeHtmlContent]
  );

  const handleChangeViewMode = (nextMode: EditorViewMode) => {
    if (viewMode === "HTML_CODE" && nextMode !== "HTML_CODE") {
      setSections(parseHtmlIntoEditableSections(htmlContent, sku, existingPlacements));
    }
    setViewMode(nextMode);
  };

  const handleExecCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handleSectionHtmlChange = (sectionId: string, newBodyHtml: string) => {
    const nextSections = sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const h2Match = newBodyHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      const headingText = h2Match
        ? h2Match[1].replace(/<[^>]*>/g, " ").trim()
        : sec.headingText;
      return {
        ...sec,
        headingText,
        bodyHtml: newBodyHtml
      };
    });
    syncSectionsToParent(nextSections);
  };

  const handleInsertOrUpdateSectionImage = (
    sectionId: string,
    image: { imageUrl: string; altText: string; caption: string } | undefined
  ) => {
    const nextSections = sections.map((sec) =>
      sec.id === sectionId ? { ...sec, existingImage: image } : sec
    );
    syncSectionsToParent(nextSections);
  };

  const handleAddNewSection = () => {
    const nextIndex = sections.length;
    const defaultHeading = "Nueva Sección Técnica";
    const defaultHtml = `<h2>${defaultHeading}</h2><p>Desarrolla aquí el argumento técnico, criterios de diseño o recomendaciones de despliegue para ${sku}...</p>`;
    const newSec: EditableArticleSection = {
      id: `sec-${Date.now()}`,
      index: nextIndex,
      headingText: defaultHeading,
      bodyHtml: defaultHtml,
      suggestedPhoto: buildSectionPhotoSuggestion(sku, defaultHeading, defaultHtml, nextIndex)
    };
    syncSectionsToParent([...sections, newSec]);
  };

  const insertedPhotosCount = sections.filter((s) => Boolean(s.existingImage?.imageUrl)).length;

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-950/80 overflow-hidden flex flex-col">
      <WysiwygToolbar
        viewMode={viewMode}
        onChangeViewMode={handleChangeViewMode}
        onExecCommand={handleExecCommand}
        characterCount={htmlContent.length}
        photoCount={insertedPhotosCount}
      />

      {/* Leyenda informativa de ayuda */}
      {viewMode !== "HTML_CODE" && (
        <div className="bg-indigo-950/40 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-indigo-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              <strong>Edición Directa WYSIWYG:</strong> Haz clic en cualquier párrafo o título para editarlo en vivo. Entre cada sección el sistema te indica <strong>dónde insertar fotografías</strong> y el <strong>prompt IA listo para usar</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddNewSection}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span>Añadir Sección H2</span>
          </button>
        </div>
      )}

      {/* MODO 1 Y 2: BLOQUES WYSIWYG + GUÍA DE FOTOS IA (SOLO O DIVIDIDO CON VISTA PREVIA) */}
      {viewMode !== "HTML_CODE" ? (
        <div
          className={`grid gap-6 p-4 sm:p-5 ${
            viewMode === "SPLIT_LIVE" ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"
          }`}
        >
          {/* Columna de Edición Visual por Secciones + Sugerencias de Fotos */}
          <div className={viewMode === "SPLIT_LIVE" ? "lg:col-span-7 space-y-5" : "space-y-5"}>
            {sections.map((section, idx) => (
              <div
                key={section.id}
                className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-3.5 sm:p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="uppercase tracking-wider text-indigo-300 font-bold">
                    Bloque Editorial {idx + 1}: {section.headingText || "Introducción / Apertura"}
                  </span>
                  <span>Editable en vivo</span>
                </div>

                <EditableHtmlBlock
                  sectionId={section.id}
                  initialHtml={section.bodyHtml}
                  onChangeHtml={handleSectionHtmlChange}
                />

                {/* Tarjeta Indicadora de Foto y Prompt IA tras la sección */}
                <PhotoSlotCard
                  section={section}
                  sku={sku}
                  onInsertOrUpdateImage={handleInsertOrUpdateSectionImage}
                  onOpenImageStudio={onOpenImageStudio}
                />
              </div>
            ))}
          </div>

          {/* Columna de Resultado / Vista Previa Real en Vivo (en modo SPLIT_LIVE) */}
          {viewMode === "SPLIT_LIVE" && (
            <div className="lg:col-span-5 flex flex-col">
              <div className="sticky top-14 rounded-2xl border border-slate-700 bg-white text-slate-900 shadow-xl overflow-hidden flex flex-col max-h-[75vh]">
                <div className="bg-slate-900 text-slate-200 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Resultado en Vivo (Blog Público)</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    Sincronizado
                  </span>
                </div>

                <div className="p-5 overflow-y-auto space-y-4">
                  {featuredImageUrl && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                      <img
                        src={featuredImageUrl}
                        alt={articleTitle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <h1 className="text-xl font-extrabold text-slate-950 leading-snug">
                    {articleTitle}
                  </h1>

                  <SafeHtml
                    className="prose prose-slate max-w-none text-sm leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-5 [&_h2]:mb-2 [&_p]:mb-3 [&_figure]:my-5 [&_img]:rounded-xl"
                    html={htmlContent}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MODO 3: EDITOR DE CÓDIGO HTML */
        <div className="p-4">
          <textarea
            rows={18}
            value={htmlContent}
            onChange={(e) => onChangeHtmlContent(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 leading-relaxed focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
};
