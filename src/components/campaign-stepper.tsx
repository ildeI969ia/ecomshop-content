"use client";

import React from "react";
import { 
  Globe, 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw
} from "lucide-react";

export type GenerationStage = 
  | "IDLE" 
  | "EXTRACTING" 
  | "NOTEBOOK_GROUNDING" 
  | "GENERATING_CHANNELS" 
  | "FACT_CHECKING" 
  | "COMPLETED" 
  | "ERROR";

interface CampaignStepperProps {
  currentStage: GenerationStage;
  errorMessage?: string | null;
  onRetry?: () => void;
  activeSku?: string;
  activeAngle?: string;
}

interface StepDef {
  key: GenerationStage;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  {
    key: "EXTRACTING",
    label: "1. Extracción ecomshop.es",
    sublabel: "Scraping de SKU, especificaciones y ficha técnica",
    icon: Globe
  },
  {
    key: "NOTEBOOK_GROUNDING",
    label: "2. Grounding NotebookLM",
    sublabel: "Alineación de catálogo y matriz de objeciones",
    icon: BookOpen
  },
  {
    key: "GENERATING_CHANNELS",
    label: "3. Redacción Multicanal",
    sublabel: "Blog Durable, Mailchimp, WhatsApp y LinkedIn",
    icon: Sparkles
  },
  {
    key: "FACT_CHECKING",
    label: "4. Fact-Checking EvidenceEngine",
    sublabel: "Auditoría de claims técnicos y sanitización HTML",
    icon: ShieldCheck
  }
];

export const CampaignStepper: React.FC<CampaignStepperProps> = ({
  currentStage,
  errorMessage,
  onRetry,
  activeSku,
  activeAngle
}) => {
  if (currentStage === "IDLE") return null;

  const stageOrder: GenerationStage[] = [
    "EXTRACTING",
    "NOTEBOOK_GROUNDING",
    "GENERATING_CHANNELS",
    "FACT_CHECKING",
    "COMPLETED"
  ];

  const currentIdx = stageOrder.indexOf(currentStage === "ERROR" ? "FACT_CHECKING" : currentStage);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg text-white mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
          <h3 className="font-semibold text-sm tracking-wide text-slate-100 flex items-center gap-2">
            <span>Pipeline de Generación de Campaña</span>
            {activeSku && (
              <span className="bg-sky-950 text-sky-300 text-xs px-2 py-0.5 rounded font-mono border border-sky-800">
                {activeSku}
              </span>
            )}
            {activeAngle && (
              <span className="bg-emerald-950 text-emerald-300 text-[11px] px-2 py-0.5 rounded uppercase font-semibold border border-emerald-800">
                {activeAngle}
              </span>
            )}
          </h3>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {currentStage === "COMPLETED" && (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Pipeline Completado
            </span>
          )}
          {currentStage === "ERROR" && (
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Error en Pipeline
            </span>
          )}
          {currentStage !== "COMPLETED" && currentStage !== "ERROR" && (
            <span className="text-sky-300 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando en vivo...
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = currentStage === "COMPLETED" || (currentStage !== "ERROR" && currentIdx > idx);
          const isCurrent = (currentStage === step.key) || (currentStage === "ERROR" && currentIdx === idx);

          return (
            <div
              key={step.key}
              className={`rounded-lg p-3.5 border transition-all flex flex-col justify-between ${
                isCompleted
                  ? "bg-emerald-950/30 border-emerald-700/50 text-emerald-100"
                  : isCurrent
                  ? currentStage === "ERROR"
                    ? "bg-rose-950/40 border-rose-600 text-rose-100 ring-1 ring-rose-500/50"
                    : "bg-sky-950/40 border-sky-500 text-sky-100 ring-1 ring-sky-500/40"
                  : "bg-slate-950/60 border-slate-800/80 text-slate-500 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold tracking-wider">
                  0{idx + 1}
                </span>
                <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    currentStage === "ERROR" ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    )
                  ) : (
                    <Icon className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold leading-tight mb-1 text-slate-200">
                  {step.label}
                </p>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {step.sublabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {currentStage === "ERROR" && (
        <div className="mt-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage || "Error al procesar la campaña multicanal."}</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
