"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Check, Copy, FileText, Mail, MessageSquare, Sparkles, Store, Zap } from "lucide-react";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { QuickStartModal } from "@/components/quick-start-modal";
import { SimplifiedDashboard } from "@/components/simplified-dashboard";

const PRODUCT_CATALOG = [
  { sku: "ECW510", name: "ECW510 Wi‑Fi 7 Gateway", category: "Gateway" },
  { sku: "DAC-10G-3M", name: "DAC-10G-3M 3m", category: "Fibra" },
  { sku: "ST3116G", name: "ST3116G Switch PoE", category: "Switch" },
  { sku: "ECW210", name: "ECW210 Access Point", category: "Wi‑Fi" },
  { sku: "LUX-100", name: "LUX-100 Optics Kit", category: "Fibra" },
  { sku: "RUTX12", name: "RUTX12 Router Cellular", category: "Gateway" },
];

function CampaignPreview({ sku }: { sku: string }) {
  const selected = useMemo(
    () => PRODUCT_CATALOG.find((product) => product.sku === sku) ?? PRODUCT_CATALOG[0],
    [sku],
  );

  const channels = [
    { label: "Blog", icon: BookOpen, color: "text-sky-400" },
    { label: "LinkedIn", icon: FileText, color: "text-blue-400" },
    { label: "WhatsApp", icon: MessageSquare, color: "text-emerald-400" },
    { label: "Email", icon: Mail, color: "text-violet-400" },
  ];

  const [copied, setCopied] = useState<string | null>(null);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-800/40 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 p-6 text-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Producto activo</p>
            <h2 className="mt-2 text-2xl font-bold">{selected.name}</h2>
            <p className="mt-1 text-sm text-slate-300">SKU: {selected.sku}</p>
          </div>
          <div className="rounded-xl border border-emerald-600/40 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            Generación lista
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {channels.map(({ label, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <p className="font-semibold text-white">{label}</p>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300">
                listo
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Texto preparado para presentar el producto de forma clara y comercial.
            </p>
            <button
              onClick={() => copyText(`Campaña para ${selected.name} (${selected.sku})`, `${label}-copy`)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-indigo-500 hover:text-white"
            >
              {copied === `${label}-copy` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied === `${label}-copy` ? "Copiado" : "Copiar texto"}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Resumen de campaña</h3>
          </div>
          <button
            onClick={() => copyText(`Producto: ${selected.name} (${selected.sku})\n\nPunto fuerte: rendimiento, conectividad y confiabilidad para clientes B2B.\nCanales: blog, email, LinkedIn y WhatsApp.`, "summary-copy")}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            {copied === "summary-copy" ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === "summary-copy" ? "Resumen copiado" : "Copiar resumen"}
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
          Este producto está preparado para una campaña comercial B2B con enfoque técnico, claro y directo.
          La propuesta combina valor técnico, conectividad y facilidad de despliegue, con mensajes adaptados a
          blog, correo, redes o WhatsApp.
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  const handleGenerateCampaign = () => {
    setShowQuickStart(true);
  };

  const handleSelectProduct = (sku: string) => {
    setSelectedSku(sku);
    setShowQuickStart(false);
  };

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
          <header className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 font-black text-white">
                E
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">EcomSpain</p>
                <h1 className="text-lg font-bold text-white">Marketing OS</h1>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <button className="rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700">Inicio</button>
              <button onClick={handleGenerateCampaign} className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-500">
                Crear campaña
              </button>
              <button className="rounded-lg border border-slate-700 px-3 py-2 hover:border-slate-600">
                Historial
              </button>
            </nav>
          </header>

          <main className="mt-8">
            {selectedSku ? (
              <CampaignPreview sku={selectedSku} />
            ) : (
              <SimplifiedDashboard
                onGenerateCampaign={handleGenerateCampaign}
                onViewHistory={() => setShowQuickStart(true)}
                onViewRadar={() => setShowQuickStart(true)}
                recentCampaigns={[
                  { id: "1", title: "Campaña ECW510", date: "Hoy" },
                  { id: "2", title: "Lanzamiento ST3116G", date: "Ayer" },
                ]}
              />
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
