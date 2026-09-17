"use client";

import React from "react";
import { 
  Sliders, 
  Building2, 
  Layers, 
  Cpu, 
  FileText, 
  CheckCircle2, 
  Info,
  DollarSign
} from "lucide-react";
import { EditorialControls } from "@/lib/types/editorial-controls";

interface EditorialControlsBarProps {
  controls: EditorialControls;
  onChange: (updated: EditorialControls) => void;
}

export const EditorialControlsBar: React.FC<EditorialControlsBarProps> = ({
  controls,
  onChange
}) => {
  const updateField = <K extends keyof EditorialControls>(field: K, value: EditorialControls[K]) => {
    onChange({
      ...controls,
      [field]: value
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow-md mb-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Controles Editoriales Personalizados (Fase 08.6)
            </h4>
            <p className="text-[11px] text-slate-400">
              Ajusta el perfil de audiencia, densidad técnica y directivas previas a la generación
            </p>
          </div>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">
          Strict EnGenius Cloud
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Sector Objetivo */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Sector Objetivo</span>
          </label>
          <select
            value={controls.targetSector}
            onChange={(e) => updateField("targetSector", e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition"
          >
            <option value="ENTERPRISE_OFFICE">Oficinas Corporativas / Sedes</option>
            <option value="HOSPITALITY">Hospitality (Hoteles y Resorts)</option>
            <option value="LOGISTICS_INDUSTRY">Logística e Industria 4.0</option>
            <option value="EDUCATION_CAMPUS">Educación y Campus</option>
          </select>
        </div>

        {/* Nivel de Profundidad Técnica */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Profundidad Técnica</span>
          </label>
          <select
            value={controls.technicalDeepDiveLevel}
            onChange={(e) => updateField("technicalDeepDiveLevel", e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition"
          >
            <option value="HIGH_TECHNICAL">Alta (MLO, Preamble Puncturing, 10G)</option>
            <option value="CONSULTATIVE_ROI">Consultiva (TCO, Cero Licencias, SLAs)</option>
          </select>
        </div>

        {/* Énfasis en Switching y Uplinks */}
        <div className="flex flex-col justify-between">
          <span className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Topología Conmutación</span>
          </span>
          <label className="flex items-center space-x-2 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 cursor-pointer hover:border-slate-600 transition">
            <input
              type="checkbox"
              checked={controls.emphasizeUplinkSwitching}
              onChange={(e) => updateField("emphasizeUplinkSwitching", e.target.checked)}
              className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
            />
            <span className="text-[11px] text-slate-300 font-medium">
              Destacar Uplinks 10G & PoE++
            </span>
          </label>
        </div>

        {/* Incluir Pricing Orientativo */}
        <div className="flex flex-col justify-between">
          <span className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Condiciones B2B</span>
          </span>
          <label className="flex items-center space-x-2 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 cursor-pointer hover:border-slate-600 transition">
            <input
              type="checkbox"
              checked={controls.includePricing}
              onChange={(e) => updateField("includePricing", e.target.checked)}
              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-[11px] text-slate-300 font-medium">
              Citar Margen / Precio Orientativo
            </span>
          </label>
        </div>
      </div>

      {/* Instrucciones Personalizadas */}
      <div className="mt-3 pt-2.5 border-t border-slate-800">
        <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-sky-400" />
          <span>Directivas Editorial Personalizadas (Prompt Guidance)</span>
        </label>
        <input
          type="text"
          value={controls.customInstructions || ""}
          onChange={(e) => updateField("customInstructions", e.target.value)}
          placeholder="Ej: Enfatizar certificación de cableado Cat6A y latencia menor a 2ms en videoconferencias..."
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
        />
      </div>
    </div>
  );
};

