"use client";

import React, { useState } from "react";
import { 
  Radar, 
  TrendingUp, 
  Package, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  Flame, 
  Award, 
  CheckCircle2, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Shuffle,
  Target,
  Send,
  X,
  FileText,
  DollarSign
} from "lucide-react";
import { ProductOpportunityRecord } from "@/lib/services/opportunity-radar";
import { BusinessGoal } from "@/lib/types/editorial-controls";

export const BUSINESS_GOAL_PILLS: Array<{ id: BusinessGoal; label: string }> = [
  { id: "ALL_OPPORTUNITIES", label: "⚡ Todas" },
  { id: "WIFI7_MULTIGIG_EXPANSION", label: "🚀 Expansión Wi-Fi 7 & Multi-Gig" },
  { id: "HOSPITALITY_SOLUTIONS", label: "🏨 Soluciones Hospitality" },
  { id: "SWITCHING_POE_BACKBONE", label: "🔌 Switching PoE & Backbone" },
  { id: "STOCK_CLEARANCE_PROMO", label: "📦 Liquidación & Alta Rotación" }
];

interface OpportunityRadarWidgetProps {
  opportunities: ProductOpportunityRecord[];
  isLoading: boolean;
  onSelectOpportunity?: (opp: ProductOpportunityRecord) => void;
  onLaunchCampaign?: (opp: ProductOpportunityRecord) => void;
  launchingSku?: string | null;
  onRegenerateRadar?: () => void;
  isRegeneratingRadar?: boolean;
  onReplaceOpportunity?: (
    opp: ProductOpportunityRecord,
    newSku?: string,
    customDirective?: string,
    newAngle?: "ROI" | "PERFORMANCE" | "OPERATIONS"
  ) => void;
  isReplacingSku?: string | null;
  selectedBusinessGoal?: BusinessGoal;
  onSelectBusinessGoal?: (goal: BusinessGoal) => void;
}

