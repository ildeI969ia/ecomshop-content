"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  RefreshCw,
  ChevronRight,
  Target,
  Cpu,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
  Building2,
  Briefcase
} from "lucide-react";
import {
  EditorialTopicCard,
  TopicCategory,
  TopicVertical,
  TopicArchetype
} from "@/lib/types/editorial-topics";
import { CreateCustomTopicModal } from "./create-custom-topic-modal";

interface SuggestedTopicsProps {
  selectedTopicId: string;
  onSelectTopic: (topic: EditorialTopicCard) => void;
  geminiApiKey?: string;
}

const CATEGORY_TABS: { id: TopicCategory; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "WIFI7", label: "Wi-Fi 7" },
  { id: "POE_SWITCHING", label: "Switches & PoE" },
  { id: "FIBRA_SFP", label: "Fibra / SFP" },
  { id: "ROUTERS_5G", label: "Gateways / 5G" }
];

export function SuggestedTopics({
  selectedTopicId,
  onSelectTopic,
  geminiApiKey
}: SuggestedTopicsProps) {
  const [topics, setTopics] = useState<EditorialTopicCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<TopicCategory>("ALL");
  const [vertical, setVertical] = useState<TopicVertical>("EMPRESAS_OFICINAS");
  const [archetype, setArchetype] = useState<TopicArchetype>("TROUBLESHOOTING");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTopics = async (cat: TopicCategory = activeCategory) => {
    setLoading(true);
    try {
      const res = await fetch("/api/editorial/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: cat,
          vertical,
          arquetipo: archetype,
          apiKey: geminiApiKey || undefined
        })
      });

      if (!res.ok) {
        throw new Error("Fallo al obtener líneas editoriales");
      }

      const data = await res.json();
      if (Array.isArray(data.topics) && data.topics.length > 0) {
        setTopics(data.topics);
        // Si no hay ninguno seleccionado o se actualiza, no forzar cambio destructivo
      }
    } catch (err) {
      console.warn("Fallo cargando topics vía API, fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics(activeCategory);
  }, [activeCategory, vertical, archetype]);

  const handleCategoryChange = (cat: TopicCategory) => {
    setActiveCategory(cat);
  };

  const handleCustomTopicCreated = (newTopic: EditorialTopicCard) => {
    setTopics((prev) => [newTopic, ...prev]);
    onSelectTopic(newTopic);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col gap-3.5">
      {/* Encabezado y Barra de Herramientas */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
            Edición Semanal Dinámica
          </span>
          <h2 className="font-editorial text-base font-bold text-slate-900">
            Líneas Editoriales B2B
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fetchTopics(activeCategory)}
            disabled={loading}
            title="Generar 4 nuevas propuestas frescas con IA"
            className="text-[11px] font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : "text-sky-600"}`} />
            <span className="hidden sm:inline">Nuevas Ideas IA</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            title="Crear una línea editorial propia a medida"
            className="text-[11px] font-semibold bg-[#0f172a] text-white hover:bg-slate-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>Crear Propia</span>
          </button>
        </div>
      </div>

      {/* Controles de Segmentación Rápida */}
      <div className="flex flex-col gap-2">
        {/* Categorías (Chips) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleCategoryChange(tab.id)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition ${
                activeCategory === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Arquetipo Selector */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-150">
          <span className="font-semibold text-slate-600 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            Enfoque:
          </span>
          <select
            value={archetype}
            onChange={(e) => setArchetype(e.target.value as TopicArchetype)}
            className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="TROUBLESHOOTING">Troubleshooting & Errores de Obra</option>
            <option value="DIMENSIONAMIENTO">Dimensionamiento Eléctrico PoE</option>
            <option value="BATTLECARD">Comparativas y TCO vs Consumo</option>
            <option value="CASO_REAL">Renovación de Infraestructura 10G</option>
          </select>
        </div>
      </div>

      {/* Tarjetas de Líneas Editoriales */}
      <div className="flex flex-col gap-2">
        {loading && topics.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
            <span>Consultando fuentes técnicas y generando propuestas...</span>
          </div>
        ) : (
          topics.map((topic) => {
            const isSelected = selectedTopicId === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => onSelectTopic(topic)}
                className={`text-left p-3 rounded-xl border text-xs transition flex flex-col gap-1.5 relative overflow-hidden group ${
                  isSelected
                    ? "bg-sky-50/70 border-sky-400 text-sky-950 shadow-2xs ring-1 ring-sky-300"
                    : "bg-white border-slate-200/70 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-sky-500" />
                )}

                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-wider text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {topic.badge}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {topic.isCustom && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        A Medida
                      </span>
                    )}
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${
                        isSelected ? "text-sky-600" : "text-slate-400"
                      }`}
                    />
                  </div>
                </div>

                <span className="font-semibold text-xs leading-snug text-slate-900">
                  {topic.title}
                </span>

                <p className="text-[11px] text-slate-500 line-clamp-1">
                  🎯 {topic.targetAudience}
                </p>

                {topic.suggestedSKUs && topic.suggestedSKUs.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] font-mono text-slate-400">SKUs:</span>
                    {topic.suggestedSKUs.slice(0, 3).map((sku) => (
                      <span
                        key={sku}
                        className="text-[9px] font-mono bg-slate-100/90 text-slate-700 px-1.5 py-0.2 rounded"
                      >
                        {sku}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Modal para Crear Línea Propia */}
      <CreateCustomTopicModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateTopic={handleCustomTopicCreated}
      />
    </div>
  );
}
