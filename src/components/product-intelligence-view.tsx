import React from "react";
import { 
  Cpu, 
  Layers, 
  Zap, 
  CheckCircle, 
  ShieldCheck, 
  ShieldAlert,
  ExternalLink, 
  Package, 
  Activity, 
  Wifi, 
  ArrowRight,
  BookOpen,
  Shield,
  Radio,
  Server,
  Network
} from "lucide-react";
import { ProductIntelligenceCard, DeviceType } from "@/lib/types/product-intelligence";

interface ProductIntelligenceViewProps {
  card: ProductIntelligenceCard;
}

export const ProductIntelligenceView: React.FC<ProductIntelligenceViewProps> = ({ card }) => {
  const { product, technicalSpecs, commercialAngles, complementaryProducts } = card;

  const isStock = product.stockStatus === "IN_STOCK";
  const isLowStock = product.stockStatus === "LOW_STOCK";

  // Determinación estricta y segura del tipo de dispositivo
  const deviceType: DeviceType = technicalSpecs.deviceType || (
    product.sku.toUpperCase().includes("ESG") || product.category === "gateways" ? "GATEWAY" :
    product.sku.toUpperCase().includes("ECS") || product.category === "switches" ? "SWITCH" :
    product.sku.toUpperCase().includes("ECW") || product.category === "wifi" ? "ACCESS_POINT" :
    "ACCESSORY"
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-5 shadow-xl">
      {/* Header Producto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {product.brand}
            </span>
            <span className="text-xs font-mono text-slate-400">SKU: {product.sku}</span>
            {product.ean && <span className="text-xs font-mono text-slate-500">EAN: {product.ean}</span>}

            {/* Badge de tipo de hardware */}
            {deviceType === "GATEWAY" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Shield className="w-3 h-3 text-amber-400" />
                Security Gateway SD-WAN (Cableado)
              </span>
            )}
            {deviceType === "SWITCH" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Layers className="w-3 h-3 text-emerald-400" />
                Switch Conmutación Multi-Gigabit
              </span>
            )}
            {deviceType === "ACCESS_POINT" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Wifi className="w-3 h-3 text-cyan-400" />
                Punto de Acceso Wi-Fi 7 / Wi-Fi 6
              </span>
            )}
            {deviceType === "ACCESSORY" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-500/30">
                <Package className="w-3 h-3 text-slate-400" />
                Accesorio & Conectividad
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <BookOpen className="w-3 h-3 text-purple-400" />
              NotebookLM Grounding
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            {deviceType === "GATEWAY" ? (
              <Shield className="w-5 h-5 text-amber-400" />
            ) : deviceType === "SWITCH" ? (
              <Layers className="w-5 h-5 text-emerald-400" />
            ) : deviceType === "ACCESS_POINT" ? (
              <Wifi className="w-5 h-5 text-cyan-400" />
            ) : (
              <Cpu className="w-5 h-5 text-blue-400" />
            )}
            {product.brand} {product.model}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{product.category}</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isStock
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isLowStock
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isStock ? "bg-emerald-400" : isLowStock ? "bg-amber-400" : "bg-slate-500"}`} />
            {isStock ? "Stock en España (24h)" : isLowStock ? "Últimas Unidades" : "Consultar Stock"}
          </span>

          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60"
            >
              Ver en EcomShop <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Alerta Anti-Alucinación explícita para Gateways (ESG510 / ESG610) */}
      {deviceType === "GATEWAY" && (
        <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-amber-300">Arquitectura de Seguridad Cableada:</strong> El {product.model} es un Gateway de Seguridad SD-WAN puramente cableado sin radios inalámbricas Wi-Fi (no emite señal 802.11be/ax). Para proporcionar cobertura inalámbrica corporativa se requiere acoplarlo con puntos de acceso EnGenius ECW y switches PoE.
          </div>
        </div>
      )}

      {/* Grid de Especificaciones Técnicas Polimórficas (3 Bloques Adaptativos) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* BLOQUE 1 POLIMÓRFICO */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          {deviceType === "GATEWAY" ? (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
                <Shield className="w-3.5 h-3.5" />
                <span>Throughput & Cifrado SD-WAN</span>
              </div>
              <p className="text-xs font-mono text-slate-200 font-semibold mb-2">
                {technicalSpecs.firewallThroughput || "2.5 Gbps Stateful Firewall"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(technicalSpecs.vpnProtocols || ["WireGuard", "IPsec", "Dual-WAN"]).map((vpn, idx) => (
                  <span key={idx} className="text-xs bg-slate-900/80 text-amber-300 px-2 py-0.5 rounded border border-amber-600/40">
                    {vpn}
                  </span>
                ))}
              </div>
            </>
          ) : deviceType === "SWITCH" ? (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
                <Cpu className="w-3.5 h-3.5" />
                <span>Conmutación & Rendimiento</span>
              </div>
              <p className="text-xs font-mono text-slate-200 font-semibold mb-1">
                Capacidad: {technicalSpecs.switchingCapacity || "Wire-Speed"}
              </p>
              {technicalSpecs.switchingLayer && (
                <p className="text-xs text-slate-400 mb-2">Capa: {technicalSpecs.switchingLayer}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {technicalSpecs.standards.slice(0, 3).map((std, idx) => (
                  <span key={idx} className="text-xs bg-slate-900/80 text-slate-200 px-2 py-0.5 rounded border border-slate-700/50">
                    {std}
                  </span>
                ))}
              </div>
            </>
          ) : deviceType === "ACCESS_POINT" ? (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-2">
                <Wifi className="w-3.5 h-3.5" />
                <span>Estándares Wi-Fi & Radios</span>
              </div>
              {technicalSpecs.mimo && (
                <p className="text-xs font-mono text-slate-200 font-semibold mb-1">MIMO: {technicalSpecs.mimo}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {(technicalSpecs.wirelessStandards || technicalSpecs.standards).map((std, idx) => (
                  <span key={idx} className="text-xs bg-slate-900/80 text-cyan-200 px-2 py-0.5 rounded border border-cyan-800/50">
                    {std}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-2">
                <Zap className="w-3.5 h-3.5" />
                <span>Estándares & Potencia</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {technicalSpecs.standards.map((std, idx) => (
                  <span key={idx} className="text-xs bg-slate-900/80 text-slate-200 px-2 py-0.5 rounded border border-slate-700/50">
                    {std}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* BLOQUE 2 POLIMÓRFICO: INTERFACES */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>
              {deviceType === "GATEWAY"
                ? "Interfaces Multi-WAN & Routing"
                : deviceType === "SWITCH"
                ? "Densidad de Puertos & Uplinks"
                : "Interfaces Físicas & Uplink"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {technicalSpecs.ports.map((port, idx) => (
              <span key={idx} className="text-xs bg-slate-900/80 text-slate-200 px-2 py-0.5 rounded border border-slate-700/50">
                {port}
              </span>
            ))}
          </div>
          {deviceType === "SWITCH" && technicalSpecs.uplinks && (
            <div className="mt-2 pt-2 border-t border-slate-700/40">
              <span className="text-[11px] text-emerald-400 font-semibold block mb-1">Uplinks Troncales:</span>
              <div className="flex flex-wrap gap-1">
                {technicalSpecs.uplinks.map((up, idx) => (
                  <span key={idx} className="text-[11px] font-mono text-emerald-200 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    {up}
                  </span>
                ))}
              </div>
            </div>
          )}
          {deviceType === "GATEWAY" && technicalSpecs.wanFailover && (
            <p className="text-[11px] text-amber-300 font-medium mt-2">
              ⚡ Dual-WAN Failover & PBR Activo
            </p>
          )}
        </div>

        {/* BLOQUE 3 POLIMÓRFICO: ALIMENTACIÓN Y GESTIÓN */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>
              {deviceType === "SWITCH"
                ? "Presupuesto PoE & Gestión"
                : deviceType === "GATEWAY"
                ? "Alimentación DC & Consola Cloud"
                : "Alimentación & Gestión"}
            </span>
          </div>
          {technicalSpecs.poeBudget && (
            <p className="text-xs text-emerald-400 font-semibold mb-1">
              Presupuesto PoE: {technicalSpecs.poeBudget}
            </p>
          )}
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            {technicalSpecs.powerRequirements}
          </p>
          <p className="text-xs text-slate-400 mt-1.5 pt-1.5 border-t border-slate-700/40">
            Gestión: <span className="text-purple-300 font-medium">{technicalSpecs.management}</span>
          </p>
        </div>
      </div>

      {/* Diferenciadores Clave */}
      {technicalSpecs.keyDifferentiators.length > 0 && (
        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Diferenciadores Clave EcomShop ({product.model}):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {technicalSpecs.keyDifferentiators.map((diff, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>{diff}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ángulos Comerciales B2B */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-800/80 pt-4">
        <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">💼 ROI & FinOps</span>
          <p className="text-xs text-slate-300 leading-relaxed">{commercialAngles.executiveRoi}</p>
        </div>
        <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-1">⚡ Rendimiento</span>
          <p className="text-xs text-slate-300 leading-relaxed">{commercialAngles.engineeringPerformance}</p>
        </div>
        <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">🛠️ Despliegue IT</span>
          <p className="text-xs text-slate-300 leading-relaxed">{commercialAngles.operationsDeployment}</p>
        </div>
      </div>

      {/* Cross-Selling / Complementarios */}
      {complementaryProducts.length > 0 && (
        <div className="bg-blue-950/20 border border-blue-900/40 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
              {deviceType === "GATEWAY"
                ? "Electrónica Complementaria Obligatoria para Wi-Fi & Conmutación:"
                : "Equipos y Accesorios Complementarios Recomendados:"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {complementaryProducts.map((item, idx) => (
              <div key={idx} className="bg-slate-900/60 p-2.5 rounded border border-blue-900/30 flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-white block">{item.skuOrCategory}</span>
                  <span className="text-[11px] text-slate-400">{item.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
