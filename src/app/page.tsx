"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Sparkles, 
  Layers, 
  Menu, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Zap,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Database,
  ArrowRight
} from "lucide-react";
import { Sidebar, NavSection } from "@/components/layout/sidebar";
import { useAuth } from "@/lib/auth/use-auth";
import { CorporateSignIn } from "@/components/auth/CorporateSignIn";
import { apiFetch, ApiError } from "@/lib/api-client";
import { ECOMSHOP_FULL_CATALOG, CatalogProduct } from "@/lib/data/ecomshop-catalog";
import { ContentOutput } from "@/lib/schema";
import { ProductOpportunityRecord } from "@/lib/services/opportunity-radar";
import { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import { BusinessGoal } from "@/lib/types/editorial-controls";
import { EditorialAngle } from "@/app/api/editorial/suggest-angles/route";
import { PRESET_IMAGE_PROMPTS } from "@/lib/image-presets";
import { StarProduct } from "@/lib/knowledge";
import { catalogDeviceToStarProduct, getCatalogDevice } from "@/lib/catalog";
import { EnhancedProductSheet } from "@/types/catalog-enhancer";

// Componentes modulares del Sistema
import { CampaignWorkspace } from "@/components/campaign-workspace";
import { GenerationStage } from "@/components/campaign-stepper";
import { OpportunityRadarWidget } from "@/components/opportunity-radar-widget";
import { ProductMarketingWorkspace } from "@/components/marketing/ProductMarketingWorkspace";
import { ProductEnhancer } from "@/components/product-enhancer";
import { ImageStudioView, GeneratedImageItem } from "@/components/image-studio-view";
import { FinOpsDashboard } from "@/components/finops-dashboard";
import { ImageInterrogatorModal } from "@/components/ImageInterrogatorModal";
import { ImageDetailModal, ImageDetailItem } from "@/components/ImageDetailModal";
import { PromptRefinementData } from "@/components/PromptRefinementCard";

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
      <div className="flex items-center gap-3 text-sm text-slate-400 font-mono">
        <RefreshCw className="h-4 w-4 animate-spin text-sky-400" />
        Verificando sesión corporativa @ecomspain.com...
      </div>
    </main>
  );
}

