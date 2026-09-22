"use client";

import React from "react";
import { Wand2, Sparkles, Check, ArrowRight, Lightbulb, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface PromptRefinement {
  originalIdea: string;
  improvedPrompt: string;
  cameraDetails: string;
  improvements: string[];
  suggestedAspectRatio: "16:9" | "1:1" | "4:3";
}

export type PromptRefinementData = PromptRefinement;

interface PromptRefinementCardProps {
  refinement: PromptRefinement | null;
  loading: boolean;
  onApply: (improvedPrompt: string, aspectRatio: "16:9" | "1:1" | "4:3") => void;
  onApplyAndGenerate?: (improvedPrompt: string, aspectRatio: "16:9" | "1:1" | "4:3") => void;
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
      <div className="flex items-center justify-between gap-2 bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 transition">
        <div className="flex items-center gap-2 text-xs text-indigo-200">
          <Wand2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            {isPromptShort ? (
              <>
                <strong className="font-semibold text-white">Idea básica detectada:</strong> ¿Quieres enriquecerla con óptica, texturas y luces de estudio?
              </>
            ) : (
              "¿Quieres cualificar tu prompt para obtener máximo fotorrealismo en Vertex AI?"
            )}
          </span>
        </div>

        <Button
          type="button"
          variant="primary"
          size="xs"
          onClick={onRequestRefine}
          disabled={loading || !currentPrompt.trim()}
          title="Analizar y cualificar el prompt con el Director de Arte IA"
          className="shrink-0"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
              <span>Cualificando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-amber-300 mr-1.5" />
              <span>Cualificar Prompt</span>
            </>
          )}
        </Button>
      </div>
    );
  }

  // Si hay una recomendación activa
  return (
    <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3.5 shadow-md flex flex-col gap-2.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-xs">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Propuesta Cualificada del Director Fotográfico IA</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1"
          title="Cerrar sugerencia y mantener prompt actual"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {/* Tu idea */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-400" />
            Tu Idea Original:
          </div>
          <p className="text-[11px] text-slate-300 italic line-clamp-3">
            "{refinement.originalIdea}"
          </p>
        </div>

        {/* Recomendación Cualificada */}
        <div className="bg-indigo-950/60 text-indigo-100 rounded-lg p-2.5 flex flex-col justify-between border border-indigo-800 shadow-2xs">
          <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1 flex items-center gap-1">
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
        <Badge variant="cyan" size="xs">
          <Camera className="w-3 h-3 mr-1" />
          {refinement.cameraDetails}
        </Badge>
        {refinement.improvements.slice(0, 3).map((imp, idx) => (
          <Badge key={idx} variant="success" size="xs">
            <Check className="w-3 h-3 mr-1" />
            {imp}
          </Badge>
        ))}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white"
        >
          Mantener mi texto
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={() => onApply(refinement.improvedPrompt, refinement.suggestedAspectRatio)}
          className="border-indigo-500/40 text-indigo-200 hover:text-white"
        >
          <Check className="w-3.5 h-3.5 mr-1.5" />
          <span>Aplicar Prompt Recomendado</span>
        </Button>

        {onApplyAndGenerate && (
          <Button
            type="button"
            variant="primary"
            size="xs"
            onClick={() => onApplyAndGenerate(refinement.improvedPrompt, refinement.suggestedAspectRatio)}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            <span>Aplicar y Generar Ya</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
