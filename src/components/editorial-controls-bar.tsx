"use client";

import React from "react";
import { 
  Sliders, 
  Building2, 
  Layers, 
  Cpu, 
  FileText, 
  DollarSign,
  Zap,
  Target,
  ShieldAlert,
  Megaphone,
  Sparkles,
  X
} from "lucide-react";
import { EditorialControls } from "@/lib/types/editorial-controls";

interface EditorialControlsBarProps {
  controls: EditorialControls;
  onChange: (updated: EditorialControls) => void;
  onApplyToRadar?: () => void;
  isApplying?: boolean;
  embedded?: boolean;
}

const QUICK_DIRECTIVE_CHIPS = [
  { label: "+ Cero Cuotas Cloud", text: "Enfatizar modelo sin licencias cloud obligatorias ni costes de renovación anuales." },
  { label: "+ Sustitución 24h EcomSpain", text: "Destacar servicio de sustitución avanzada en 24h desde almacén nacional EcomSpain." },
  { label: "+ Cuello 1G vs 10G Uplink", text: "Explicar el cuello de botella al conectar Wi-Fi 7 a switches 1G y justificar troncales 2.5G/10G." },
  { label: "+ Presupuesto PoE++ 802.3bt", text: "Detallar el balance de consumo PoE++ hasta 60W por puerto para no saturar la electrónica de red." },
  { label: "+ Roaming <50ms", text: "Mencionar transición fluida 802.11k/v/r para telefonía VoIP y videollamadas sin cortes." }
];

