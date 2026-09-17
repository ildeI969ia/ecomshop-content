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
  AlertTriangle
} from "lucide-react";
import { ProductOpportunityRecord } from "@/lib/services/opportunity-radar";

interface OpportunityRadarWidgetProps {
  opportunities: ProductOpportunityRecord[];
  isLoading: boolean;
  onSelectOpportunity?: (opp: ProductOpportunityRecord) => void;
  onLaunchCampaign?: (opp: ProductOpportunityRecord) => void;
  launchingSku?: string | null;
}

export const OpportunityRadarWidget: React.FC<OpportunityRadarWidgetProps> = ({
  opportunities,
  isLoading,
  onSelectOpportunity,
  onLaunchCampaign,
  launchingSku
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      <div className="flex items-center justify-between mb-4">
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
              Clasificación algorítmica por Stock (25%), Gap de Contenido (25%), Tendencia B2B (25%) y Bundling (25%).
            </p>
          </div>
        </div>
        <div className="flex items-center text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-ping" />
          Actualizado con Master Notebook EcomShop
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {opportunities.map((opp, idx) => {
          const isExpanded = expandedId === opp.id;
          const score = opp.scores.totalScore;

          return (
            <div
              key={opp.id}
              className="bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-lg p-4 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-indigo-950 text-indigo-300 text-xs font-mono font-bold px-2 py-0.5 rounded border border-indigo-800/60">
                      #{idx + 1} {opp.sku}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                      {opp.recommendedAngle}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-sm font-bold text-white font-mono">{score}/100</span>
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-slate-100 line-clamp-1 mb-1">
                  {opp.actionTitle}
                </h4>
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                  Target: <strong className="text-slate-300">{opp.targetSegment}</strong>
                </p>

                {/* Bundle Cross-sell */}
                <div className="bg-slate-900/90 rounded border border-slate-800/80 p-2.5 mb-3 text-xs">
                  <div className="flex items-center text-[11px] font-semibold text-indigo-300 mb-1">
                    <Package className="w-3 h-3 mr-1" />
                    Bundle Sugerido:
                  </div>
                  <div className="text-slate-200 font-medium">
                    + {opp.suggestedBundle.accessorySku} ({opp.suggestedBundle.accessoryName})
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {opp.suggestedBundle.rationale}
                  </div>
                </div>

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
                  </div>
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center"
                >
                  {isExpanded ? (
                    <>Menos detalles <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
                  ) : (
                    <>Ver Product Brain <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
                  )}
                </button>

                <button
                  type="button"
                  disabled={Boolean(launchingSku)}
                  onClick={() => {
                    if (onLaunchCampaign) {
                      onLaunchCampaign(opp);
                    } else if (onSelectOpportunity) {
                      onSelectOpportunity(opp);
                    }
                  }}
                  className={`font-medium text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm ${
                    launchingSku === opp.sku
                      ? "bg-indigo-700 text-indigo-100 cursor-wait"
                      : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white"
                  }`}
                >
                  {launchingSku === opp.sku ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Lanzando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
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
