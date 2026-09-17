import React from "react";
import { 
  Cpu, 
  Layers, 
  Zap, 
  CheckCircle, 
  ShieldCheck, 
  ExternalLink, 
  Package, 
  Activity, 
  Wifi, 
  ArrowRight,
  BookOpen
} from "lucide-react";
import { ProductIntelligenceCard } from "@/lib/types/product-intelligence";

interface ProductIntelligenceViewProps {
  card: ProductIntelligenceCard;
}

export const ProductIntelligenceView: React.FC<ProductIntelligenceViewProps> = ({ card }) => {
  const { product, technicalSpecs, commercialAngles, complementaryProducts } = card;

  const isStock = product.stockStatus === "IN_STOCK";
  const isLowStock = product.stockStatus === "LOW_STOCK";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-5 shadow-xl">
      {/* Header Producto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {product.brand}
            </span>
            <span className="text-xs font-mono text-slate-400">SKU: {product.sku}</span>
            {product.ean && <span className="text-xs font-mono text-slate-500">EAN: {product.ean}</span>}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <BookOpen className="w-3 h-3 text-purple-400" />
              Fundamentado en EcomShop NotebookLM (59 fuentes técnicas)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
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

      {/* Grid de Especificaciones Técnicas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Estándares */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-2">
            <Wifi className="w-3.5 h-3.5" />
            <span>Estándares Soportados</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {technicalSpecs.standards.map((std, idx) => (
              <span key={idx} className="text-xs bg-slate-900/80 text-slate-200 px-2 py-0.5 rounded border border-slate-700/50">
                {std}
              </span>
            ))}
          </div>
        </div>

        {/* Puertos Físicos */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Interfaces Físicas</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {technicalSpecs.ports.map((port, idx) => (
              <span key={idx} className="text-xs bg-slate-900/80 text-slate-200 px-2 py-0.5 rounded border border-slate-700/50">
                {port}
              </span>
            ))}
          </div>
        </div>

        {/* Alimentación y Gestión */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>PoE y Gestión</span>
          </div>
          <p className="text-xs text-slate-300 font-medium">{technicalSpecs.powerRequirements}</p>
          <p className="text-xs text-slate-400 mt-1">Gestión: {technicalSpecs.management}</p>
        </div>
      </div>

      {/* Diferenciadores Clave */}
      {technicalSpecs.keyDifferentiators.length > 0 && (
        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Diferenciadores Clave EcomShop:</p>
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
              Equipos y Accesorios Complementarios Recomendados:
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