export default function Page() {
  const { user, loading, refreshUser } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSection>("workspace");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estados del Campaign Workspace Multicanal (43+ productos de ecomshop.es)
  const [campaignStage, setCampaignStage] = useState<GenerationStage>("IDLE");
  const [campaignContent, setCampaignContent] = useState<ContentOutput | null>(null);
  const [selectedSku, setSelectedSku] = useState<string>("ECW536");
  const [campaignOpportunity, setCampaignOpportunity] = useState<ProductOpportunityRecord | null>(null);
  const [campaignErrorMessage, setCampaignErrorMessage] = useState<string | null>(null);
  const [intelligenceCard, setIntelligenceCard] = useState<ProductIntelligenceCard | null>(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState<EditorialAngle | null>(null);
  const [freeTopicTitle, setFreeTopicTitle] = useState<string>("");
  const [isSavingArticle, setIsSavingArticle] = useState(false);

  // Catálogo dinámico de ecomshop.es (Firestore + fallback canónico)
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(ECOMSHOP_FULL_CATALOG);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [lastSyncInfo, setLastSyncInfo] = useState<{ timestamp?: string; count?: number } | null>(null);

  // Radar de Oportunidades
  const [radarOpportunities, setRadarOpportunities] = useState<ProductOpportunityRecord[]>([]);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [radarGoal, setRadarGoal] = useState<BusinessGoal>("ALL_OPPORTUNITIES");
  const [launchingRadarSku, setLaunchingRadarSku] = useState<string | null>(null);

  // Mejorador de Ficha de Producto
  const [enhancedSheet, setEnhancedSheet] = useState<EnhancedProductSheet | undefined>(undefined);
  const [loadingEnhancedSheet, setLoadingEnhancedSheet] = useState(false);

  // Estudio de Imágenes
  const [galleryImages, setGalleryImages] = useState<GeneratedImageItem[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [loadingDatabaseAssets, setLoadingDatabaseAssets] = useState(false);
  const [imagePrompt, setImagePrompt] = useState(PRESET_IMAGE_PROMPTS[0].prompt);
  const [imageAspectRatio, setImageAspectRatio] = useState<"16:9" | "1:1" | "4:3">("16:9");
  const [imageBase, setImageBase] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [showInterrogatorModal, setShowInterrogatorModal] = useState(false);
  const [selectedImageForDetail, setSelectedImageForDetail] = useState<ImageDetailItem | null>(null);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [promptRefinement, setPromptRefinement] = useState<PromptRefinementData | null>(null);
  const [refiningPrompt, setRefiningPrompt] = useState(false);

  // 1. Cargar Oportunidades del Radar al entrar en la sección o al iniciar
  const fetchRadar = useCallback(async (goal: BusinessGoal = radarGoal) => {
    setLoadingRadar(true);
    try {
      const data = await apiFetch<{ opportunities: ProductOpportunityRecord[] }>(
        `/api/opportunities?limit=6&goal=${encodeURIComponent(goal)}&shuffle=${Date.now()}`
      );
      if (data?.opportunities) {
        setRadarOpportunities(data.opportunities);
      }
    } catch (err) {
      console.warn("[Radar] No se pudieron cargar oportunidades:", err);
    } finally {
      setLoadingRadar(false);
    }
  }, [radarGoal]);

  // 2. Cargar ficha de inteligencia técnica al seleccionar SKU
  const loadIntelligenceCard = useCallback(async (sku: string) => {
    setLoadingIntelligence(true);
    try {
      const card = await apiFetch<ProductIntelligenceCard>("/api/intelligence", {
        method: "POST",
        body: JSON.stringify({ skuOrModel: sku })
      });
      setIntelligenceCard(card);
    } catch (err) {
      console.warn("[Intelligence] Error al cargar ficha de inteligencia:", err);
    } finally {
      setLoadingIntelligence(false);
    }
  }, []);

  // 3. Cargar imágenes persistidas desde Firestore / Cloud Storage
  const loadDatabaseAssets = useCallback(async () => {
    setLoadingDatabaseAssets(true);
    try {
      const res = await apiFetch<{ assets?: Array<any> }>("/api/assets");
      if (res?.assets && Array.isArray(res.assets)) {
        const formatted: GeneratedImageItem[] = res.assets.map((a: any) => ({
          id: a.id || String(Math.random()),
          url: a.publicUrl || a.url || a.storagePath || "",
          prompt: a.prompt || a.filename || "Activo de Imagen EcomShop",
          createdAt: a.createdAt ? new Date(a.createdAt).toLocaleTimeString("es-ES") : new Date().toLocaleTimeString("es-ES"),
          sourceType: a.aiProvenance?.model || a.sourceType || "imagen3",
          title: a.filename
        }));
        setGalleryImages(formatted);
      }
    } catch (err) {
      console.warn("[Assets] Error cargando galería:", err);
    } finally {
      setLoadingDatabaseAssets(false);
    }
  }, []);

  // 4. Cargar catálogo dinámico de productos desde Firestore (/api/catalog/products)
  const fetchCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await apiFetch<{ products?: CatalogProduct[]; lastSync?: any }>("/api/catalog/products?limit=100");
      if (res?.products && Array.isArray(res.products) && res.products.length > 0) {
        setCatalogProducts(res.products);
      }
      if (res?.lastSync) {
        setLastSyncInfo(res.lastSync);
      }
    } catch (err) {
      console.warn("[Catalog] Usando catálogo estático por fallback:", err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  // 5. Disparar sincronización activa contra ecomshop.es (/api/catalog/sync)
  const handleSyncWithEcomshop = async () => {
    if (isSyncingCatalog) return;
    setIsSyncingCatalog(true);
    try {
      const res = await apiFetch<{ success: boolean; count: number; message: string }>("/api/catalog/sync", {
        method: "POST",
        body: JSON.stringify({ maxItems: 35 })
      });
      alert(res.message || "Catálogo sincronizado exitosamente con ecomshop.es");
      await fetchCatalog();
    } catch (err: unknown) {
      alert(`Error al sincronizar con ecomshop.es: ${err.message || String(err)}`);
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  // Efecto para sincronizar según sección activa y cargar catálogo
  useEffect(() => {
    if (!user) return;
    fetchCatalog();
    if (activeSection === "radar" && radarOpportunities.length === 0) {
      fetchRadar();
    }
    if (activeSection === "images" && galleryImages.length === 0) {
      loadDatabaseAssets();
    }
  }, [activeSection, user, fetchRadar, fetchCatalog, loadDatabaseAssets, radarOpportunities.length, galleryImages.length]);

  // Cargar inteligencia técnica del SKU por defecto
  useEffect(() => {
    if (user && selectedSku && !intelligenceCard) {
      loadIntelligenceCard(selectedSku);
    }
  }, [user, selectedSku, intelligenceCard, loadIntelligenceCard]);

  // Preparar un SKU para el workspace sin generar todavía: limpia cualquier decisión editorial anterior.
  const handlePrepareCampaignSku = async (sku: string, opportunity?: ProductOpportunityRecord) => {
    setSelectedSku(sku);
    setCampaignOpportunity(opportunity || null);
    setSelectedAngle(null);
    setFreeTopicTitle("");
    setCampaignContent(null);
    setCampaignErrorMessage(null);
    setCampaignStage("IDLE");
    setActiveSection("workspace");
    await loadIntelligenceCard(sku);
  };

  // Disparar generación multicanal completa para un SKU
  const handleLaunchWithSku = async (sku: string) => {
    const product = catalogProducts.find((p) => p.sku === sku) || ECOMSHOP_FULL_CATALOG.find((p) => p.sku === sku);
    setSelectedSku(sku);
    setCampaignStage("EXTRACTING");
    setCampaignErrorMessage(null);
    setCampaignContent(null);
    setActiveSection("workspace");

    // Progresión visual de etapas
    const t1 = setTimeout(() => {
      setCampaignStage((prev) => (prev === "EXTRACTING" ? "NOTEBOOK_GROUNDING" : prev));
    }, 1200);

    const t2 = setTimeout(() => {
      setCampaignStage((prev) => (prev === "NOTEBOOK_GROUNDING" ? "GENERATING_CHANNELS" : prev));
    }, 3000);

    try {
      const data = await apiFetch<ContentOutput & { id?: string; intelligenceCard?: ProductIntelligenceCard }>("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          sku,
          topicTitle: freeTopicTitle || selectedAngle?.title || (product ? `${product.name} - Conectividad B2B Enterprise` : `Solución ${sku}`),
          category: product ? product.category : "general",
          targetAudience: selectedAngle?.targetAudience || undefined,
          productUrl: product ? product.url : `https://ecomshop.es/productos/${sku.toLowerCase()}`,
          customAngle: selectedAngle?.intent || "ENGINEERING",
          editorialAngle: selectedAngle || undefined,
          workspaceId: user?.workspaceId,
          businessGoal: "ALL_OPPORTUNITIES",
          syncWhatsApp: true,
          syncLinkedIn: true,
        })
      });

      clearTimeout(t1);
      clearTimeout(t2);

      setCampaignStage("COMPLETED");
      setCampaignContent(data);
      setActiveContentId(data.id || null);
      if (data.intelligenceCard) {
        setIntelligenceCard(data.intelligenceCard);
      }
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setCampaignStage("ERROR");
      setCampaignErrorMessage(err instanceof Error ? err.message : "Error al generar el paquete de contenido multicanal");
    }
  };

  // Cambiar el estado del contenido ya persistido por /api/generate.
  // Evita crear un segundo ContentItem y obliga a pasar por el workflow de aprobación.
  const handleSaveToFirestore = async (status: "approved" | "published" = "approved") => {
    if (!campaignContent || !activeContentId) {
      setCampaignErrorMessage("No existe un contenido persistido que pueda aprobarse o publicarse.");
      return;
    }
    setIsSavingArticle(true);
    try {
      const result = await apiFetch<{ success: boolean; id: string; status: string }>("/api/contents", {
        method: "PATCH",
        body: JSON.stringify({ id: activeContentId, status })
      });
      setCampaignContent((prev) => prev ? { ...prev, status: result.status === "APPROVED" ? "APPROVED" : result.status === "PUBLISHED" ? "PUBLISHED" : prev.status } : prev);
      alert(`Campaña actualizada correctamente: ${status}.`);
    } catch (err: unknown) {
      alert(`Error al actualizar el estado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingArticle(false);
    }
  };

  // Lanzar desde el Radar B2B
  const handleLaunchRadarOpportunity = async (opp: ProductOpportunityRecord) => {
    setLaunchingRadarSku(opp.sku);
    try {
      // Desde el Radar no generamos a ciegas: primero cargamos el SKU y sus nuevas ideas editoriales.
      await handlePrepareCampaignSku(opp.sku, opp);
    } finally {
      setLaunchingRadarSku(null);
    }
  };

  // Generar Ficha Mejorada
  const handleEnhanceProductSheet = async () => {
    setLoadingEnhancedSheet(true);
    try {
      const res = await apiFetch<{ enhanced: EnhancedProductSheet }>("/api/catalog/enhance-sheet", {
        method: "POST",
        body: JSON.stringify({ sku: selectedSku, format: "html" })
      });
      if (res?.enhanced) {
        setEnhancedSheet(res.enhanced);
      }
    } catch (err: any) {
      alert(`Error al mejorar ficha: ${err.message}`);
    } finally {
      setLoadingEnhancedSheet(false);
    }
  };

  // Generar Imagen con Imagen 3
  const handleGenerateImage = async (
    mode: "ai" | "curated",
    overrides?: { prompt?: string; aspectRatio?: "16:9" | "1:1" | "4:3"; baseImage?: string | null }
  ) => {
    setGeneratingImage(true);
    setImageNotice(null);
    try {
      const res = await apiFetch<{
        imageUrl: string;
        assetId: string;
        sourceType?: string;
        warning?: string;
      }>("/api/images/generate", {
        method: "POST",
        body: JSON.stringify({
          prompt: overrides?.prompt ?? imagePrompt,
          aspectRatio: overrides?.aspectRatio ?? imageAspectRatio,
          baseImage: overrides?.baseImage ?? imageBase,
          mode,
          autoImprove: mode === "ai"
        })
      });

      if (res?.imageUrl) {
        const newImg: GeneratedImageItem = {
          id: res.assetId || `img-${Date.now()}`,
          url: res.imageUrl,
          prompt: overrides?.prompt ?? imagePrompt,
          createdAt: new Date().toLocaleTimeString("es-ES"),
          sourceType: res.sourceType || "imagen3",
          warning: res.warning
        };
        setGalleryImages((prev) => [newImg, ...prev]);
        setImageNotice("Imagen generada y persistida en GCS correctamente.");
      }
    } catch (err: any) {
      setImageNotice(`Error: ${err.message}`);
    } finally {
      setGeneratingImage(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <CorporateSignIn onSuccess={() => refreshUser()} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Barra Lateral Profesional de Navegación B2B */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(section) => setActiveSection(section)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onSyncCatalog={handleSyncWithEcomshop}
        isSyncingCatalog={isSyncingCatalog}
      />

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra Superior Móvil */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm text-white">EcomSpain Marketing OS</span>
          </div>
          <span className="font-mono text-xs text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
            {user.role}
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto space-y-6">
          {/* SECCIÓN 1: RESUMEN BENTO */}
          {activeSection === "resumen" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                        SISTEMA OPERATIVO // NOC EN LÍNEA
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      Plataforma Multicanal de Marketing B2B — EcomShop
                    </h1>
                    <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                      Generación y orquestación unificada para todo el catálogo oficial ({ECOMSHOP_FULL_CATALOG.length} dispositivos).
                      Activos auditados para Prensa/Blog GEO, LinkedIn, WhatsApp Broadcast y Fichas de Producto ecomshop.es con grounding en Vertex AI y Firebase.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveSection("workspace")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold font-mono transition shadow-lg"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      IR AL WORKSPACE
                    </button>
                  </div>
                </div>

                {/* Métricas Bento */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Catálogo Canónico</span>
                    <span className="text-xl font-bold text-white mt-1 block">{ECOMSHOP_FULL_CATALOG.length} SKUs</span>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Canales Simultáneos</span>
                    <span className="text-xl font-bold text-sky-400 mt-1 block">5 Canales</span>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Coste x Campaña</span>
                    <span className="text-xl font-bold text-emerald-400 mt-1 block">≈0,0045 €</span>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Rigor Técnico</span>
                    <span className="text-xl font-bold text-indigo-400 mt-1 block">100% Grounded</span>
                  </div>
                </div>
              </div>

              {/* Acceso Rápido a Secciones */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => setActiveSection("workspace")}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <Layers className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
                  </div>
                  <h3 className="font-bold text-white text-base">Campaign Workspace Multicanal</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Accede a los 43+ productos de networking, filtra por familia y genera contenidos con un clic.
                  </p>
                </div>

                <div 
                  onClick={() => setActiveSection("radar")}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
                  </div>
                  <h3 className="font-bold text-white text-base">Radar B2B de Oportunidades</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Detección automática de productos en stock con alta demanda comercial y brechas de contenido.
                  </p>
                </div>

                <div 
                  onClick={() => setActiveSection("enhancer")}
                  className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 p-6 rounded-2xl cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-sky-600/20 text-sky-400 group-hover:bg-sky-600 group-hover:text-white transition">
                      <Package className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition" />
                  </div>
                  <h3 className="font-bold text-white text-base">Optimizador de Fichas ecomshop.es</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Enriquece las fichas técnicas con argumentarios de venta B2B, esquemas FAQ y diferencias técnicas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: RADAR B2B DE OPORTUNIDADES */}
          {activeSection === "radar" && (
            <div className="space-y-6">
              <OpportunityRadarWidget
                opportunities={radarOpportunities}
                isLoading={loadingRadar}
                selectedBusinessGoal={radarGoal}
                onSelectBusinessGoal={(g) => {
                  setRadarGoal(g);
                  fetchRadar(g);
                }}
                onRegenerateRadar={() => fetchRadar(radarGoal)}
                isRegeneratingRadar={loadingRadar}
                onLaunchCampaign={handleLaunchRadarOpportunity}
                launchingSku={launchingRadarSku}
              />
            </div>
          )}

          {/* SECCIÓN 3: CAMPAIGN WORKSPACE (CORAZÓN DEL MARKETING MULTICANAL) */}
          {activeSection === "workspace" && (
            <div className="space-y-6">
              <CampaignWorkspace
                stage={campaignStage}
                opportunity={campaignOpportunity}
                content={campaignContent}
                intelligenceCard={intelligenceCard}
                errorMessage={campaignErrorMessage}
                selectedSku={selectedSku}
                products={catalogProducts}
                isLoadingIntelligence={loadingIntelligence}
                onSelectQuickSku={(sku) => {
                  void handlePrepareCampaignSku(sku);
                }}
                onLaunchWithSku={handleLaunchWithSku}
                onRetry={() => handleLaunchWithSku(selectedSku)}
                onReset={() => {
                  setCampaignStage("IDLE");
                  setCampaignContent(null);
                  setCampaignErrorMessage(null);
                }}
                onOpenImageStudio={(prompt) => {
                  setImagePrompt(prompt);
                  setActiveSection("images");
                }}
                onSaveToFirestore={handleSaveToFirestore}
                onApprove={() => handleSaveToFirestore("approved")}
                onPublishToStore={() => handleSaveToFirestore("published")}
                isSavingArticle={isSavingArticle}
                selectedAngle={selectedAngle}
                onSelectAngle={setSelectedAngle}
                freeTopicTitle={freeTopicTitle}
                onFreeTopicChange={setFreeTopicTitle}
              />
            </div>
          )}

          {/* SECCIÓN 4: CATÁLOGO Y MEJORADOR DE FICHAS DE PRODUCTO */}
          {activeSection === "enhancer" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Optimizador Técnico de Fichas ecomshop.es</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    SKU seleccionado actualmente: <strong className="text-indigo-400">{selectedSku}</strong> ({catalogProducts.length} productos en catálogo).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedSku}
                    onChange={(e) => {
                      setSelectedSku(e.target.value);
                      loadIntelligenceCard(e.target.value);
                    }}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  >
                    {catalogProducts.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleEnhanceProductSheet}
                    disabled={loadingEnhancedSheet}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {loadingEnhancedSheet ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Optimizar Ficha
                  </button>
                </div>
              </div>

              <ProductEnhancer
                sheet={enhancedSheet}
                isLoading={loadingEnhancedSheet}
                onRefresh={handleEnhanceProductSheet}
              />
            </div>
          )}

          {/* SECCIÓN 5: ESTUDIO DE IMÁGENES FOTORREALISTAS (IMAGEN 3) */}
          {activeSection === "images" && (
            <div className="space-y-6">
              <ImageStudioView
                images={galleryImages}
                selectedImageIds={selectedImageIds}
                onSelectImage={(id, sel) => {
                  setSelectedImageIds((prev) => (sel ? [...prev, id] : prev.filter((item) => item !== id)));
                }}
                onSelectAll={(all) => setSelectedImageIds(all ? galleryImages.map((i) => i.id) : [])}
                onClearAll={() => setSelectedImageIds([])}
                onRefreshDatabase={loadDatabaseAssets}
                loadingDatabaseAssets={loadingDatabaseAssets}
                onOpenLightbox={(img) => setSelectedImageForDetail(img)}
                onDeleteImage={async (id) => {
                  try {
                    await apiFetch(`/api/assets?id=${encodeURIComponent(id)}`, { method: "DELETE" });
                    setGalleryImages((prev) => prev.filter((i) => i.id !== id));
                    setImageNotice("Imagen eliminada definitivamente de Firestore y Cloud Storage.");
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    setImageNotice(`Error eliminando imagen: ${message}`);
                  }
                }}
                onApplyToCampaignBlog={(img) => {
                  setActiveSection("workspace");
                }}
                onUseAsBase={(url) => {
                  setImageBase(url);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onReuseInLinkedIn={(img) => {
                  setActiveSection("workspace");
                }}
                imagePrompt={imagePrompt}
                onChangePrompt={setImagePrompt}
                imageAspectRatio={imageAspectRatio}
                onChangeAspectRatio={setImageAspectRatio}
                imageBase={imageBase}
                onSetImageBase={setImageBase}
                generatingImage={generatingImage}
                onGenerateImage={handleGenerateImage}
                imageNotice={imageNotice}
                onOpenInterrogatorModal={() => setShowInterrogatorModal(true)}
                refiningPrompt={refiningPrompt}
                promptRefinement={promptRefinement}
                onRefinePrompt={async () => {
                  setRefiningPrompt(true);
                  try {
                    const res = await apiFetch<{ refinement: PromptRefinementData }>("/api/images/refine-prompt", {
                      method: "POST",
                      body: JSON.stringify({
                        prompt: imagePrompt,
                        aspectRatio: imageAspectRatio,
                        baseImage: imageBase,
                        selectedSku,
                        productContext: (() => {
                          const product = catalogProducts.find((item) => item.sku === selectedSku);
                          return product ? JSON.stringify(product) : undefined;
                        })(),
                      })
                    });
                    if (res?.refinement) setPromptRefinement(res.refinement);
                  } catch (e: any) {
                    alert(`Error refinando: ${e.message}`);
                  } finally {
                    setRefiningPrompt(false);
                  }
                }}
                onApplyRefinedPrompt={(ref) => {
                  setImagePrompt(ref);
                  setPromptRefinement(null);
                }}
                onApplyAndGenerateRefinedPrompt={(ref) => {
                  setImagePrompt(ref);
                  setPromptRefinement(null);
                  void handleGenerateImage("ai", {
                    prompt: ref,
                    aspectRatio: imageAspectRatio,
                    baseImage: imageBase,
                  });
                }}
                onDismissRefinement={() => setPromptRefinement(null)}
                presetTemplates={PRESET_IMAGE_PROMPTS}
                onVarySingleTemplate={(tmpl) => {
                  setImagePrompt(tmpl.prompt);
                  setImageAspectRatio(tmpl.aspectRatio);
                }}
                varyingTemplateId={null}
                isRegeneratingTemplates={false}
                onRegenerateAllTemplates={() => {}}
                onRestoreDefaultTemplates={() => {}}
                currentUserRole={user.role}
                onUseRealProductPhoto={(prod: StarProduct) => {
                  setImagePrompt(`Fotografía de estudio industrial del producto ${prod.name}, chasis metálico en alta definición, iluminación comercial 8k`);
                  if (prod.imageUrl) setImageBase(prod.imageUrl);
                }}
              />
            </div>
          )}

          {/* SECCIÓN 6: FINOPS GLOBAL */}
          {activeSection === "finops" && (
            <div className="space-y-6">
              <FinOpsDashboard />
            </div>
          )}
        </main>
      </div>

      {/* Modal Interrogador Creativo de Imagen */}
      <ImageInterrogatorModal
        isOpen={showInterrogatorModal}
        onClose={() => setShowInterrogatorModal(false)}
        currentBaseImage={imageBase}
        selectedSku={selectedSku}
        productContext={(() => {
          const product = catalogProducts.find((item) => item.sku === selectedSku);
          return product ? JSON.stringify(product) : undefined;
        })()}
        onApplyPrompt={(newPrompt, newRatio, baseImg) => {
          setImagePrompt(newPrompt);
          setImageAspectRatio(newRatio);
          if (baseImg !== undefined) {
            setImageBase(baseImg);
          }
          setShowInterrogatorModal(false);
        }}
      />

      {/* Modal de Detalle de Imagen */}
      {selectedImageForDetail && (
        <ImageDetailModal
          image={selectedImageForDetail}
          onClose={() => setSelectedImageForDetail(null)}
          onUseAsBase={(url) => {
            setImageBase(url);
            setSelectedImageForDetail(null);
            setActiveSection("images");
          }}
          onDelete={async (id) => {
            try {
              await apiFetch(`/api/assets?id=${encodeURIComponent(id)}`, { method: "DELETE" });
              setGalleryImages((prev) => prev.filter((i) => i.id !== id));
              setSelectedImageForDetail(null);
              setImageNotice("Imagen eliminada definitivamente de Firestore y Cloud Storage.");
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              setImageNotice(`Error eliminando imagen: ${message}`);
            }
          }}
          onInsertIntoArticle={async (img, mode) => {
            if (!activeContentId) {
              setImageNotice("No hay un artículo generado activo. Genera el contenido multicanal primero para poder insertar la imagen.");
              return;
            }
            try {
              await apiFetch("/api/images/actions", {
                method: "POST",
                body: JSON.stringify({
                  action: "insert_article",
                  assetId: img.id,
                  contentId: activeContentId,
                  mode
                })
              });
              setSelectedImageForDetail(null);
              setActiveSection("workspace");
              setImageNotice(`Imagen conectada al artículo como ${mode === "hero" ? "Hero" : "cuerpo"}.`);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              setImageNotice(`Error conectando la imagen al artículo: ${message}`);
            }
          }}
          onReuseInCampaign={async (img, channel) => {
            if (!activeContentId) {
              setImageNotice("No hay un contenido/campaña activo. Genera el contenido multicanal primero para poder reutilizar la imagen.");
              return;
            }
            try {
              await apiFetch("/api/images/actions", {
                method: "POST",
                body: JSON.stringify({
                  action: "reuse_campaign",
                  assetId: img.id,
                  contentId: activeContentId,
                  channel
                })
              });
              setSelectedImageForDetail(null);
              setActiveSection("workspace");
              setImageNotice(`Imagen conectada a ${channel === "linkedin" ? "LinkedIn" : "Newsletter Mailchimp"}.`);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              setImageNotice(`Error conectando la imagen a campaña: ${message}`);
            }
          }}
        />
      )}
    </div>
  );
}
