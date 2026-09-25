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

export type TargetAudienceType = "INSTALADOR_B2B" | "EMPRESA_PYME" | "CLIENTE_B2C";

export interface AudienceOption {
  id: TargetAudienceType;
  label: string;
  badge: string;
  contextDesc: string;
}

export const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    id: "INSTALADOR_B2B",
    label: "Instalador B2B",
    badge: "PoE++, Wi-Fi 7, Garantía",
    contextDesc: "PoE++, Wi-Fi 7, certificaciones, ancho de banda, garantía profesional"
  },
  {
    id: "EMPRESA_PYME",
    label: "Empresa / Pyme",
    badge: "Continuidad, ROI, Soporte",
    contextDesc: "Continuidad de negocio, seguridad, soporte y ROI"
  },
  {
    id: "CLIENTE_B2C",
    label: "Cliente Final B2C",
    badge: "Sencillez, Ahorro, Facilidad",
    contextDesc: "Sencillez, velocidad real, ahorro y fácil configuración"
  }
];

interface CampaignStepperProps {
  currentStage: GenerationStage;
  errorMessage?: string | null;
  onRetry?: () => void;
  activeSku?: string;
  activeAngle?: string;
  selectedAudience?: TargetAudienceType;
  onSelectAudience?: (audience: TargetAudienceType) => void;
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
    label: "1. Producto",
    sublabel: "Selección de SKU y datos de ecomshop.es",
    icon: Globe
  },
  {
    key: "NOTEBOOK_GROUNDING",
    label: "2. Enfoque",
    sublabel: "Alineación de target y matriz de objeciones",
    icon: BookOpen
  },
  {
    key: "GENERATING_CHANNELS",
    label: "3. Borrador",
    sublabel: "Generación de activos multicanal B2B",
    icon: Sparkles
  },
  {
    key: "FACT_CHECKING",
    label: "4. Revisión",
    sublabel: "Edición dos columnas y fact-checking",
    icon: ShieldCheck
  },
  {
    key: "COMPLETED",
    label: "5. Aprobar",
    sublabel: "Verificación de fidelidad y reglas",
    icon: CheckCircle2
  }
];

export const CampaignStepper: React.FC<CampaignStepperProps> = ({
  currentStage,
  errorMessage,
  onRetry,
  activeSku,
  activeAngle,
  selectedAudience,
  onSelectAudience
}) => {
  const [isRetrying, setIsRetrying] = React.useState(false);

  // Restablecer el estado de retry cuando cambie el stage
  React.useEffect(() => {
    setIsRetrying(false);
  }, [currentStage]);

  if (currentStage === "IDLE") return null;

  const handleRetryClick = async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      // Breve margen visual para evitar parpadeos o dobles clics
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

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
        <div className="text-xs text-slate-400 font-mono" aria-live="polite" aria-atomic="true">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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

              {step.key === "NOTEBOOK_GROUNDING" && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] font-semibold tracking-wider text-sky-400 uppercase block">
                    Audiencia Target:
                  </span>
                  <div className="flex flex-col gap-1">
                    {AUDIENCE_OPTIONS.map((aud) => {
                      const isSelected = (selectedAudience || "INSTALADOR_B2B") === aud.id;
                      return (
                        <button
                          key={aud.id}
                          type="button"
                          onClick={() => onSelectAudience?.(aud.id)}
                          className={`text-left text-[10px] px-2 py-1 rounded transition border cursor-pointer ${
                            isSelected
                              ? "bg-sky-900/70 border-sky-400 text-sky-100 font-bold"
                              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          }`}
                          title={aud.contextDesc}
                        >
                          <div className="flex items-center justify-between">
                            <span>{aud.label}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {currentStage === "ERROR" && (
        <div className="mt-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs" aria-live="assertive">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage || "Error al procesar la campaña multicanal."}</span>
          </div>
          {onRetry && (
            <button
              onClick={handleRetryClick}
              disabled={isRetrying}
              aria-label="Reintentar pipeline"
              className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
              <span>{isRetrying ? "Reintentando..." : "Reintentar"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
