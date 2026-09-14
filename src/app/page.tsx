"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  Layers, 
  Globe, 
  Mail, 
  MessageSquare, 
  Share2, 
  ExternalLink, 
  ChevronRight, 
  BookOpen, 
  Key, 
  Bot, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  Image as ImageIcon,
  History,
  DollarSign,
  Download,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Plus
} from "lucide-react";
import { PRESET_TOPICS, ECOM_BRAND, STAR_PRODUCTS, CAMPAIGN_IDEAS, B2B_CTA_OPTIONS } from "@/lib/knowledge";
import { ContentOutput } from "@/lib/schema";
import { StrategicAngle } from "@/lib/gemini-agent";
import { PRESET_IMAGE_PROMPTS } from "@/lib/image-generator";
import { UsageRecord, calculateUsageCost } from "@/lib/finops";

export default function ContentDashboard() {
  const [selectedPresetId, setSelectedPresetId] = useState(PRESET_TOPICS[0].id);
  const [topicTitle, setTopicTitle] = useState(PRESET_TOPICS[0].title);
  const [category, setCategory] = useState<"wifi" | "switches" | "fibra" | "engenius" | "general">("engenius");
  const [targetAudience, setTargetAudience] = useState(PRESET_TOPICS[0].targetAudience);
  const [productUrl, setProductUrl] = useState(PRESET_TOPICS[0].suggestedProducts[0]?.url || ECOM_BRAND.storeUrl);
  const [customNotes, setCustomNotes] = useState("");

  // Asistente Mailchimp
  const [selectedCampaignIdea, setSelectedCampaignIdea] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(["ecw536"]);
  const [customProductText, setCustomProductText] = useState("");
  const [customProductLink, setCustomProductLink] = useState("");
  const [selectedCtaId, setSelectedCtaId] = useState<string>(B2B_CTA_OPTIONS[0].id);
  const [customCtaText, setCustomCtaText] = useState(B2B_CTA_OPTIONS[0].defaultButtonText);
  const [customCtaUrl, setCustomCtaUrl] = useState(B2B_CTA_OPTIONS[0].defaultUrl);
  const [syncWhatsApp, setSyncWhatsApp] = useState(true);
  const [syncLinkedIn, setSyncLinkedIn] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<ContentOutput | null>(null);
  // Vista Principal del Panel de Administración (4 Módulos)
  const [mainView, setMainView] = useState<"generator" | "history" | "image_studio" | "finops">("generator");

  // Historial de Contenidos y Estados
  interface ArticleHistoryItem {
    id: string;
    title: string;
    category: string;
    status: "draft" | "reviewed" | "approved" | "published";
    createdAt: string;
    content: ContentOutput;
  }
  const [historyItems, setHistoryItems] = useState<ArticleHistoryItem[]>([]);
  const [searchHistory, setSearchHistory] = useState("");

  // Estudio de Imágenes (Imagen 3)
  const [imagePrompt, setImagePrompt] = useState(PRESET_IMAGE_PROMPTS[0].prompt);
  const [imageAspectRatio, setImageAspectRatio] = useState<"16:9" | "1:1" | "4:3">("16:9");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImagesList, setGeneratedImagesList] = useState<{ id: string; url: string; prompt: string; createdAt: string }[]>([]);

  const [activeTab, setActiveTab] = useState<"blog" | "mailchimp" | "whatsapp" | "linkedin">("blog");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Monitor FinOps de Costes
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);

  useEffect(() => {
    // Cargar historial y finops de localStorage
    const savedHist = localStorage.getItem("ecomshop_article_history");
    if (savedHist) {
      try { setHistoryItems(JSON.parse(savedHist)); } catch {}
    }
    const savedFinops = localStorage.getItem("ecomshop_finops_records");
    if (savedFinops) {
      try { setUsageRecords(JSON.parse(savedFinops)); } catch {}
    }
    const savedImgs = localStorage.getItem("ecomshop_generated_images");
    if (savedImgs) {
      try { setGeneratedImagesList(JSON.parse(savedImgs)); } catch {}
    }
  }, []);

  const addFinopsRecord = (record: Omit<UsageRecord, "id" | "timestamp" | "estimatedCostEur">) => {
    const cost = calculateUsageCost({
      action: record.action,
      tokensInput: record.tokensInput,
      tokensOutput: record.tokensOutput,
      imageCount: record.imageCount
    });
    const newRecord: UsageRecord = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action: record.action,
      details: record.details,
      tokensInput: record.tokensInput,
      tokensOutput: record.tokensOutput,
      imageCount: record.imageCount,
      estimatedCostEur: cost
    };
    setUsageRecords((prev) => {
      const updated = [newRecord, ...prev];
      localStorage.setItem("ecomshop_finops_records", JSON.stringify(updated.slice(0, 100)));
      return updated;
    });
  };

  // Configuración Gemini API & Agente Estratégico
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [keyStatus, setKeyStatus] = useState<"unchecked" | "valid" | "invalid">("unchecked");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);
  
  const [strategicAngles, setStrategicAngles] = useState<StrategicAngle[]>([]);
  const [selectedAngleId, setSelectedAngleId] = useState<string | null>(null);
  const [loadingAngles, setLoadingAngles] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ecomshop_gemini_key");
    if (saved) {
      setGeminiApiKey(saved);
      checkKeyValidity(saved);
    }
  }, []);

  const checkKeyValidity = async (keyToTest: string) => {
    if (!keyToTest) {
      setKeyStatus("unchecked");
      return;
    }
    setValidatingKey(true);
    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToTest })
      });
      if (res.ok) {
        setKeyStatus("valid");
        localStorage.setItem("ecomshop_gemini_key", keyToTest);
      } else {
        setKeyStatus("invalid");
      }
    } catch {
      setKeyStatus("invalid");
    } finally {
      setValidatingKey(false);
    }
  };

  const handleFetchStrategicAngles = async () => {
    setLoadingAngles(true);
    try {
      const res = await fetch("/api/strategy/angles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicTitle,
          category,
          apiKey: geminiApiKey || undefined
        })
      });
      const data = await res.json();
      if (data.angles) {
        setStrategicAngles(data.angles);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAngles(false);
    }
  };

  const handleApplyAngle = (angle: StrategicAngle) => {
    setSelectedAngleId(angle.id);
    setTopicTitle(angle.headline);
    setCustomNotes(`Ángulo Estratégico [${angle.title}]:\n- Gancho: ${angle.hook}\n- Argumento Técnico: ${angle.coreArgument}`);
    const ctaMatch = B2B_CTA_OPTIONS.find((c) => c.label === angle.recommendedCta);
    if (ctaMatch) {
      setSelectedCtaId(ctaMatch.id);
      setCustomCtaText(ctaMatch.defaultButtonText);
      setCustomCtaUrl(ctaMatch.defaultUrl);
    }
  };

  const handleSelectPreset = (id: string) => {
    setSelectedPresetId(id);
    const preset = PRESET_TOPICS.find((p) => p.id === id);
    if (preset) {
      setTopicTitle(preset.title);
      setCategory(preset.category);
      setTargetAudience(preset.targetAudience);
      setProductUrl(preset.suggestedProducts[0]?.url || ECOM_BRAND.storeUrl);
      setCustomNotes(`Puntos clave:\n- ${preset.keyPoints.join("\n- ")}`);
      setStrategicAngles([]);
      setSelectedAngleId(null);
    }
  };

  const handleSelectIdea = (ideaId: string) => {
    setSelectedCampaignIdea(ideaId);
    const idea = CAMPAIGN_IDEAS.find((i) => i.id === ideaId);
    if (idea) {
      setTopicTitle(idea.title);
      setSelectedProducts(idea.recommendedProducts);
      const ctaOpt = B2B_CTA_OPTIONS.find((c) => c.label === idea.targetObjective) || B2B_CTA_OPTIONS[0];
      setSelectedCtaId(ctaOpt.id);
      setCustomCtaText(ctaOpt.defaultButtonText);
      setCustomCtaUrl(ctaOpt.defaultUrl);
      setCustomNotes(`Ángulo de campaña:\n${idea.angle}`);
    }
  };

  const handleCtaOptionChange = (ctaId: string) => {
    setSelectedCtaId(ctaId);
    const opt = B2B_CTA_OPTIONS.find((c) => c.id === ctaId);
    if (opt) {
      setCustomCtaText(opt.defaultButtonText);
      setCustomCtaUrl(opt.defaultUrl);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicTitle,
          category,
          targetAudience,
          productUrl,
          customNotes,
          promotedProductIds: selectedProducts,
          customEquipmentName: customProductText,
          customEquipmentUrl: customProductLink,
          ctaObjective: B2B_CTA_OPTIONS.find((c) => c.id === selectedCtaId)?.label,
          ctaButtonText: customCtaText,
          ctaUrl: customCtaUrl,
          syncWhatsApp,
          syncLinkedIn,
          apiKey: geminiApiKey || undefined
        })
      });

      if (!res.ok) throw new Error("Fallo al generar contenido");
      const data: ContentOutput = await res.json();
      setContent(data);
      setActiveTab("blog");

      // Registrar métrica en FinOps
      addFinopsRecord({
        action: "gemini_generation",
        details: `Campaña Multicanal: ${data.topicTitle.substring(0, 35)}...`,
        tokensInput: 1250,
        tokensOutput: 2400
      });

      // Guardar en Historial de Artículos
      const historyEntry: ArticleHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        title: data.topicTitle,
        category: data.category,
        status: "draft",
        createdAt: new Date().toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        }),
        content: data
      };
      setHistoryItems((prev) => {
        const updated = [historyEntry, ...prev];
        localStorage.setItem("ecomshop_article_history", JSON.stringify(updated.slice(0, 50)));
        return updated;
      });
    } catch (err) {
      console.error(err);
      alert("Hubo un error al generar el contenido.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt) return;
    setGeneratingImage(true);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio: imageAspectRatio,
          apiKey: geminiApiKey || undefined
        })
      });
      const data = await res.json();
      if (data.imageUrl) {
        const newImg = {
          id: Math.random().toString(36).substring(2, 9),
          url: data.imageUrl,
          prompt: imagePrompt,
          createdAt: new Date().toLocaleTimeString("es-ES")
        };
        setGeneratedImagesList((prev) => {
          const updated = [newImg, ...prev];
          localStorage.setItem("ecomshop_generated_images", JSON.stringify(updated.slice(0, 20)));
          return updated;
        });

        // Registrar coste en FinOps
        addFinopsRecord({
          action: "imagen_image",
          details: `Google Imagen 3: ${imagePrompt.substring(0, 35)}...`,
          imageCount: 1
        });
      }
    } catch (err) {
      console.error(err);
      alert("Error al generar la imagen.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const updateArticleStatus = (id: string, newStatus: ArticleHistoryItem["status"]) => {
    setHistoryItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item));
      localStorage.setItem("ecomshop_article_history", JSON.stringify(updated));
      return updated;
    });
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* Top Editorial Ribbon */}
      <div className="bg-[#0f172a] text-slate-300 text-[11px] px-6 py-1.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3 tracking-wider uppercase font-semibold">
          <span className="text-sky-400 font-bold">EcomShop Gazette</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">Editorial Commerce & Networking Engine</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            ● Google Cloud Run + Firebase Firestore
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <a
            href={ECOM_BRAND.blogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white flex items-center gap-1 transition"
          >
            <Globe className="w-3 h-3 text-sky-400" />
            Blog Durable
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a
            href={ECOM_BRAND.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white flex items-center gap-1 transition"
          >
            <BookOpen className="w-3 h-3 text-emerald-400" />
            EcomShop.es
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Main Editorial Masthead */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <div className="bg-[#0f172a] text-white p-2.5 rounded-lg shadow-sm">
            <Layers className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-editorial text-xl font-bold tracking-tight text-slate-950">
                EcomShop Editorial
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                B2B Suite
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Curaduría Semanal • Redacción Multicanal • Automatización Omnicanal
            </p>
          </div>
        </div>

        {/* 4 Módulos de Navegación del Panel */}
        <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setMainView("generator")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mainView === "generator"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            Generador Multicanal
          </button>

          <button
            onClick={() => setMainView("history")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mainView === "history"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            Historial & Estados
            {historyItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                {historyItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainView("image_studio")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mainView === "image_studio"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
            Estudio Imagen 3
          </button>

          <button
            onClick={() => setMainView("finops")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mainView === "finops"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            Costes & FinOps
          </button>
        </nav>

        <div className="flex items-center gap-3 text-xs">
          {/* Gemini API Status Badge & Config */}
          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium transition shadow-2xs ${
              keyStatus === "valid"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70"
                : keyStatus === "invalid"
                ? "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100/70"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-slate-600" />
            <span className="font-semibold text-xs">
              {keyStatus === "valid"
                ? "Gemini 2.5 Flash Activo"
                : keyStatus === "invalid"
                ? "API Key Inválida"
                : "Conectar Gemini API"}
            </span>
            <div
              className={`w-2 h-2 rounded-full ${
                keyStatus === "valid" ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
            />
          </button>
        </div>
      </header>

      {/* Contenido según Módulo Seleccionado */}
      {mainView === "generator" && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full">
          {/* Columna Izquierda: Configuración del Tema */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Edición Semanal</span>
                  <h2 className="font-editorial text-base font-bold text-slate-900">Temas Sugeridos</h2>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  B2B Editorial
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {PRESET_TOPICS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`text-left p-3 rounded-lg border text-xs transition flex flex-col gap-1.5 ${
                      selectedPresetId === preset.id
                        ? "bg-sky-50/60 border-sky-400 text-sky-950 shadow-2xs"
                        : "bg-white border-slate-200/70 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="uppercase tracking-wider text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {preset.category}
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 ${selectedPresetId === preset.id ? "text-sky-600" : "text-slate-400"}`} />
                    </div>
                    <span className="font-semibold text-xs leading-snug text-slate-900">{preset.title}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{preset.targetAudience}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3 Ángulos Estratégicos (Agente Gemini) */}
            <div className="bg-white border border-indigo-200/80 rounded-xl p-5 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500" />
              <div className="flex items-center justify-between mb-3 pt-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">IA Copilot</span>
                  <h3 className="font-editorial text-sm font-bold text-slate-900">Ángulos Estratégicos</h3>
                </div>
                <button
                  onClick={handleFetchStrategicAngles}
                  disabled={loadingAngles}
                  className="text-xs bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-2xs"
                >
                  {loadingAngles ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-sky-400" />
                      Sugerir 3 Ángulos
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 mb-3">
                Selecciona la tesis de valor comercial o técnica para guiar la redacción:
              </p>

              {strategicAngles.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {strategicAngles.map((angle) => (
                    <button
                      key={angle.id}
                      onClick={() => handleApplyAngle(angle)}
                      className={`text-left p-3 rounded-lg border text-xs transition flex flex-col gap-1.5 ${
                        selectedAngleId === angle.id
                          ? "bg-indigo-50/70 border-indigo-500 text-indigo-950 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{angle.title}</span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          {angle.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{angle.hook}</p>
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        CTA: {angle.recommendedCta}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 text-center text-xs text-slate-500">
                  Haz clic en <strong>"Sugerir 3 Ángulos"</strong> para que el agente extraiga enfoques de ROI/Costes, Rendimiento 10G o Casos de Éxito.
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex flex-col gap-4 shadow-xs">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Composición</span>
                <h2 className="font-editorial text-base font-bold text-slate-900">Parámetros de Publicación</h2>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Título del Artículo / Cobertura</label>
                <input
                  type="text"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition"
                  >
                    <option value="engenius">EnGenius Networks</option>
                    <option value="wifi">WiFi Profesional / WiFi 7</option>
                    <option value="switches">Switches & PoE</option>
                    <option value="fibra">Fibra Óptica</option>
                    <option value="general">Networking General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Público Objetivo</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">URL de Producto Destacado</label>
                <input
                  type="text"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Notas Clave / Especificaciones</label>
                <textarea
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Añade detalles técnicos específicos, modelos o promociones..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition resize-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition shadow-sm"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Componiendo Edición Multicanal...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    Generar Paquete Multicanal
                  </>
                )}
              </button>
            </div>
          </div>

        {/* Columna Derecha: Previsualización & Derivación Multicanal */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {content ? (
            <div className="bg-white border border-slate-200/80 rounded-xl flex flex-col h-full shadow-xs overflow-hidden">
              {/* Tab Navigation */}
              <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-4 py-2.5">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("blog")}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === "blog"
                        ? "bg-white text-slate-950 border border-slate-200 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-600" />
                    Blog Durable (HTML)
                  </button>

                  <button
                    onClick={() => setActiveTab("mailchimp")}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === "mailchimp"
                        ? "bg-white text-slate-950 border border-slate-200 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-600" />
                    Mailchimp B2B
                  </button>

                  <button
                    onClick={() => setActiveTab("whatsapp")}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === "whatsapp"
                        ? "bg-white text-slate-950 border border-slate-200 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    WhatsApp Broadcast
                  </button>

                  <button
                    onClick={() => setActiveTab("linkedin")}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === "linkedin"
                        ? "bg-white text-slate-950 border border-slate-200 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    LinkedIn B2B
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>AEO / GEO Calibrado</span>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="p-6 flex-1 overflow-y-auto max-h-[750px]">
                {/* 1. BLOG DURABLE TAB */}
                {activeTab === "blog" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-sky-600">Título SEO & Cabecera</span>
                        <h3 className="font-editorial text-lg font-bold text-slate-950 mt-0.5">{content.blog.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span>Slug: <code className="text-sky-700 font-mono bg-sky-50 px-1 py-0.5 rounded border border-sky-200">/{content.blog.slug}</code></span>
                          <span>•</span>
                          <span>Lectura: <strong>{content.blog.readingTimeMinutes} min</strong></span>
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(content.blog.htmlContent, "blog-html")}
                        className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition shadow-xs shrink-0"
                      >
                        {copiedKey === "blog-html" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
                        {copiedKey === "blog-html" ? "¡Copiado!" : "Copiar HTML Durable"}
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-8 bg-white text-slate-900 shadow-xs overflow-x-auto">
                      <div 
                        className="prose max-w-none text-sm font-sans"
                        dangerouslySetInnerHTML={{ __html: content.blog.htmlContent }}
                      />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
                      <span className="text-xs font-bold text-slate-700">Código HTML Puro (para pegar en el bloque de código de Durable):</span>
                      <pre className="text-[11px] text-slate-700 bg-white p-3 rounded-lg overflow-x-auto font-mono max-h-48 border border-slate-200">
                        {content.blog.htmlContent}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 2. MAILCHIMP TAB (Asistente Interactivo) */}
                {activeTab === "mailchimp" && (
                  <div className="flex flex-col gap-6">
                    {/* Asistente Paso a Paso */}
                    <div className="bg-slate-950 border border-amber-900/40 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                            Asistente de Campaña Mailchimp
                          </span>
                          <span className="text-xs text-slate-400">Personaliza la oferta técnica y el CTA antes de generar</span>
                        </div>
                        <button
                          onClick={handleGenerate}
                          disabled={loading}
                          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Regenerar Email con estos Equipos
                        </button>
                      </div>

                      {/* Paso 1: Ideas de Campaña */}
                      <div className="mb-5">
                        <label className="text-xs font-bold text-amber-300 block mb-2">
                          Paso 1: Selecciona una Idea o Enfoque de Campaña B2B
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {CAMPAIGN_IDEAS.map((idea) => (
                            <button
                              key={idea.id}
                              onClick={() => handleSelectIdea(idea.id)}
                              className={`text-left p-3 rounded-lg border text-xs transition flex flex-col gap-1 ${
                                selectedCampaignIdea === idea.id
                                  ? "bg-amber-950/40 border-amber-500 text-amber-200"
                                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white">{idea.title}</span>
                                <span className="text-[10px] text-amber-400 font-mono">Paso 1</span>
                              </div>
                              <p className="text-[11px] text-slate-400">{idea.angle}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Paso 2: Equipos a Promocionar */}
                      <div className="mb-5">
                        <label className="text-xs font-bold text-amber-300 block mb-2">
                          Paso 2: ¿Qué equipo o equipos quieres promocionar en este correo?
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
                          {STAR_PRODUCTS.map((prod) => {
                            const isChecked = selectedProducts.includes(prod.id);
                            return (
                              <div
                                key={prod.id}
                                onClick={() => toggleProductSelection(prod.id)}
                                className={`cursor-pointer p-3 rounded-lg border text-xs transition flex items-start gap-3 ${
                                  isChecked
                                    ? "bg-slate-900 border-amber-500 text-white"
                                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-white">{prod.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                                      {prod.category}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{prod.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Producto personalizado manual */}
                        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                          <span className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                            ¿Quieres añadir otro equipo a medida que no esté en la lista?
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={customProductText}
                              onChange={(e) => setCustomProductText(e.target.value)}
                              placeholder="Ej: Switch Industrial EnGenius Gigabit..."
                              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={customProductLink}
                              onChange={(e) => setCustomProductLink(e.target.value)}
                              placeholder="URL del producto (https://www.ecomshop.es/...)"
                              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Paso 3: Llamada a la Acción (CTA) */}
                      <div className="mb-4">
                        <label className="text-xs font-bold text-amber-300 block mb-2">
                          Paso 3: ¿Qué llamada a la acción (CTA) quieres realizar?
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                          {B2B_CTA_OPTIONS.map((cta) => (
                            <button
                              key={cta.id}
                              onClick={() => handleCtaOptionChange(cta.id)}
                              className={`text-left p-2.5 rounded-lg border text-xs transition ${
                                selectedCtaId === cta.id
                                  ? "bg-amber-950/50 border-amber-500 text-amber-200"
                                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                              }`}
                            >
                              <div className="font-semibold">{cta.label}</div>
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Texto en el botón:</label>
                            <input
                              type="text"
                              value={customCtaText}
                              onChange={(e) => setCustomCtaText(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">URL de destino:</label>
                            <input
                              type="text"
                              value={customCtaUrl}
                              onChange={(e) => setCustomCtaUrl(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sincronización Multicanal */}
                      <div className="pt-2 border-t border-slate-800 flex items-center gap-6 text-xs text-slate-300">
                        <span className="font-bold text-slate-400">Sincronizar con otros canales:</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={syncWhatsApp}
                            onChange={(e) => setSyncWhatsApp(e.target.checked)}
                            className="rounded border-slate-700 text-emerald-500"
                          />
                          <span>Incluir en difusiones de WhatsApp</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={syncLinkedIn}
                            onChange={(e) => setSyncLinkedIn(e.target.checked)}
                            className="rounded border-slate-700 text-blue-500"
                          />
                          <span>Mencionar equipos en post de LinkedIn</span>
                        </label>
                      </div>
                    </div>

                    {/* Previsualización del Correo */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-xs text-amber-400 font-semibold block mb-1">Asunto A (A/B Testing):</span>
                        <p className="text-xs text-slate-200">{content.mailchimp.subjectA}</p>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-xs text-amber-400 font-semibold block mb-1">Asunto B (A/B Testing):</span>
                        <p className="text-xs text-slate-200">{content.mailchimp.subjectB}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400">Preheader / Texto previo:</span>
                        <p className="text-xs text-slate-300">{content.mailchimp.previewText}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(content.mailchimp.newsletterHtml, "mailchimp-html")}
                        className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition"
                      >
                        {copiedKey === "mailchimp-html" ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        {copiedKey === "mailchimp-html" ? "¡Copiado!" : "Copiar HTML Newsletter"}
                      </button>
                    </div>

                    <div className="border border-slate-800 rounded-lg p-6 bg-slate-100 shadow-inner flex justify-center">
                      <div 
                        className="max-w-xl w-full"
                        dangerouslySetInnerHTML={{ __html: content.mailchimp.newsletterHtml }}
                      />
                    </div>
                  </div>
                )}

                {/* 3. WHATSAPP TAB */}
                {activeTab === "whatsapp" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-xs text-emerald-400 font-semibold">Formato móvil con negritas y emojis:</span>
                        <p className="text-xs text-slate-400">Listo para listas de difusión y comunidades de WhatsApp B2B</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(content.whatsapp.formattedMessage, "whatsapp-text")}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition"
                      >
                        {copiedKey === "whatsapp-text" ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        {copiedKey === "whatsapp-text" ? "¡Copiado!" : "Copiar Texto Formateado"}
                      </button>
                    </div>

                    <div className="bg-[#0b141a] p-6 rounded-xl border border-emerald-950/60 max-w-md mx-auto w-full shadow-lg">
                      <div className="bg-[#202c33] text-[#e9edef] p-4 rounded-lg text-xs leading-relaxed whitespace-pre-line border-l-4 border-emerald-500">
                        {content.whatsapp.formattedMessage}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. LINKEDIN TAB */}
                {activeTab === "linkedin" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-xs text-blue-400 font-semibold">Post B2B con Hook + Valor Técnico:</span>
                        <p className="text-xs text-slate-400">Optimizado para el algoritmo de LinkedIn (debate y lectura)</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(content.linkedin.fullPostText, "linkedin-text")}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition"
                      >
                        {copiedKey === "linkedin-text" ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        {copiedKey === "linkedin-text" ? "¡Copiado!" : "Copiar Post para LinkedIn"}
                      </button>
                    </div>

                    <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 max-w-xl mx-auto w-full">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center font-bold text-white text-sm">
                          ES
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">EcomShop / EcomSpain &bull; B2B Networking</div>
                          <div className="text-[11px] text-slate-400">Mayorista en redes y telecomunicaciones</div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                        {content.linkedin.fullPostText}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl h-full flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-sky-400 mb-4 shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Sin contenido generado aún</h3>
              <p className="text-xs max-w-sm mb-6 text-slate-400">
                Selecciona uno de los temas semanales predefinidos o personaliza los parámetros a la izquierda y pulsa en "Generar Paquete Multicanal".
              </p>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-sky-600/20"
              >
                <Sparkles className="w-4 h-4" />
                Generar primer artículo piloto
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* VISTA 2: HISTORIAL Y ESTADOS */}
      {mainView === "history" && (
        <div className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                Historial de Contenidos & Workflow de Estados
              </h2>
              <p className="text-xs text-slate-400">
                Supervisa los borradores creados por el equipo, aprueba publicaciones o recupera cualquier artículo anterior.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar en historial..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {historyItems.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 flex flex-col items-center">
              <History className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-white">No hay publicaciones en el historial</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Genera tu primer artículo en la pestaña del Generador Multicanal y se guardará automáticamente en este panel compartido.
              </p>
              <button
                onClick={() => setMainView("generator")}
                className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Ir al Generador
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {historyItems
                .filter(item => item.title.toLowerCase().includes(searchHistory.toLowerCase()) || item.category.toLowerCase().includes(searchHistory.toLowerCase()))
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-sky-400">
                        {item.category.substring(0, 3)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white hover:text-sky-400 cursor-pointer" onClick={() => {
                          setContent(item.content);
                          setTopicTitle(item.title);
                          setMainView("generator");
                        }}>
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span>Fecha: {item.createdAt}</span>
                          <span>&bull;</span>
                          <span>Slug: /{item.content.blog.slug}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Selector de Estado */}
                      <select
                        value={item.status}
                        onChange={(e) => updateArticleStatus(item.id, e.target.value as any)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold focus:outline-none ${
                          item.status === "published"
                            ? "bg-purple-950/60 border-purple-600 text-purple-300"
                            : item.status === "approved"
                            ? "bg-emerald-950/60 border-emerald-600 text-emerald-300"
                            : item.status === "reviewed"
                            ? "bg-sky-950/60 border-sky-600 text-sky-300"
                            : "bg-amber-950/60 border-amber-600 text-amber-300"
                        }`}
                      >
                        <option value="draft">🟡 Borrador</option>
                        <option value="reviewed">🔵 Revisado Preventa</option>
                        <option value="approved">🟢 Aprobado</option>
                        <option value="published">🟣 Publicado en Durable</option>
                      </select>

                      <button
                        onClick={() => {
                          setContent(item.content);
                          setTopicTitle(item.title);
                          setMainView("generator");
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        Cargar en Editor
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: ESTUDIO DE IMÁGENES (IMAGEN 3) */}
      {mainView === "image_studio" && (
        <div className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                Estudio de Generación con Google Imagen 3
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Genera imágenes fotorrealistas de infraestructuras IT, racks, APs de techo y fibra óptica para el blog y redes.
              </p>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Plantillas Técnicas Preconfiguradas</label>
                  <div className="grid grid-cols-1 gap-2">
                    {PRESET_IMAGE_PROMPTS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setImagePrompt(p.prompt);
                          setImageAspectRatio(p.aspectRatio);
                        }}
                        className="text-left p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-xs text-slate-300 transition"
                      >
                        <div className="font-semibold text-white">{p.title}</div>
                        <div className="text-[10px] text-purple-400 font-mono mt-0.5">{p.aspectRatio}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Prompt de Generación (Inglés recomendado)</label>
                  <textarea
                    rows={4}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 resize-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Formato / Relación de Aspecto</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["16:9", "1:1", "4:3"] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setImageAspectRatio(ratio)}
                        className={`py-1.5 rounded-lg border text-xs font-semibold transition ${
                          imageAspectRatio === ratio
                            ? "bg-purple-950 border-purple-500 text-purple-200"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateImage}
                  disabled={generatingImage}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/20 mt-2"
                >
                  {generatingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Procesando con Imagen 3...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generar Imagen con IA
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex-1 flex flex-col shadow-sm">
              <h3 className="text-sm font-bold text-white mb-3">Galería de Imágenes Generadas</h3>

              {generatedImagesList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                  <ImageIcon className="w-12 h-12 text-slate-700 mb-2" />
                  <p className="text-xs">No hay imágenes generadas en esta sesión.</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Selecciona una plantilla o escribe un prompt a la izquierda para generar activos visuales para Durable y Redes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[650px]">
                  {generatedImagesList.map((img) => (
                    <div key={img.id} className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden group">
                      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                        <img src={img.url} alt={img.prompt} className="object-cover w-full h-full group-hover:scale-105 transition duration-300" />
                      </div>
                      <div className="p-3 flex flex-col gap-2">
                        <p className="text-[11px] text-slate-400 line-clamp-2">{img.prompt}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                          <span className="text-[10px] text-slate-500">{img.createdAt}</span>
                          <a
                            href={img.url}
                            download={`ecomshop-${img.id}.jpg`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition"
                          >
                            <Download className="w-3 h-3 text-purple-400" />
                            Descargar
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 4: MONITOR FINOPS & VALORACIÓN DE COSTES */}
      {mainView === "finops" && (
        <div className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Monitor FinOps & Valoración de Costes en Tiempo Real
              </h2>
              <p className="text-xs text-slate-400">
                Auditoría continua de consumo en Google Gemini 2.5 Flash, Google Imagen 3, Google Cloud Run y Firebase Firestore.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Precios Oficiales de Producción Calculados
            </div>
          </div>

          {/* Tarjetas de Resumen FinOps */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Gasto Acumulado Sesión</span>
              <div className="text-2xl font-black text-white">
                {usageRecords.reduce((acc, curr) => acc + curr.estimatedCostEur, 0).toFixed(4)} €
              </div>
              <span className="text-[10px] text-emerald-400 font-medium">~0,0008€ por artículo completo</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Google Gemini 2.5 Flash</span>
              <div className="text-2xl font-black text-sky-400">
                {usageRecords.filter(r => r.action.startsWith("gemini")).length} <span className="text-xs font-normal text-slate-400">llamadas</span>
              </div>
              <span className="text-[10px] text-slate-400">0.07€ / 1M input &bull; 0.28€ / 1M output</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Google Imagen 3</span>
              <div className="text-2xl font-black text-purple-400">
                {usageRecords.filter(r => r.action === "imagen_image").length} <span className="text-xs font-normal text-slate-400">imágenes</span>
              </div>
              <span className="text-[10px] text-slate-400">~0.028€ por imagen 8k</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Cloud Run & Firebase</span>
              <div className="text-2xl font-black text-emerald-400">
                0,00 € <span className="text-xs font-normal text-emerald-400/80">(Free Tier)</span>
              </div>
              <span className="text-[10px] text-slate-400">2M req/mes gratis en Cloud Run</span>
            </div>
          </div>

          {/* Registro de Telemetría y Acciones */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white">Registro de Auditoría de Costes (Últimas Transacciones)</h3>
            
            {usageRecords.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Aún no hay consumo registrado. Las peticiones a Gemini e Imagen 3 se registrarán aquí con su coste exacto.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2">Hora</th>
                      <th className="py-2">Servicio / Acción</th>
                      <th className="py-2">Detalles</th>
                      <th className="py-2">Tokens / Unidades</th>
                      <th className="py-2 text-right">Coste Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {usageRecords.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 text-slate-400 font-mono text-[11px]">{new Date(r.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.action.startsWith("gemini")
                              ? "bg-sky-950 text-sky-400 border border-sky-800"
                              : r.action === "imagen_image"
                              ? "bg-purple-950 text-purple-400 border border-purple-800"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          }`}>
                            {r.action}
                          </span>
                        </td>
                        <td className="py-2.5">{r.details}</td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-400">
                          {r.tokensInput ? `In: ${r.tokensInput} / Out: ${r.tokensOutput}` : r.imageCount ? `1 Imagen` : "1 Req"}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                          {r.estimatedCostEur.toFixed(6)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Configuración Gemini API */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Configuración Agente Gemini</h3>
                  <p className="text-[11px] text-slate-400">Gemini 2.5 Flash B2B Strategist</p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 flex flex-col gap-2">
              <p>
                Introduce tu <strong>Google Gemini API Key</strong> para que el agente estratégico genere contenido dinámico B2B con razonamiento avanzado.
              </p>
              <p className="text-slate-400 text-[11px]">
                La clave se almacena de forma segura en tu navegador (localStorage) y se utiliza para las peticiones al motor de generación.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">Gemini API Key</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  setKeyStatus("unchecked");
                }}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Estado de la Key */}
            <div className="flex items-center gap-2 text-xs">
              {validatingKey ? (
                <span className="text-sky-400 flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
                  Comprobando conexión con Gemini...
                </span>
              ) : keyStatus === "valid" ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  API Key válida. Modelo <strong>gemini-2.5-flash</strong> conectado.
                </span>
              ) : keyStatus === "invalid" ? (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Clave inválida o sin permisos en Google Cloud.
                </span>
              ) : (
                <span className="text-slate-400 text-[11px]">
                  Introduce la clave y haz clic en Validar.
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setGeminiApiKey("");
                  localStorage.removeItem("ecomshop_gemini_key");
                  setKeyStatus("unchecked");
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
              >
                Limpiar
              </button>
              <button
                onClick={() => checkKeyValidity(geminiApiKey)}
                disabled={!geminiApiKey || validatingKey}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition"
              >
                Validar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