export const OpportunityRadarWidget: React.FC<OpportunityRadarWidgetProps> = ({
  opportunities,
  isLoading,
  onSelectOpportunity,
  onLaunchCampaign,
  launchingSku,
  onRegenerateRadar,
  isRegeneratingRadar = false,
  onReplaceOpportunity,
  isReplacingSku = null,
  selectedBusinessGoal = "ALL_OPPORTUNITIES",
  onSelectBusinessGoal
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replacingCardId, setReplacingCardId] = useState<string | null>(null);
  const [customDirectives, setCustomDirectives] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-6 h-6 bg-slate-800 rounded-full" />
          <div className="h-5 bg-slate-800 rounded w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-800/60 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-5 mb-8 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: "12s" }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Radar de Oportunidades Diarias (Product Brain)
              </h3>
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full border border-indigo-400/30 font-mono">
                Autopilot
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Clasificación algorítmica por Stock, Gap de Contenido, Tendencia B2B y NotebookLM Grounding.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onRegenerateRadar && (
            <button
              type="button"
              onClick={onRegenerateRadar}
              disabled={isRegeneratingRadar || isLoading}
              className="bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-500/40 text-indigo-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-300 ${isRegeneratingRadar ? "animate-spin" : ""}`} />
              <span>{isRegeneratingRadar ? "Regenerando..." : "Regenerar Radar (IA + NotebookLM)"}</span>
            </button>
          )}
          <div className="hidden sm:flex items-center text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping" />
            Actualizado con Master Notebook (20 fuentes)
          </div>
        </div>
      </div>

      {/* Selector de Objetivos de Negocio (Horizontal Pills) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-3 border-b border-slate-800/80">
        <span className="text-xs text-slate-400 font-semibold mr-1">Objetivo B2B:</span>
        {BUSINESS_GOAL_PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => onSelectBusinessGoal?.(pill.id)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition ${
              selectedBusinessGoal === pill.id
                ? "bg-indigo-600 text-white shadow-md border border-indigo-400/50"
                : "bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {opportunities.map((opp, idx) => {
          const isExpanded = expandedId === opp.id;
          const isReplacing = replacingCardId === opp.id;
          const score = opp.scores.totalScore;
          const isThisSkuReplacing = isReplacingSku === opp.sku;

          return (
            <div
              key={opp.id}
              className={`bg-slate-950/90 hover:bg-slate-900/95 border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
                isReplacing ? "border-amber-500/60 ring-1 ring-amber-500/30" : "border-slate-800 hover:border-indigo-500/50"
              }`}
            >
              <div>
                {/* Cabecera Tarjeta: Posición, SKU, Ángulo y Score */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="bg-indigo-950 text-indigo-200 text-xs font-mono font-bold px-2.5 py-1 rounded border border-indigo-800/80">
                      #{idx + 1} {opp.sku}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60">
                      {opp.recommendedAngle}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span className="text-base font-bold text-white font-mono">{score}/100</span>
                  </div>
                </div>

                {/* NotebookLM Citations Pill */}
                {opp.notebookCitations && opp.notebookCitations.length > 0 && (
                  <div className="mb-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-950/70 border border-indigo-700/50 text-indigo-200 px-2.5 py-1 rounded font-mono">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate max-w-[320px]">
                        {opp.notebookCitations[0].id}: {opp.notebookCitations[0].title}
                      </span>
                    </span>
                  </div>
                )}

                {/* Título de Campaña y Target */}
                <h4 className="text-base font-bold text-slate-100 line-clamp-1 mb-1.5">
                  {opp.actionTitle}
                </h4>
                <div className="flex items-center justify-between text-sm text-slate-300 mb-2.5">
                  <span>Target: <strong className="text-white font-semibold">{opp.targetSegment}</strong></span>
                  <span className="text-xs font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded shrink-0">
                    {opp.pricingCondition || "Tarifa B2B (Consultar)"}
                  </span>
                </div>

                {/* Ancla Narrativa */}
                {opp.narrativeAnchor && (
                  <div className="mb-2.5 text-xs text-indigo-100 bg-indigo-950/50 border border-indigo-800/50 px-3 py-1.5 rounded-lg leading-relaxed">
                    <span className="font-semibold text-indigo-300">⚓ Ancla:</span> {opp.narrativeAnchor.pitch30s.slice(0, 110)}...
                  </div>
                )}

                {/* Fit Editorial Explicado */}
                {opp.editorialFit && (
                  <div className="mb-3 text-xs text-sky-200 bg-sky-950/50 border border-sky-800/40 px-3 py-1.5 rounded-lg leading-relaxed">
                    🎯 {opp.editorialFit}
                  </div>
                )}

                {/* Bundle Cross-sell */}
                <div className="bg-slate-900/90 rounded-lg border border-slate-800/80 p-3 mb-3.5 text-sm">
                  <div className="flex items-center text-xs font-semibold text-indigo-300 mb-1">
                    <Package className="w-3.5 h-3.5 mr-1.5" />
                    Bundle Sugerido:
                  </div>
                  <div className="text-slate-100 font-semibold text-sm">
                    + {opp.suggestedBundle.accessorySku} ({opp.suggestedBundle.accessoryName})
                  </div>
                  <div className="text-xs text-slate-400 mt-1 leading-normal">
                    {opp.suggestedBundle.rationale}
                  </div>
                </div>

                {/* Panel Interactivo: "Si no te convence, cambiar propuesta" */}
                {isReplacing && (
                  <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-3 mb-3 text-xs space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-amber-300 font-semibold text-[11px]">
                      <span className="flex items-center gap-1">
                        <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                        ¿No te convence esta propuesta?
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplacingCardId(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Alternativas rápidas de catálogo */}
                    {opp.alternativeOptions && opp.alternativeOptions.length > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">
                          Sustituir por otra opción del Master Notebook:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {opp.alternativeOptions.map(alt => (
                            <button
                              key={alt.sku}
                              type="button"
                              disabled={Boolean(isThisSkuReplacing)}
                              onClick={() => {
                                if (onReplaceOpportunity) {
                                  onReplaceOpportunity(opp, alt.sku);
                                  setReplacingCardId(null);
                                }
                              }}
                              className="text-left bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/60 p-1.5 rounded text-[11px] transition text-slate-200 flex items-center justify-between group"
                            >
                              <div>
                                <span className="font-semibold text-amber-300">{alt.sku}</span> - {alt.model}
                                <div className="text-[10px] text-slate-400">{alt.pitchPreview}</div>
                              </div>
                              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-amber-300 shrink-0 ml-1" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cambiar enfoque / ángulo de la misma propuesta */}
                    <div className="pt-1.5 border-t border-amber-800/40">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        O cambiar el ángulo de venta:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(["ROI", "PERFORMANCE", "OPERATIONS"] as const).map(angle => (
                          <button
                            key={angle}
                            type="button"
                            disabled={Boolean(isThisSkuReplacing) || opp.recommendedAngle === angle}
                            onClick={() => {
                              if (onReplaceOpportunity) {
                                onReplaceOpportunity(opp, undefined, undefined, angle);
                                setReplacingCardId(null);
                              }
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded border transition ${
                              opp.recommendedAngle === angle
                                ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
                                : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            {angle === "ROI" ? "💰 ROI / TCO" : angle === "PERFORMANCE" ? "⚡ Rendimiento" : "🛠️ Operaciones"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pedir personalización específica con directiva */}
                    <div className="pt-1.5 border-t border-amber-800/40">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        ¿Buscas algo específico? (Ej: "exterior", "switch 24p"):
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customDirectives[opp.id] || ""}
                          onChange={(e) => setCustomDirectives(prev => ({ ...prev, [opp.id]: e.target.value }))}
                          placeholder="Ej: Prefiero switch para CCTV o AP IP67..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          disabled={Boolean(isThisSkuReplacing) || !customDirectives[opp.id]}
                          onClick={() => {
                            if (onReplaceOpportunity) {
                              onReplaceOpportunity(opp, undefined, customDirectives[opp.id]);
                              setReplacingCardId(null);
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold p-1 rounded transition"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detalle Product Brain Expandible */}
                {isExpanded && opp.productBrainProfile && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-2">
                    <div className="text-indigo-400 font-semibold flex items-center">
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Pitch 30s ({opp.productBrainProfile.buyerPersonas[0]?.name.split(" ")[0]}):
                    </div>
                    <p className="text-slate-300 text-[11px] italic bg-slate-900 p-2 rounded border border-slate-800">
                      "{opp.productBrainProfile.buyerPersonas[0]?.pitchIn30Seconds}"
                    </p>

                    <div className="text-amber-400 font-semibold flex items-center pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Objeción Comercial Frecuente:
                    </div>
                    <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded">
                      <span className="text-slate-300 font-medium">P:</span> {opp.productBrainProfile.objectionLedger[0]?.objection}
                      <div className="mt-1 text-emerald-300">
                        <span className="font-semibold">R:</span> {opp.productBrainProfile.objectionLedger[0]?.counterArgument}
                      </div>
                    </div>

                    {opp.notebookCitations && opp.notebookCitations.length > 1 && (
                      <div className="pt-1">
                        <div className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mb-1">
                          Fuentes Master Notebook Citadas:
                        </div>
                        <ul className="space-y-1 text-[10px] text-slate-400">
                          {opp.notebookCitations.map(cite => (
                            <li key={cite.id} className="flex items-start gap-1">
                              <span className="text-indigo-400 font-mono">[{cite.id}]</span>
                              <span>{cite.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botonera de Acción Inferior */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                    className="text-sm text-slate-300 hover:text-white flex items-center font-medium transition"
                  >
                    {isExpanded ? (
                      <>Menos detalles <ChevronUp className="w-4 h-4 ml-1" /></>
                    ) : (
                      <>Ver Product Brain <ChevronDown className="w-4 h-4 ml-1" /></>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setReplacingCardId(isReplacing ? null : opp.id)}
                    className={`text-sm flex items-center space-x-1.5 font-medium transition ${
                      isReplacing ? "text-amber-300 font-bold" : "text-amber-400/90 hover:text-amber-300"
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isReplacing ? "Ocultar alternativas" : "Cambiar opción"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={Boolean(launchingSku) || Boolean(isThisSkuReplacing)}
                  onClick={() => {
                    if (onLaunchCampaign) {
                      onLaunchCampaign(opp);
                    } else if (onSelectOpportunity) {
                      onSelectOpportunity(opp);
                    }
                  }}
                  className={`font-semibold text-sm px-4 py-2 rounded-xl flex items-center space-x-2 transition-all shadow-md active:scale-95 ${
                    launchingSku === opp.sku
                      ? "bg-indigo-700 text-indigo-100 cursor-wait"
                      : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-indigo-900/30"
                  }`}
                >
                  {launchingSku === opp.sku ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Lanzando Campaña...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>🚀 Lanzar Campaña</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
