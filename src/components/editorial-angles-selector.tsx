"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Wrench, Coins, Building2, Edit3, RefreshCw, CheckCircle2, ChevronDown, Users } from "lucide-react";
import { EditorialAngle } from "@/app/api/editorial/suggest-angles/route";
import { AUDIENCE_OPTIONS, isAudienceMatch } from "./campaign-stepper";

interface EditorialAnglesSelectorProps {
  sku: string;
  selectedAngle: EditorialAngle | null;
  onSelectAngle: (angle: EditorialAngle | null, isFreeTopic?: boolean) => void;
  selectedAudience?: string;
  onSelectAudience?: (audience: string) => void;
  freeTopicTitle?: string;
  onFreeTopicChange?: (title: string) => void;
  brand?: string;
  model?: string;
  category?: string;
  specs?: string[];
}

export const EditorialAnglesSelector: React.FC<EditorialAnglesSelectorProps> = ({
  sku,
  selectedAngle,
  onSelectAngle,
  selectedAudience,
  onSelectAudience,
  freeTopicTitle = "",
  onFreeTopicChange,
  brand,
  model,
  category,
  specs
}) => {
  const [angles, setAngles] = useState<EditorialAngle[]>([]);
  const [recommendedAudiences, setRecommendedAudiences] = useState<Array<{ label: string; whyThisAudience: string }>>([]);
  const [editorialQuestions, setEditorialQuestions] = useState<string[]>([]);
  const [selectedByOrchestrator, setSelectedByOrchestrator] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFreeTopic, setIsFreeTopic] = useState<boolean>(false);
  const [variationSeed, setVariationSeed] = useState<number>(0);
  const [showAllAudiences, setShowAllAudiences] = useState<boolean>(false);

  const fetchAngles = useCallback(async (seed = variationSeed) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/editorial/suggest-angles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, brand, model, category, specs, variationSeed: seed })
      });
      const data = await res.json();
      if (data.angles && Array.isArray(data.angles)) {
        setAngles(data.angles);
        setRecommendedAudiences(Array.isArray(data.recommendedAudiences) ? data.recommendedAudiences : []);
        setEditorialQuestions(Array.isArray(data.editorialQuestions) ? data.editorialQuestions : []);
        const orchestratorAngle = data.selectedAngle && typeof data.selectedAngle.id === "string"
          ? data.angles.find((a: EditorialAngle) => a.id === data.selectedAngle.id) || data.angles[0]
          : data.angles[0];
        setSelectedByOrchestrator(orchestratorAngle?.id || null);
        if (!selectedAngle && !isFreeTopic && orchestratorAngle) onSelectAngle(orchestratorAngle, false);
      }
    } catch {
      setError("No se pudieron cargar los ángulos sugeridos.");
    } finally {
      setLoading(false);
    }
  }, [sku, brand, model, category, specs, variationSeed, selectedAngle, isFreeTopic, onSelectAngle]);

  useEffect(() => {
    if (!sku) return;
    void fetchAngles(variationSeed);
  }, [sku, fetchAngles, variationSeed]);

  const regenerateIdeas = () => {
    const nextSeed = Date.now();
    setVariationSeed(nextSeed);
    setIsFreeTopic(false);
    void fetchAngles(nextSeed);
  };

  const handleAngleClick = (angle: EditorialAngle) => {
    setIsFreeTopic(false);
    onSelectAngle(angle, false);
    if (angle.targetAudience && onSelectAudience) {
      onSelectAudience(angle.targetAudience);
    }
  };

  const handleFreeTopicClick = () => {
    setIsFreeTopic(true);
    onSelectAngle(null, true);
  };

  const getAngleIcon = (intent: string) => {
    if (intent.includes("ARQUITECTURA") || intent.includes("CAPACIDAD")) return <Wrench className="w-4 h-4 text-amber-400" />;
    if (intent.includes("MEDIO") || intent.includes("CONTINUIDAD")) return <Coins className="w-4 h-4 text-emerald-400" />;
    return <Building2 className="w-4 h-4 text-sky-400" />;
  };

  const getAngleBadge = (intent: string) => {
    if (intent.includes("ARQUITECTURA")) return "Arquitectura / RF";
    if (intent.includes("CAPACIDAD")) return "Capacidad / Topología";
    if (intent.includes("MEDIO")) return "Medio físico";
    if (intent.includes("CONTINUIDAD")) return "Continuidad WAN";
    if (intent.includes("VIDEOVIGILANCIA")) return "Videovigilancia IP";
    return "Decisión de ingeniería";
  };

  return (
    <div className="space-y-3 bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Brain de Intención Editorial ({sku})
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono">{angles.length} ángulos · Orchestrator editorial</span>
          <button
            type="button"
            onClick={regenerateIdeas}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-indigo-800 bg-indigo-950/60 text-indigo-300 hover:text-white hover:border-indigo-500 text-[10px] font-semibold disabled:opacity-50"
            title="Generar una nueva propuesta de campañas para este SKU"
          >
            <RefreshCw className={loading ? "w-3 h-3 animate-spin" : "w-3 h-3"} />
            Nuevas ideas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Investigando dolores técnicos y ángulos para {sku}...</span>
        </div>
      ) : error ? (
        <div className="text-xs text-rose-400 p-3 bg-rose-950/40 rounded-lg border border-rose-800">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Target Person / Audiencia Objetivo
                </span>
                {selectedAudience && (
                  <span className="bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-medium">
                    {selectedAudience}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAllAudiences((prev: boolean) => !prev)}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>{showAllAudiences ? "Ver sugeridos" : `Ver todos (${AUDIENCE_OPTIONS.length})`}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showAllAudiences ? "rotate-180" : ""}`} />
              </button>
            </div>

            {showAllAudiences ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                {AUDIENCE_OPTIONS.map((aud) => {
                  const isSelected = isAudienceMatch(aud, selectedAudience);
                  return (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => onSelectAudience?.(aud.label)}
                      title={`${aud.label}: ${aud.contextDesc}`}
                      className={`text-left text-[10px] px-2.5 py-1.5 rounded-md transition border cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-400 text-white font-bold shadow-xs ring-1 ring-indigo-400/40"
                          : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">{aud.label}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                      </div>
                      <span className="text-[8px] text-slate-400 truncate mt-0.5">{aud.badge}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {recommendedAudiences.length > 0 ? (
                  recommendedAudiences.map((a: { label: string; whyThisAudience: string }) => {
                    const isSelected = selectedAudience?.toLowerCase().includes(a.label.toLowerCase()) || a.label.toLowerCase().includes(selectedAudience?.toLowerCase() || "");
                    return (
                      <button
                        key={a.label}
                        type="button"
                        onClick={() => onSelectAudience?.(a.label)}
                        title={a.whyThisAudience}
                        className={`text-[10px] px-2.5 py-1 rounded-md transition border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-400 text-white font-bold shadow-xs ring-1 ring-indigo-400/40"
                            : "bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        <span>{a.label}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  AUDIENCE_OPTIONS.slice(0, 4).map((aud) => {
                    const isSelected = isAudienceMatch(aud, selectedAudience);
                    return (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => onSelectAudience?.(aud.label)}
                        title={aud.contextDesc}
                        className={`text-[10px] px-2.5 py-1 rounded-md transition border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-400 text-white font-bold shadow-xs"
                            : "bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        <span>{aud.label}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          {editorialQuestions.length > 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-2">Preguntas editoriales detectadas</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {editorialQuestions.slice(0, 12).map((q: string) => <div key={q} className="text-[11px] text-slate-300">• {q}</div>)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {angles.map((angle: EditorialAngle) => {
            const isSelected = !isFreeTopic && selectedAngle?.id === angle.id;

            return (
              <div
                key={angle.id}
                onClick={() => handleAngleClick(angle)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
                  isSelected
                    ? "bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                      {getAngleIcon(angle.intent)}
                      <span>{getAngleBadge(angle.intent)}</span>
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {selectedByOrchestrator === angle.id && <span className="text-[9px] uppercase font-bold text-indigo-300">seleccionado por IA</span>}
                  </div>

                  <h5 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                    {angle.title}
                  </h5>

                  <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                    {angle.editorialQuestion}
                  </p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">{angle.tension}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Target: {angle.targetAudience}</span>
                </div>
              </div>
            );
          })}

          </div>

          {/* Opción Tema Libre */}
          <div
            onClick={handleFreeTopicClick}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
              isFreeTopic
                ? "bg-slate-900 border-sky-500 ring-2 ring-sky-500/40 shadow-lg"
                : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-sky-300 flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Tema Libre</span>
                </span>
                {isFreeTopic && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
              </div>

              <h5 className="text-xs font-bold text-white leading-snug">
                Redacción Personalizada
              </h5>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Define manualmente el título y enfoque que desees para este producto.
              </p>

              {isFreeTopic && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={freeTopicTitle}
                    onChange={(e) => onFreeTopicChange?.(e.target.value)}
                    placeholder="Escribe el título personalizado..."
                    className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
              <span>Personalizado por usuario</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
