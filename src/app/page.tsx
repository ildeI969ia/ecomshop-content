"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Mail,
  MessageSquare,
  Sparkles,
  Store,
  Wand2,
  Zap,
} from "lucide-react";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { QuickStartModal } from "@/components/quick-start-modal";
import { SimplifiedDashboard } from "@/components/simplified-dashboard";

const PRODUCT_CATALOG = [
  { sku: "ECW510", name: "ECW510 Wi‑Fi 7 Gateway", category: "Gateway" },
  { sku: "ST3116G", name: "ST3116G Switch PoE", category: "Switch" },
  { sku: "ECW210", name: "ECW210 Access Point", category: "Wi‑Fi" },
  { sku: "DAC-10G-3M", name: "DAC-10G-3M 3m", category: "Fibra" },
  { sku: "RUTX12", name: "RUTX12 Router Cellular", category: "Gateway" },
  { sku: "LUX-100", name: "LUX-100 Optics Kit", category: "Fibra" },
];

const CHANNELS = [
  { label: "Blog", icon: BookOpen, color: "text-sky-400" },
  { label: "LinkedIn", icon: FileText, color: "text-blue-400" },
  { label: "WhatsApp", icon: MessageSquare, color: "text-emerald-400" },
  { label: "Email", icon: Mail, color: "text-violet-400" },
];

export default function Page() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const product = useMemo(
    () => PRODUCT_CATALOG.find((item) => item.sku === selectedSku) ?? PRODUCT_CATALOG[0],
    [selectedSku],
  );

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      setCopiedKey(null);
    }
  };

  const handleGenerateCampaign = () => setShowQuickStart(true);

  const handleSelectProduct = (sku: string) => {
    setSelectedSku(sku);
    setShowQuickStart(false);
  };

  const summary = `Producto: ${product.name} (${product.sku})\n\nPunto fuerte: conectividad, rendimiento y facilidad de despliegue para clientes B2B.\nCanales: Blog, LinkedIn, WhatsApp y Email.`;

  return (
    <>
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/30 backdrop-blur-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-lg font-black text-white shadow-lg shadow-indigo-900/40">
                  E
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">EcomSpain</p>
                  <h1 className="text-lg font-bold text-white">Marketing OS</h1>
                </div>
              </div>

              <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <button className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 transition hover:border-slate-600 hover:text-white">
                  Inicio
                </button>
                <button
                  onClick={handleGenerateCampaign}
                  className="rounded-xl bg-indigo-600 px-3 py-2 font-semibold text-white transition hover:bg-indigo-500"
                >
                  Crear campaña
                </button>
                <button className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 transition hover:border-slate-600 hover:text-white">
                  Historial
                </button>
              </nav>
            </div>
          </header>

          <main className="mt-8 space-y-8">
            {!selectedSku ? (
              <SimplifiedDashboard
                onGenerateCampaign={handleGenerateCampaign}
                onViewHistory={() => setShowQuickStart(true)}
                onViewRadar={() => setShowQuickStart(true)}
                recentCampaigns={[
                  { id: "1", title: "Campaña ECW510", date: "Hoy" },
                  { id: "2", title: "Lanzamiento ST3116G", date: "Ayer" },
                ]}
              />
            ) : (
              <>
                <section className="rounded-3xl border border-indigo-800/40 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 p-6 text-white shadow-2xl shadow-indigo-950/20">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-indigo-300">
                        <Wand2 className="h-4 w-4" />
                        Flujo guiado
                      </div>
                      <h2 className="text-3xl font-bold leading-tight">Crea tu campaña en 3 pasos</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAdvanced(false)}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          !showAdvanced
                            ? "bg-white text-slate-950"
                            : "border border-slate-700 bg-slate-900/70 text-slate-200"
                        }`}
                      >
                        Modo simple
                      </button>
                      <button
                        onClick={() => setShowAdvanced(true)}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          showAdvanced
                            ? "bg-white text-slate-950"
                            : "border border-slate-700 bg-slate-900/70 text-slate-200"
                        }`}
                      >
                        Más opciones
                      </button>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg shadow-slate-950/40">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Producto activo</p>
                          <h3 className="mt-2 text-2xl font-bold text-white">{product.name}</h3>
                          <p className="mt-1 text-sm text-slate-400">SKU: {product.sku}</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          Listo para publicar
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {[
                          "Selecciona producto",
                          "Genera contenido",
                          "Copia y publica",
                        ].map((step, index) => (
                          <div key={step} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                              {index + 1}
                            </div>
                            <p className="text-sm font-semibold text-white">{step}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          onClick={() => setShowQuickStart(true)}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500"
                        >
                          Cambiar producto
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => copyText(summary, "summary")}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
                        >
                          {copiedKey === "summary" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          {copiedKey === "summary" ? "Resumen copiado" : "Copiar resumen"}
                        </button>
                      </div>
                    </div>

                    {showAdvanced && (
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg shadow-slate-950/40">
                        <button
                          type="button"
                          onClick={() => setShowAdvanced(false)}
                          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-200"
                        >
                          <ChevronDown className="h-4 w-4" />
                          Ocultar ajustes avanzados
                        </button>

                        <div className="space-y-4">
                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Tono</label>
                            <select className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none">
                              <option>Preventa técnica</option>
                              <option>Directivo ROI</option>
                              <option>Comparativa</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Público</label>
                            <select className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none">
                              <option>Integradores B2B</option>
                              <option>Equipos IT</option>
                              <option>Directivos</option>
                            </select>
                          </div>

                          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">
                            Baseado en documentación oficial y validado para contenido comercial.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg shadow-slate-950/40">
                    <div className="flex items-center justify-between gap-3 pb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-400" />
                        <h3 className="text-lg font-bold text-white">Resultado listo</h3>
                      </div>
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] uppercase text-slate-300">
                        4 canales
                      </span>
                    </div>

                    <div className="space-y-3">
                      {CHANNELS.map(({ label, icon: Icon, color }) => (
                        <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${color}`} />
                              <span className="font-semibold text-white">{label}</span>
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.1em] text-emerald-300">listo</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-400">
                            Mensaje preparado con tono claro, útil y orientado a venta B2B.
                          </p>
                          <button
                            onClick={() => copyText(`Campaña ${label} para ${product.name} (${product.sku})`, `${label}-copy`)}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-indigo-500 hover:text-white"
                          >
                            {copiedKey === `${label}-copy` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedKey === `${label}-copy` ? "Copiado" : "Copiar texto"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                      <div className="flex items-center gap-2 text-white">
                        <Store className="h-4 w-4 text-indigo-400" />
                        <span className="font-semibold">Resumen final</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">{summary.replace(/\n/g, " ")}</p>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500"
                      >
                        Guardar campaña
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>

      <QuickStartModal
        isOpen={showQuickStart}
        onClose={() => setShowQuickStart(false)}
        onSelectProduct={handleSelectProduct}
        products={PRODUCT_CATALOG}
      />
    </>
  );
}
