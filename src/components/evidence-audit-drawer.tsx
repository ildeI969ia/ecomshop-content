import React, { useState } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  ExternalLink,
  Sparkles,
  Award,
  BookOpen
} from "lucide-react";
import { ProductEvidenceClaim } from "@/lib/types/product-intelligence";

interface EvidenceAuditDrawerProps {
  score?: number;
  evidenceLedger: ProductEvidenceClaim[];
  unverifiedClaims?: string[];
  productName?: string;
}

export const EvidenceAuditDrawer: React.FC<EvidenceAuditDrawerProps> = ({
  score = 95,
  evidenceLedger = [],
  unverifiedClaims = [],
  productName = "Equipo"
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const passed = score >= 75;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl text-white">
      {/* Header / Barra de Estado */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-slate-850 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors border-b border-slate-800"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${passed ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-200">Quality Gate & Evidence Engine</h3>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                passed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}>
                {passed ? "Quality Gate Passed" : "Revisión Recomendada"}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <BookOpen className="w-2.5 h-2.5 text-indigo-400" />
                EcomShop NotebookLM Grounded
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditoría técnica rigurosa de afirmaciones de hardware y prevención de alucinaciones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Fidelidad Técnica</span>
              <span className={`text-base font-extrabold ${score >= 90 ? "text-emerald-400" : score >= 75 ? "text-blue-400" : "text-amber-400"}`}>
                {score}%
              </span>
            </div>
            {/* Indicador circular/barra */}
            <div className="w-10 h-10 rounded-full border-2 border-slate-700 flex items-center justify-center relative">
              <Award className={`w-5 h-5 ${passed ? "text-emerald-400" : "text-amber-400"}`} />
            </div>
          </div>

          <button className="text-slate-400 hover:text-white p-1">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Contenido Desplegable */}
      {isOpen && (
        <div className="p-4 space-y-4 text-xs">
          {/* Alertas de corrección si hubo alucinaciones podadas */}
          {unverifiedClaims.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Afirmaciones no verificadas detectadas y corregidas:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                {unverifiedClaims.map((claim, idx) => (
                  <li key={idx}><span className="text-amber-200">{claim}</span></li>
                ))}
              </ul>
            </div>
          )}

          {/* Lista de claims verificadas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Ledger de Evidencias Verificadas ({evidenceLedger.length}):
              </span>
              <span className="text-slate-500 text-[11px]">Grounded en Datasheets & EcomShop Web</span>
            </div>

            <div className="space-y-2">
              {evidenceLedger.map((claimItem, idx) => (
                <div key={idx} className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-slate-200 font-medium">{claimItem.claim}</span>
                    </div>
                    <div className="flex items-center gap-3 pl-5 text-[11px] text-slate-400">
                      <span>
                        Fuente:{" "}
                        <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                          claimItem.sourceType === "DATASHEET" 
                            ? "bg-indigo-900/60 text-indigo-300 border border-indigo-800"
                            : "bg-blue-900/60 text-blue-300 border border-blue-800"
                        }`}>
                          {claimItem.sourceType === "DATASHEET" ? "📖 Notebook Datasheet" : "🌐 EcomShop Web"}
                        </span>
                      </span>
                      {claimItem.source && claimItem.source.startsWith("http") && (
                        <a 
                          href={claimItem.source} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                        >
                          Enlace <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-900 text-slate-300 border border-slate-700 shrink-0">
                    {claimItem.confidence} Conf.
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
