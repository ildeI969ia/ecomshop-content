"use client";

import React from "react";
import { Sparkles, Check, ArrowRight, Wand2, Lightbulb, Camera, X } from "lucide-react";

export interface PromptRefinementData {
  originalIdea: string;
  improvedPrompt: string;
  cameraDetails: string;
  improvements: string[];
  suggestedAspectRatio: "16:9" | "1:1" | "4:3";
}

interface PromptRefinementCardProps {
  refinement: PromptRefinementData | null;
  loading: boolean;
  onApply: (improvedPrompt: string, aspectRatio?: "16:9" | "1:1" | "4:3") => void;
  onApplyAndGenerate?: (improvedPrompt: string, aspectRatio?: "16:9" | "1:1" | "4:3") => void;
  onDismiss: () => void;
  onRequestRefine: () => void;
  currentPrompt: string;
}

export function PromptRefinementCard({
  refinement,
  loading,
  onApply,
  onApplyAndGenerate,
  onDismiss,
  onRequestRefine,
  currentPrompt,
}: PromptRefinementCardProps) {
  const isPromptShort = currentPrompt.trim().length > 0 && currentPrompt.trim().length < 65;

  // Si no hay recomendación calculada pero el usuario puede solicitarla
  if (!refinement) {
    return (
      <div className="flex items-center justify-between gap-2 bg-purple-50/60 border border-purple-200/80 rounded-lg p-2.5 transition">
        <div className="flex items-center gap-2 text-[11px] text-purple-900">
          <Wand2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>
            {isPromptShort ? (
              <>
                <strong className="font-semibold">Idea básica detectada:</strong> ¿Quieres enriquecerla con óptica, texturas y luces de estudio?
              </>
            ) : (
              "¿Quieres cualificar tu prompt para obtener máximo fotorrealismo en Vertex AI?"
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={onRequestRefine}
          disabled={loading || !currentPrompt.trim()}
          className="shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold px-2.5 py-1 rounded text-[10px] flex items-center gap-1.5 transition shadow-2xs"
          title="Analizar y cualificar el prompt con el Director de Arte IA"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Cualificando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Cualificar Prompt</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // Si hay una recomendación activa
  return (
    <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-sky-50/80 border border-purple-300/80 rounded-xl p-3.5 shadow-xs flex flex-col gap-2.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-purple-200/70 pb-2">
        <div className="flex items-center gap-1.5 text-purple-950 font-bold text-xs">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Propuesta Cualificada del Director Fotográfico IA</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
          title="Cerrar sugerencia y mantener prompt actual"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {/* Tu idea */}
        <div className="bg-white/80 border border-slate-200/80 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            Tu Idea Original:
          </div>
          <p className="text-[11px] text-slate-700 italic line-clamp-3">
            "{refinement.originalIdea}"
          </p>
        </div>

        {/* Recomendación Cualificada */}
        <div className="bg-purple-950 text-purple-100 rounded-lg p-2.5 flex flex-col justify-between border border-purple-800 shadow-2xs">
          <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Camera className="w-3 h-3 text-sky-400" />
            Prompt Profesional Recomendado:
          </div>
          <p className="text-[11px] text-slate-100 font-mono leading-relaxed max-h-24 overflow-y-auto pr-1">
            {refinement.improvedPrompt}
          </p>
        </div>
      </div>

      {/* Detalles técnicos aplicados */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <span className="text-[10px] bg-sky-100/90 text-sky-900 font-medium px-2 py-0.5 rounded-full border border-sky-200 flex items-center gap-1">
          <Camera className="w-3 h-3 text-sky-600" />
          {refinement.cameraDetails}
        </span>
        {refinement.improvements.slice(0, 3).map((imp, idx) => (
          <span
            key={idx}
            className="text-[10px] bg-emerald-100/80 text-emerald-900 font-medium px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1"
          >
            <Check className="w-3 h-3 text-emerald-600" />
            {imp}
          </span>
        ))}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-200/60">
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-slate-600 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/50 transition font-medium"
        >
          Mantener mi texto
        </button>

        <button
          type="button"
          onClick={() => onApply(refinement.improvedPrompt, refinement.suggestedAspectRatio)}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Aplicar Prompt Recomendado</span>
        </button>

        {onApplyAndGenerate && (
          <button
            type="button"
            onClick={() => onApplyAndGenerate(refinement.improvedPrompt, refinement.suggestedAspectRatio)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs"
          >
            <span>Aplicar y Generar Ya</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
