"use client";

import React, { useState } from "react";
import { X, Sparkles, Plus, Layers, Target, CheckCircle2 } from "lucide-react";
import { EditorialTopicCard, CreateCustomTopicInput } from "@/lib/types/editorial-topics";
import { STAR_PRODUCTS } from "@/lib/knowledge";

interface CreateCustomTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTopic: (topic: EditorialTopicCard) => void;
}

export function CreateCustomTopicModal({
  isOpen,
  onClose,
  onCreateTopic
}: CreateCustomTopicModalProps) {
  const [title, setTitle] = useState("");
  const [targetAudience, setTargetAudience] = useState("Instaladores de Telecomunicaciones e Integradores IT");
  const [focusLevel, setFocusLevel] = useState<"HIGH_TECHNICAL" | "CONSULTATIVE_ROI">("HIGH_TECHNICAL");
  const [selectedSKUs, setSelectedSKUs] = useState<string[]>(["ECW536", "ECS1528FP"]);
  const [coreArgument, setCoreArgument] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleToggleSku = (sku: string) => {
    setSelectedSKUs((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 5) {
      alert("Introduce un título o tema descriptivo de al menos 5 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateCustomTopicInput = {
        title: title.trim(),
        targetAudience: targetAudience.trim() || "Instaladores e Integradores IT",
        focusLevel,
        suggestedSKUs: selectedSKUs.length > 0 ? selectedSKUs : ["ECW536", "ECS1528FP"],
        coreArgument: coreArgument.trim() || `Enfoque técnico directo sobre ${title.trim()}.`
      };

      const res = await fetch("/api/editorial/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_CUSTOM",
          topic: payload
        })
      });

      if (!res.ok) {
        throw new Error("Error al registrar la línea editorial");
      }

      const data = await res.json();
      if (data.topic) {
        onCreateTopic(data.topic);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      // Creación local de emergencia
      const localCard: EditorialTopicCard = {
        id: `custom-topic-${Date.now()}`,
        badge: focusLevel === "HIGH_TECHNICAL" ? "LÍNEA TÉCNICA" : "ESTRATEGIA ROI",
        title: title.trim(),
        targetAudience: targetAudience.trim(),
        coreArgument: coreArgument.trim() || `Tesis editorial para ${title.trim()}`,
        suggestedSKUs: selectedSKUs,
        category: "ALL",
        isCustom: true
      };
      onCreateTopic(localCard);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-editorial font-bold text-sm text-slate-900">Crear Línea Editorial Propia</h3>
              <p className="text-[11px] text-slate-500">Define una hipótesis técnica o caso de obra a medida</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Título o Caso Técnico a tratar *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Sustitución de red Wi-Fi antigua en nave logística de 5000m²"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Público Objetivo *
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Ej: Integradores de CCTV e instaladores de cableado estructurado"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enfoque Editorial
              </label>
              <select
                value={focusLevel}
                onChange={(e) => setFocusLevel(e.target.value as any)}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
              >
                <option value="HIGH_TECHNICAL">Ingeniería Técnica (Hard Specs)</option>
                <option value="CONSULTATIVE_ROI">Consultoría Comercial & TCO</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Plataforma de Gestión
              </label>
              <div className="text-xs px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                EnGenius Cloud (0€ cuotas)
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Argumento o Tesis de Obra (Opcional)
            </label>
            <textarea
              value={coreArgument}
              onChange={(e) => setCoreArgument(e.target.value)}
              rows={2}
              placeholder="Ej: El roaming se interrumpe por atenuación de chapa sándwich; se requiere AP IP67 exterior y enlaces 10G..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              SKUs Recomendados de EcomShop
            </label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {STAR_PRODUCTS.map((prod) => {
                const isSelected = selectedSKUs.includes(prod.model);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleToggleSku(prod.model)}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-md border transition ${
                      isSelected
                        ? "bg-sky-600 border-sky-600 text-white font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {prod.model}
                  </button>
                );
              })}
              {["ECS2512FP", "POE30Gv2"].map((extraSku) => {
                const isSelected = selectedSKUs.includes(extraSku);
                return (
                  <button
                    key={extraSku}
                    type="button"
                    onClick={() => handleToggleSku(extraSku)}
                    className={`text-[11px] font-mono px-2.5 py-1 rounded-md border transition ${
                      isSelected
                        ? "bg-sky-600 border-sky-600 text-white font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {extraSku}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Activar y Precargar Línea
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