export const EditorialControlsBar: React.FC<EditorialControlsBarProps> = ({
  controls,
  onChange,
  onApplyToRadar,
  isApplying = false,
  embedded = false
}) => {
  const updateField = <K extends keyof EditorialControls>(field: K, value: EditorialControls[K]) => {
    onChange({
      ...controls,
      [field]: value
    });
  };

  const appendDirective = (textToAdd: string) => {
    const current = controls.customInstructions?.trim() || "";
    if (current.includes(textToAdd)) return;
    const updated = current ? `${current} ${textToAdd}` : textToAdd;
    updateField("customInstructions", updated);
  };

  return (
    <div className={embedded ? "p-4 text-white space-y-4 bg-slate-900/60 rounded-xl border border-slate-800/80" : "bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md mb-6"}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Controles Editoriales Personalizados
              </h4>
              <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2.5 py-0.5 rounded border border-slate-700 font-semibold">
                Strict EnGenius Cloud
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Ajusta sector, profundidad técnica y competidor a desbancar
            </p>
          </div>
        </div>

        {onApplyToRadar && (
          <button
            type="button"
            onClick={onApplyToRadar}
            disabled={isApplying}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md transition"
          >
            {isApplying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Aplicando...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>⚡ Aplicar al Radar</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Grid Principal de Controles */}
      <div className={embedded ? "grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm"}>
        {/* Sector Objetivo */}
        <div>
          <label htmlFor="select-target-sector" className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>Sector Objetivo</span>
          </label>
          <select
            id="select-target-sector"
            value={controls.targetSector}
            onChange={(e) => updateField("targetSector", e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-sky-500 transition cursor-pointer"
          >
            <option value="ENTERPRISE_OFFICE">Oficinas Corporativas / Sedes</option>
            <option value="HOSPITALITY">Hospitality (Hoteles y Resorts)</option>
            <option value="LOGISTICS_INDUSTRY">Logística e Industria 4.0</option>
            <option value="EDUCATION_CAMPUS">Educación y Campus</option>
          </select>
        </div>

        {/* Nivel de Profundidad Técnica */}
        <div>
          <label htmlFor="select-tech-depth" className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Profundidad Técnica</span>
          </label>
          <select
            id="select-tech-depth"
            value={controls.technicalDeepDiveLevel}
            onChange={(e) => updateField("technicalDeepDiveLevel", e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-purple-500 transition cursor-pointer"
          >
            <option value="HIGH_TECHNICAL">Alta (MLO, Preamble Puncturing, 10G)</option>
            <option value="CONSULTATIVE_ROI">Consultiva (TCO, Cero Licencias, SLAs)</option>
          </select>
        </div>

        {/* Tono Editorial */}
        <div>
          <label htmlFor="select-editorial-tone" className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Tono Editorial</span>
          </label>
          <select
            id="select-editorial-tone"
            value={controls.editorialTone || "ENGINEERING_PREVENTA"}
            onChange={(e) => updateField("editorialTone", e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
          >
            <option value="ENGINEERING_PREVENTA">Ingeniería Preventa Rigurosa</option>
            <option value="C_LEVEL_TCO">Directivo / C-Level (TCO & ROI)</option>
            <option value="CHANNEL_INSTALLER">Canal e Instalador (Despliegue ágil)</option>
            <option value="CASE_STUDY">Caso de Éxito / Transformación</option>
          </select>
        </div>

        {/* Competidor a Desbancar */}
        <div>
          <label htmlFor="select-competitor-focus" className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Competidor a Desbancar</span>
          </label>
          <select
            id="select-competitor-focus"
            value={controls.competitorFocus || "MERAKI"}
            onChange={(e) => updateField("competitorFocus", e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-amber-500 transition cursor-pointer"
          >
            <option value="MERAKI">Cisco Meraki (0€ Cuotas vs Licencias)</option>
            <option value="UNIFI">Ubiquiti UniFi (Soporte & Stock España)</option>
            <option value="LEGACY_1G">Redes Legacy 1G (Cuellos de botella)</option>
            <option value="NONE">Neutro / Enfoque Estándar</option>
          </select>
        </div>
      </div>

      {/* Fila Secundaria: CTA, Checkboxes */}
      <div className={embedded ? "grid grid-cols-1 gap-3 mt-3 text-sm" : "grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3.5 text-sm"}>
        {/* Llamada a la acción estratégica */}
        <div>
          <label htmlFor="select-strategic-cta" className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-rose-400" />
            <span>CTA Estratégica</span>
          </label>
          <select
            id="select-strategic-cta"
            value={controls.strategicCta || "FREE_SURVEY"}
            onChange={(e) => updateField("strategicCta", e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-rose-500 transition cursor-pointer"
          >
            <option value="FREE_SURVEY">Estudio de Cobertura y Asesoría Gratuita</option>
            <option value="WHOLESALE_PRICE">Tarifa Mayorista y Descuento Proyecto</option>
            <option value="DEMO_POC">Unidad Demo / PoC en 24h</option>
            <option value="TCO_WHITEPAPER">Descargar Estudio TCO 2026</option>
          </select>
        </div>

        {/* Énfasis en Switching y Uplinks */}
        <div className="flex flex-col justify-end">
          <label htmlFor="checkbox-uplink-switching" className="flex items-center space-x-2.5 bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 cursor-pointer hover:border-slate-600 transition h-[38px]">
            <input
              id="checkbox-uplink-switching"
              type="checkbox"
              checked={controls.emphasizeUplinkSwitching}
              onChange={(e) => updateField("emphasizeUplinkSwitching", e.target.checked)}
              className="rounded border-slate-700 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-slate-200 font-medium">
              Destacar Uplinks 10G & PoE++
            </span>
          </label>
        </div>

        {/* Incluir Pricing Orientativo */}
        <div className="flex flex-col justify-end">
          <label htmlFor="checkbox-pricing-margin" className="flex items-center space-x-2.5 bg-slate-950 border border-slate-700/80 rounded-lg px-3.5 py-2 cursor-pointer hover:border-slate-600 transition h-[38px]">
            <input
              id="checkbox-pricing-margin"
              type="checkbox"
              checked={controls.includePricing}
              onChange={(e) => updateField("includePricing", e.target.checked)}
              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-slate-200 font-medium">
              Citar Margen / Precio Orientativo
            </span>
          </label>
        </div>
      </div>

      {/* Fila Terciaria: Directivas Editoriales Personalizadas (Prompt Guidance) */}
      <div className="mt-3.5 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="textarea-custom-instructions" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Directivas Editoriales Personalizadas (Prompt Guidance)</span>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400">
              {(controls.customInstructions || "").length}/350 caracteres
            </span>
            {controls.customInstructions && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("¿Seguro que deseas borrar las directivas editoriales escritas?")) {
                    updateField("customInstructions", "");
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                title="Limpiar directivas con confirmación"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>
        <textarea
          id="textarea-custom-instructions"
          maxLength={350}
          rows={2}
          value={controls.customInstructions || ""}
          onChange={(e) => updateField("customInstructions", e.target.value)}
          placeholder="Ej: Enfatizar certificación de cableado Cat6A y latencia menor a 2ms en videoconferencias..."
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition resize-none"
        />

        {/* Chips de directivas rápidas sugeridas */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-xs text-slate-400 font-semibold mr-1">Directivas Rápidas:</span>
          {QUICK_DIRECTIVE_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => appendDirective(chip.text)}
              className="text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded-md transition font-medium cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

