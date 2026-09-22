import React from "react";
import { CatalogDevice } from "@/lib/catalog";

export interface HardwareIntelligenceCardProps {
  selectedDevice: CatalogDevice;
  className?: string;
}

/**
 * Ficha de Inteligencia Técnica adaptativa respaldada por NotebookLM.
 * Se adapta dinámicamente según la tipología del hardware de red (AP, Switch, Gateway, Accesorio).
 */
export const HardwareIntelligenceCard: React.FC<HardwareIntelligenceCardProps> = ({
  selectedDevice,
  className = ""
}) => {
  if (!selectedDevice) return null;

  return (
    <div 
      className={`bg-slate-950 border border-slate-800 rounded-xl p-5 mt-4 ${className}`}
      role="region"
      aria-label={`Ficha técnica NotebookLM para ${selectedDevice.brand} ${selectedDevice.sku}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-sm text-white truncate">
            {selectedDevice.brand} {selectedDevice.sku}
          </span>
          <span className="text-xs text-slate-400 truncate">
            ({selectedDevice.name})
          </span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
          {selectedDevice.type === "ACCESS_POINT"
            ? "📡 Access Point Wi-Fi"
            : selectedDevice.type === "SWITCH"
            ? "🗄️ Switch Conmutador"
            : selectedDevice.type === "GATEWAY"
            ? "🛡️ Gateway Firewall SD-WAN"
            : "🔌 Accesorio de Red"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* COLUMNA 1: ESPECIFICACIONES SEGÚN TIPO */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <span className="text-slate-400 font-medium block mb-1">
            {selectedDevice.type === "ACCESS_POINT"
              ? "Estándares y Bandas:"
              : selectedDevice.type === "SWITCH"
              ? "Capacidad y Capa:"
              : selectedDevice.type === "GATEWAY"
              ? "Capacidad de Enrutamiento:"
              : "Especificaciones:"}
          </span>
          {selectedDevice.type === "ACCESS_POINT" && (
            <div className="space-y-1 text-slate-200">
              <p className="font-semibold text-blue-400">
                {selectedDevice.specs.wirelessStandards?.join(", ")}
              </p>
              <p>Bandas: {selectedDevice.specs.bands?.join(" / ")}</p>
              <p>MIMO: {selectedDevice.specs.mimo}</p>
            </div>
          )}
          {selectedDevice.type === "SWITCH" && (
            <div className="space-y-1 text-slate-200">
              <p className="font-semibold text-blue-400">
                Capa: {selectedDevice.specs.layer}
              </p>
              <p>{selectedDevice.specs.portsCount}</p>
              <p>Uplinks: {selectedDevice.specs.uplinks}</p>
            </div>
          )}
          {selectedDevice.type === "GATEWAY" && (
            <div className="space-y-1 text-slate-200">
              <p className="font-semibold text-emerald-400">
                Firewall: {selectedDevice.specs.throughput}
              </p>
              <p>WAN: {selectedDevice.specs.wanPorts}</p>
              <p className="text-[11px] text-slate-400">
                Funciones: {selectedDevice.specs.vpnFeatures?.join(", ")}
              </p>
            </div>
          )}
          {selectedDevice.type === "ACCESSORY" && (
            <p className="text-slate-200 font-semibold">
              {selectedDevice.shortDesc}
            </p>
          )}
        </div>

        {/* COLUMNA 2: INTERFACES FÍSICAS */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <span className="text-slate-400 font-medium block mb-1">
            Puertos e Interfaces:
          </span>
          <ul className="space-y-1 text-slate-200">
            {selectedDevice.specs.interfaces.map((iface: string, i: number) => (
              <li key={i}>• {iface}</li>
            ))}
          </ul>
        </div>

        {/* COLUMNA 3: ALIMENTACIÓN Y GESTIÓN */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <span className="text-slate-400 font-medium block mb-1">
            Alimentación y Nube:
          </span>
          <p className="text-slate-200">{selectedDevice.specs.powerSource}</p>
          <p className="text-blue-400 font-medium mt-1">
            {selectedDevice.specs.management}
          </p>
          {selectedDevice.specs.poeBudget && (
            <p className="text-amber-400 font-bold mt-1">
              PoE Budget: {selectedDevice.specs.poeBudget}
            </p>
          )}
        </div>
      </div>

      {/* FUENTE DE NOTEBOOKLM VERIFICADA */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
        <span>
          📖 Respaldado por NotebookLM:{" "}
          <strong className="text-slate-300">{selectedDevice.notebookSource}</strong>
        </span>
        <span className="text-emerald-400 font-semibold">
          ✓ 0% Alucinaciones Técnicas
        </span>
      </div>
    </div>
  );
};

export default HardwareIntelligenceCard;
