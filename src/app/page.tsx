"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  FileText,
  Mail,
  MessageSquare,
  Sparkles,
  Store,
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
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
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

  const handleGenerateCampaign = () => {
    setShowQuickStart(true);
  };

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
          <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-lg font-black text-white">
                  E
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">EcomSpain</p>
                  <h1 className="text-lg font-bold text-white">Marketing OS</h1>
                </div>
              </div>

              <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <button className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 hover:border-slate-600">
                  Inicio
                </button>
                <button
                  onClick={handleGenerateCampaign}
                  className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-500"
                >
                  Crear campaña
                </button>
                <button className="rounded-lg border border-slate-700 px-3 py-2 hover:border-slate-600">
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
                <section className="rounded-2xl border border-indigo-800/40 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 p-6 text-white shadow-xl shadow-indigo-950/20">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Tu flujo simplificado</p>
                      <h2 className="mt-3 text-3xl font-bold">Crea la campaña en 3 pasos</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMode("simple")}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          mode === "simple"
                            ? "bg-white text-slate-950"
                            : "border border-slate-700 bg-slate-900 text-slate-200"
                        }`}
                      >
                        Modo simple
                      </button>
                      <button
                        onClick={() => setMode("advanced")}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          mode === "advanced"
                            ? "bg-white text-slate-950"
                            : "border border-slate-700 bg-slate-900 text-slate-200"
                        }`}
                      >
                        Avanzado
                      </button>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Producto activo</p>
                          <h3 className="mt-2 text-2xl font-bold text-white">{product.name}</h3>
                        </div>
                        <div className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300">
                          Listo para publicar
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {[
                          "Selecciona producto",
                          "Genera contenido",
                          "Copia y publica",
                        ].map((step, index) => (
                          <div key={step} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
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
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500"
                        >
                          Cambiar producto
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyText(summary, "summary")}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 font-semibold text-slate-200 hover:border-slate-600"
                        >
                          {copiedKey === "summary" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          Copiar resumen
                        </button>
                      </div>
                    </div>

                    {mode === "advanced" && (
                      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                        <div className="flex items-center gap-2 text-white">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <h3 className="font-bold">Opciones avanzadas</h3>
                        </div>
                        <div className="mt-4 space-y-3 text-sm text-slate-300">
                          <p>• Ajustes de tono y público objetivo</p>
                          <p>• Enfoque competitivo y mensajes B2B</p>
                          <p>• Validación de contenido y exportación técnica</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="flex items-center justify-between gap-3 pb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-lg font-bold text-white">Resultado de la campaña</h3>
                      </div>
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] uppercase text-slate-300">
                        4 canales
                      </span>
                    </div>

                    <div className="space-y-3">
                      {CHANNELS.map(({ label, icon: Icon, color }) => (
                        <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${color}`} />
                              <span className="font-semibold text-white">{label}</span>
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.1em] text-emerald-300">listo</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-400">
                            Mensaje preparado con tono claro, útil y orientado a venta B2B.
                          </p>
                          <button
                            onClick={() => copyText(`Campaña ${label} para ${product.name} (${product.sku})`, `${label}-copy`)}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-indigo-500 hover:text-white"
                          >
                            {copiedKey === `${label}-copy` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === `${label}-copy` ? "Copiado" : "Copiar texto"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <div className="flex items-center gap-2 text-white">
                        <Store className="w-4 h-4 text-indigo-400" />
                        <span className="font-semibold">Resumen final</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">{summary.replace(/\n/g, " ")}</p>
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
