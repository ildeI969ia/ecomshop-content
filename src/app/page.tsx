"use client";

import { useEffect, useState } from "react";
import { LogOut, RefreshCw, Sparkles, ArrowLeft } from "lucide-react";
import { CorporateSignIn } from "@/components/auth/CorporateSignIn";
import { CommandCenter } from "@/components/os/CommandCenter";
import { CampaignWorkspace } from "@/components/os/CampaignWorkspace";

type User = {
  uid: string;
  email: string;
  role: string;
  workspaceId: string;
};

type View = "command" | "campaign" | "content";

const PRODUCTS = [
  { sku: "ECW510", name: "ECW510 Wi-Fi 7 Gateway", url: "https://www.ecomshop.es/ecw510/", category: "wifi" },
  { sku: "ST3116G", name: "ST3116G Switch PoE", url: "https://www.ecomshop.es/", category: "switches" },
];

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Verificando sesión corporativa...
      </div>
    </main>
  );
}

function ContentStudio({ onBack }: { onBack: () => void }) {
  const [sku, setSku] = useState(PRODUCTS[0].sku);
  const [topicTitle, setTopicTitle] = useState("Wi-Fi 7 profesional para despliegues B2B");
  const [audience, setAudience] = useState("Integrador B2B");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const product = PRODUCTS.find((item) => item.sku === sku) ?? PRODUCTS[0];

  const generate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: product.sku,
          topicTitle,
          category: product.category,
          targetAudience: audience,
          productUrl: product.url,
          customAngle: "ROI",
          businessGoal: "ALL_OPPORTUNITIES",
          syncWhatsApp: true,
          syncLinkedIn: true,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `Error HTTP ${response.status}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el contenido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> VOLVER AL COMMAND CENTER
      </button>

      <section className="bg-white border border-slate-200 rounded-sm p-6">
        <div className="flex items-center gap-2 text-sky-700 text-xs font-mono font-bold uppercase tracking-widest">
          <Sparkles className="h-4 w-4" /> Content Studio
        </div>
        <h1 className="mt-2 text-2xl font-serif font-bold text-slate-900">Generación multicanal real</h1>
        <p className="mt-1 text-sm text-slate-600">
          La petición pasa por autenticación, presupuesto, inteligencia de producto, generación, validación y persistencia.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-700">
            Producto
            <select value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm">
              {PRODUCTS.map((item) => <option key={item.sku} value={item.sku}>{item.sku} — {item.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700 md:col-span-2">
            Tema
            <input value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Público
            <input value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>

        <button onClick={generate} disabled={loading} className="mt-6 inline-flex items-center gap-2 rounded-sm bg-slate-900 px-4 py-2.5 text-xs font-mono font-bold uppercase text-white disabled:opacity-50">
          <Sparkles className="h-4 w-4" /> {loading ? "GENERANDO..." : "GENERAR PAQUETE"}
        </button>

        {error && <div className="mt-4 rounded-sm border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

        {result && (
          <div className="mt-6 rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="font-bold">Generación completada</div>
            <div className="mt-1">ID: {result.id ?? "—"}</div>
            <div>Fact-check: {result.factCheckScore ?? "—"}</div>
            <div>Grounding: {result.groundingValidation?.isValid === true ? "válido" : result.groundingValidation ? "requiere revisión" : "no disponible"}</div>
            <div>Canales: Blog, Mailchimp, WhatsApp y LinkedIn</div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function Page() {
  const [status, setStatus] = useState<"loading" | "signed-out" | "signed-in">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("command");
  const [syncing, setSyncing] = useState(false);

  const loadSession = async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        setStatus("signed-out");
        return;
      }
      const data = await response.json();
      setUser(data.user);
      setStatus("signed-in");
    } catch {
      setUser(null);
      setStatus("signed-out");
    }
  };

  useEffect(() => {
    void loadSession();
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setStatus("signed-out");
    setView("command");
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/health/persistence?verifyUrls=0", { cache: "no-store" });
      if (!response.ok) throw new Error("El diagnóstico de persistencia no está disponible.");
    } finally {
      setSyncing(false);
    }
  };

  if (status === "loading") return <LoadingScreen />;
  if (status === "signed-out") return <CorporateSignIn onSuccess={(nextUser) => { setUser(nextUser); setStatus("signed-in"); }} />;
  if (!user) return <LoadingScreen />;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-sky-700">EcomSpain</div>
            <h1 className="text-xl font-serif font-bold">Marketing OS</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono text-slate-500">{user.email} · {user.role}</span>
            <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-sm border border-slate-300 px-3 py-1.5 font-mono font-bold hover:bg-white">
              <LogOut className="h-3.5 w-3.5" /> SALIR
            </button>
          </div>
        </header>

        {view === "command" && (
          <CommandCenter
            user={user}
            onNavigateToContent={() => setView("content")}
            onNavigateToCampaign={() => setView("campaign")}
            onNavigateToDiagnostic={() => setView("content")}
            onSyncFirestore={sync}
            syncing={syncing}
          />
        )}

        {view === "campaign" && (
          <CampaignWorkspace
            onBack={() => setView("command")}
            onOpenContentStudio={() => setView("content")}
          />
        )}

        {view === "content" && <ContentStudio onBack={() => setView("command")} />}
      </div>
    </main>
  );
}
