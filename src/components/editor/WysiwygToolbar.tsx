"use client";

import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  RemoveFormatting,
  Sparkles,
  Columns,
  Code,
  Wand2
} from "lucide-react";

export type EditorViewMode = "BLOCKS_AI" | "SPLIT_LIVE" | "HTML_CODE";

interface WysiwygToolbarProps {
  viewMode: EditorViewMode;
  onChangeViewMode: (mode: EditorViewMode) => void;
  onExecCommand: (command: string, value?: string) => void;
  onAutoFormat?: () => void;
  characterCount: number;
  photoCount: number;
}

export const WysiwygToolbar: React.FC<WysiwygToolbarProps> = ({
  viewMode,
  onChangeViewMode,
  onExecCommand,
  onAutoFormat,
  characterCount,
  photoCount
}) => {
  const handleInsertLink = () => {
    const url = window.prompt("Introduce la URL del enlace (ej. https://ecomshop.es/...):", "https://");
    if (url && url !== "https://") {
      onExecCommand("createLink", url);
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-t-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10 shadow-md">
      {/* Botones de formato WYSIWYG */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onExecCommand("formatBlock", "H2");
          }}
          title="Título de Sección (H2)"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onExecCommand("formatBlock", "H3");
          }}
          title="Subtítulo Técnico (H3)"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-0.5" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onExecCommand("bold");
          }}
          title="Negrita"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onExecCommand("italic");
          }}
          title="Cursiva"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onExecCommand("underline");
          }}
          title="Subrayado"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-0.5" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onExecCommand("insertUnorderedList");
          }}
          title="Lista de viñetas"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onExecCommand("insertOrderedList");
          }}
          title="Lista numerada"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onExecCommand("formatBlock", "BLOCKQUOTE");
          }}
          title="Cita o Destacado Técnico"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleInsertLink();
          }}
          title="Insertar enlace"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onExecCommand("removeFormat");
          }}
          title="Limpiar formato"
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>

        {onAutoFormat && (
          <>
            <div className="w-px h-4 bg-slate-800 mx-0.5" />
            <button
              type="button"
              onClick={onAutoFormat}
              title="Maquetar automáticamente el artículo con títulos, subtítulos, negritas y llamadas destacadas"
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Maquetar Automático</span>
            </button>
          </>
        )}
      </div>

      {/* Selector de Modo de Edición y Contadores */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono text-slate-400 mr-1">
          <span>{characterCount} car.</span>
          <span>·</span>
          <span className="text-emerald-400">{photoCount} fotos en texto</span>
        </div>

        <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onChangeViewMode("BLOCKS_AI")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === "BLOCKS_AI"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>WYSIWYG + Guía Fotos IA</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode("SPLIT_LIVE")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === "SPLIT_LIVE"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Vista Dividida en Vivo</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode("HTML_CODE")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === "HTML_CODE"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code className="w-3 h-3" />
            <span>HTML</span>
          </button>
        </div>
      </div>
    </div>
  );
};
