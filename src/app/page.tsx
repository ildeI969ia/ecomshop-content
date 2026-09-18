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
  Plus,
  Zap,
  Camera,
  Upload,
  Shield,
  LogOut,
  User as UserIcon,
  Maximize2
} from "lucide-react";
import { PRESET_TOPICS, ECOM_BRAND, STAR_PRODUCTS, CAMPAIGN_IDEAS, B2B_CTA_OPTIONS } from "@/lib/knowledge";
import { ContentOutput } from "@/lib/schema";
import { StrategicAngle } from "@/lib/gemini-agent";
import { PRESET_IMAGE_PROMPTS } from "@/lib/image-generator";
import { UsageRecord, calculateUsageCost } from "@/lib/finops";
import { NotebookState, OFFICIAL_NOTEBOOK } from "@/lib/notebooklm";
import { MultimodalAdvisor } from "@/components/MultimodalAdvisor";
import { CampaignRecommendation } from "@/lib/multimodal-advisor";
import { ImageInterrogatorModal } from "@/components/ImageInterrogatorModal";
import { ImageDetailModal, ImageDetailItem } from "@/components/ImageDetailModal";
import { ProductIntelligenceView } from "@/components/product-intelligence-view";
import { EvidenceAuditDrawer } from "@/components/evidence-audit-drawer";
import { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import { OpportunityRadarWidget } from "@/components/opportunity-radar-widget";
import { ProductOpportunityRecord } from "@/lib/services/opportunity-radar";
import { CorporateSignIn } from "@/components/auth/CorporateSignIn";
import { apiFetch, ApiError } from "@/lib/api-client";
import { CampaignWorkspace } from "@/components/campaign-workspace";
import { GenerationStage } from "@/components/campaign-stepper";
import { EditorialControlsBar } from "@/components/editorial-controls-bar";
import { EditorialControls } from "@/lib/types/editorial-controls";
import { SuggestedTopics } from "@/components/suggested-topics";
import { EditorialTopicCard } from "@/lib/types/editorial-topics";
import { compressImageToDataUrl } from "@/lib/image-compressor";
import { OutlineEditorModal } from "@/components/outline-editor-modal";
import { ArticleOutline } from "@/lib/types/article-outline";
import { PromptRefinementCard, PromptRefinementData } from "@/components/PromptRefinementCard";

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
  const [intelligenceCard, setIntelligenceCard] = useState<ProductIntelligenceCard | null>(null);
  const [inputMode, setInputMode] = useState<"ecomshop_url" | "prompt_libre">("ecomshop_url");
  const [customAngle, setCustomAngle] = useState<"ROI" | "PERFORMANCE" | "OPERATIONS" | "GENERAL">("ROI");
  const [opportunities, setOpportunities] = useState<ProductOpportunityRecord[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);

  // Historial de Contenidos y Estados (Persistente en Firestore)
  interface ArticleHistoryItem {
    id: string;
    title: string;
    category: string;
    status: "draft" | "reviewed" | "approved" | "published";
    createdAt: string;
    content: ContentOutput;
  }

  // Ciclo de vida y orquestación de Campaña
  const [campaignStage, setCampaignStage] = useState<GenerationStage>("IDLE");
  const [campaignOpportunity, setCampaignOpportunity] = useState<ProductOpportunityRecord | null>(null);
  const [campaignErrorMessage, setCampaignErrorMessage] = useState<string | null>(null);
  const [launchingSku, setLaunchingSku] = useState<string | null>(null);

  // Controles Editoriales Personalizables (Fase 08.6)
  const [editorialControls, setEditorialControls] = useState<EditorialControls>({
    targetSector: "ENTERPRISE_OFFICE",
    includePricing: false,
    emphasizeUplinkSwitching: true,
    technicalDeepDiveLevel: "HIGH_TECHNICAL",
    customInstructions: ""
  });

  // Estado para Junia Engine (Fase 09 Multi-Paso)
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [currentOutline, setCurrentOutline] = useState<ArticleOutline | null>(null);
  const [showOutlineModal, setShowOutlineModal] = useState(false);

  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    email: string;
    role: string;
    workspaceId: string;
    permissions?: string[];
  } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);

  // Comprobar sesión de usuario corporativo
  const checkSession = async () => {
    try {
      const data = await apiFetch<{ authenticated: boolean; user?: any }>("/api/auth/me");
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
        setShowSignInModal(false);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  useEffect(() => {
    async function loadOpportunities() {
      if (!currentUser) return;
      setLoadingOpportunities(true);
      try {
        const data = await apiFetch<{ opportunities?: ProductOpportunityRecord[] }>("/api/opportunities?limit=3");
        if (data.opportunities) {
          setOpportunities(data.opportunities);
        }
      } catch (err) {
        console.warn("Radar de oportunidades requiere autenticación o no devolvió datos:", err);
      } finally {
        setLoadingOpportunities(false);
      }
    }
    loadOpportunities();
  }, [currentUser]);

  const handleSelectOpportunity = (opp: ProductOpportunityRecord) => {
    setInputMode("ecomshop_url");
    setProductUrl(opp.url);
    setTopicTitle(opp.actionTitle);
    setCategory(opp.category as any);
    setTargetAudience(opp.targetSegment);
    setCustomAngle(opp.recommendedAngle);
    if (opp.suggestedBundle) {
      setCustomProductText(`${opp.model} + ${opp.suggestedBundle.accessorySku} (${opp.suggestedBundle.accessoryName})`);
    }
    if (opp.productBrainProfile?.buyerPersonas?.[0]) {
      setCustomNotes(`Enfoque Estratégico Product Brain:\n- Buyer Persona: ${opp.productBrainProfile.buyerPersonas[0].name}\n- Pitch: ${opp.productBrainProfile.buyerPersonas[0].pitchIn30Seconds}\n- Bundle: ${opp.suggestedBundle.rationale}`);
    }
  };

  const handleLaunchCampaign = async (opp: ProductOpportunityRecord) => {
    // 1. Sincronizar formulario lateral
    handleSelectOpportunity(opp);

    // 2. Comprobar sesión de usuario corporativo
    if (!currentUser) {
      setShowSignInModal(true);
      return;
    }

    setCampaignOpportunity(opp);
    setCampaignErrorMessage(null);
    setLaunchingSku(opp.sku);
    setCampaignStage("EXTRACTING");

    try {
      // Simular progresión reactiva de etapas mientras el backend procesa
      const t1 = setTimeout(() => {
        setCampaignStage((prev) => (prev === "EXTRACTING" ? "NOTEBOOK_GROUNDING" : prev));
      }, 1200);

      const t2 = setTimeout(() => {
        setCampaignStage((prev) => (prev === "NOTEBOOK_GROUNDING" ? "GENERATING_CHANNELS" : prev));
      }, 2600);

      const t3 = setTimeout(() => {
        setCampaignStage((prev) => (prev === "GENERATING_CHANNELS" ? "FACT_CHECKING" : prev));
      }, 5200);

      const customEquipment = opp.suggestedBundle
        ? `${opp.model} + ${opp.suggestedBundle.accessorySku} (${opp.suggestedBundle.accessoryName})`
        : opp.model;

      const notes = opp.productBrainProfile?.buyerPersonas?.[0]
        ? `Enfoque Estratégico Product Brain:\n- Buyer Persona: ${opp.productBrainProfile.buyerPersonas[0].name}\n- Pitch: ${opp.productBrainProfile.buyerPersonas[0].pitchIn30Seconds}\n- Bundle: ${opp.suggestedBundle?.rationale || ""}`
        : `Lanzamiento Automatizado para SKU ${opp.sku}`;

      const data = await apiFetch<ContentOutput & { intelligenceCard?: ProductIntelligenceCard }>("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          topicTitle: opp.actionTitle,
          category: opp.category,
          targetAudience: opp.targetSegment,
          productUrl: opp.url,
          customNotes: notes,
          promotedProductIds: [opp.sku.toLowerCase()],
          customEquipmentName: customEquipment,
          customEquipmentUrl: opp.url,
          ctaObjective: "Solicitar Presupuesto y Asesoramiento",
          ctaButtonText: "Consultar Condiciones B2B",
          ctaUrl: opp.url,
          syncWhatsApp: true,
          syncLinkedIn: true,
          customAngle: opp.recommendedAngle,
          editorialControls,
          apiKey: geminiApiKey || undefined
        })
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      setContent(data);
      if (data.intelligenceCard) {
        setIntelligenceCard(data.intelligenceCard);
      }
      setCampaignStage("COMPLETED");

      // Registrar métrica en FinOps
      addFinopsRecord({
        action: "gemini_generation",
        details: `Campaña Autopilot (${opp.sku}): ${data.topicTitle.substring(0, 30)}...`,
        tokensInput: 1450,
        tokensOutput: 2600
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
      persistArticleToDatabase(historyEntry);
    } catch (err: any) {
      console.error("Error al lanzar campaña:", err);
      setCampaignStage("ERROR");
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setCampaignErrorMessage("Sesión no autorizada o expirada. Por favor inicie sesión corporativa.");
        setShowSignInModal(true);
      } else {
        setCampaignErrorMessage(err?.message || "Error al procesar la campaña multicanal.");
      }
    } finally {
      setLaunchingSku(null);
    }
  };

  // Vista Principal del Panel de Administración (5 Módulos)
  const [mainView, setMainView] = useState<"generator" | "advisor" | "history" | "image_studio" | "finops">("generator");

  // Historial de Contenidos y Estados
  const [historyItems, setHistoryItems] = useState<ArticleHistoryItem[]>([]);
  const [searchHistory, setSearchHistory] = useState("");

  // Estado de sincronización y carga con Firestore
  const [loadingDatabaseContents, setLoadingDatabaseContents] = useState(false);
  const [loadingDatabaseAssets, setLoadingDatabaseAssets] = useState(false);
  const [isSyncingWithDatabase, setIsSyncingWithDatabase] = useState(false);

  // Persistir un artículo en Firestore inmediatamente tras su generación
  async function persistArticleToDatabase(entry: ArticleHistoryItem) {
    try {
      await apiFetch("/api/contents", {
        method: "POST",
        body: JSON.stringify({
          id: entry.id,
          title: entry.title,
          category: entry.category,
          status: entry.status,
          content: entry.content,
          createdAt: new Date().toISOString()
        })
      });
    } catch (err) {
      console.warn("[Database] No se pudo guardar artículo en Firestore:", err);
    }
  }

  // Cargar todos los artículos compartidos desde Firestore
  const loadDatabaseContents = async () => {
    setLoadingDatabaseContents(true);
    try {
      const res = await apiFetch<{ contents?: ArticleHistoryItem[] }>("/api/contents");
      if (res?.contents && Array.isArray(res.contents)) {
        setHistoryItems((prev) => {
          const existingIds = new Set(res.contents!.map((c) => c.id));
          const existingSlugs = new Set(res.contents!.map((c) => c.content?.blog?.slug).filter(Boolean));
          const merged = [...res.contents!];
          for (const localItem of prev) {
            const rawId = localItem.id;
            const localSlug = localItem.content?.blog?.slug;
            if (
              !existingIds.has(rawId) &&
              !existingIds.has(`content-${rawId}`) &&
              (!localSlug || !existingSlugs.has(localSlug))
            ) {
              merged.push(localItem);
              existingIds.add(rawId);
            }
          }
          try {
            localStorage.setItem("ecomshop_article_history", JSON.stringify(merged.slice(0, 50)));
          } catch {}
          return merged;
        });
      }
    } catch (err) {
      console.warn("[Database] No se pudo cargar contenidos de Firestore:", err);
    } finally {
      setLoadingDatabaseContents(false);
    }
  };

  // Cargar todas las imágenes compartidas desde Firestore
  const loadDatabaseAssets = async () => {
    setLoadingDatabaseAssets(true);
    try {
      const res = await apiFetch<{ assets?: Array<any> }>("/api/assets");
      if (res?.assets && Array.isArray(res.assets)) {
        const dbImages = res.assets
          .filter((a) => a.type === "image" || a.mimeType?.startsWith("image/"))
          .map((a) => ({
            id: a.id,
            url: a.publicUrl || a.storagePath,
            prompt: a.filename ? a.filename.replace(/^AI:\s*/, "") : "Imagen generada",
            createdAt: a.createdAt ? new Date(a.createdAt).toLocaleTimeString("es-ES") : new Date().toLocaleTimeString("es-ES"),
            sourceType: a.aiProvenance?.model || "imagen3"
          }))
          .filter((a) => Boolean(a.url));

        setGeneratedImagesList((prev) => {
          const existingUrls = new Set(dbImages.map((i) => i.url));
          const merged: Array<{ id: string; url: string; prompt: string; createdAt: string; sourceType?: string; warning?: string }> = [...dbImages];
          for (const localImg of prev) {
            if (localImg.url && !existingUrls.has(localImg.url)) {
              merged.push(localImg);
              existingUrls.add(localImg.url);
            }
          }
          safeSaveGeneratedImages(merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn("[Database] No se pudo cargar assets de Firestore:", err);
    } finally {
      setLoadingDatabaseAssets(false);
    }
  };

  // Sincronizar elementos previos de localStorage hacia Firestore
  const syncLocalToDatabase = async () => {
    try {
      const savedHist = localStorage.getItem("ecomshop_article_history");
      const savedImgs = localStorage.getItem("ecomshop_generated_images");
      const savedFinops = localStorage.getItem("ecomshop_finops_records");

      const historyList = savedHist ? JSON.parse(savedHist) : [];
      const imagesList = savedImgs ? JSON.parse(savedImgs) : [];
      const finopsList = savedFinops ? JSON.parse(savedFinops) : [];

      if (historyList.length > 0 || imagesList.length > 0 || finopsList.length > 0) {
        setIsSyncingWithDatabase(true);
        await apiFetch("/api/sync", {
          method: "POST",
          body: JSON.stringify({
            historyItems: historyList,
            generatedImages: imagesList,
            finopsRecords: finopsList
          })
        });
      }
    } catch (err) {
      console.warn("[Database] Error al sincronizar almacenamiento local con Firestore:", err);
    } finally {
      setIsSyncingWithDatabase(false);
      await Promise.all([loadDatabaseContents(), loadDatabaseAssets()]);
    }
  };

  // Estudio de Imágenes (Imagen 3 & Multimodal)
  const [imagePrompt, setImagePrompt] = useState(PRESET_IMAGE_PROMPTS[0].prompt);
  const [imageAspectRatio, setImageAspectRatio] = useState<"16:9" | "1:1" | "4:3">("16:9");
  const [imageBase, setImageBase] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [showInterrogatorModal, setShowInterrogatorModal] = useState(false);
  const [generatedImagesList, setGeneratedImagesList] = useState<
    { id: string; url: string; prompt: string; createdAt: string; sourceType?: string; warning?: string }[]
  >([]);
  const [selectedImageForDetail, setSelectedImageForDetail] = useState<ImageDetailItem | null>(null);
  const [promptRefinement, setPromptRefinement] = useState<PromptRefinementData | null>(null);
  const [refiningPrompt, setRefiningPrompt] = useState(false);

  const [activeTab, setActiveTab] = useState<"blog" | "mailchimp" | "whatsapp" | "linkedin">("blog");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Monitor FinOps de Costes
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);

  // Costes Reales Google Cloud (desde Billing API)
  const [cloudCosts, setCloudCosts] = useState<{
    services: Array<{ service: string; displayName: string; costEur: number; currency: string }>;
    totalEur: number;
    source: "google_cloud_billing_api" | "google_cloud_monitoring" | "fallback_estimation";
    billingAccountId: string | null;
    period: { start: string; end: string };
    fetchedAt: string;
    cached?: boolean;
    error?: string;
  } | null>(null);
  const [loadingCloudCosts, setLoadingCloudCosts] = useState(false);

  const fetchCloudCosts = async (forceRefresh = false) => {
    if (!currentUser) return;
    setLoadingCloudCosts(true);
    try {
      const url = `/api/finops/cloud-costs${forceRefresh ? "?refresh=1" : ""}`;
      const res = await apiFetch<typeof cloudCosts>(url);
      setCloudCosts(res);
    } catch (err) {
      console.warn("[FinOps] No se pudo cargar costes reales de GCP:", err);
    } finally {
      setLoadingCloudCosts(false);
    }
  };

  /**
   * Guarda de forma defensiva la lista de imágenes en localStorage sin saturar la cuota de 5MB
   * Evita el temido QuotaExceededError que crashea el árbol de componentes de React.
   */
  const safeSaveGeneratedImages = (
    images: Array<{ id: string; url: string; prompt: string; createdAt: string; sourceType?: string; warning?: string }>
  ) => {
    try {
      // Filtrar Data URLs gigantes (> 50KB) al persistir para proteger el storage del navegador
      // La imagen completa sigue disponible en memoria en React durante toda la sesión
      const lightweight = images.slice(0, 20).map((img) => {
        if (img.url && img.url.startsWith("data:") && img.url.length > 50000) {
          return { ...img, url: "" };
        }
        return img;
      }).filter((img) => Boolean(img.url));

      localStorage.setItem("ecomshop_generated_images", JSON.stringify(lightweight));
    } catch (err) {
      console.warn("[Storage] Quota excedida en localStorage, liberando caché de imágenes:", err);
      try {
        localStorage.removeItem("ecomshop_generated_images");
      } catch {}
    }
  };

  useEffect(() => {
    // Cargar historial y finops de localStorage con control total de excepciones
    try {
      const savedHist = localStorage.getItem("ecomshop_article_history");
      if (savedHist) setHistoryItems(JSON.parse(savedHist));
    } catch {}

    try {
      const savedFinops = localStorage.getItem("ecomshop_finops_records");
      if (savedFinops) setUsageRecords(JSON.parse(savedFinops));
    } catch {}

    try {
      const savedImgs = localStorage.getItem("ecomshop_generated_images");
      if (savedImgs) {
        const parsed = JSON.parse(savedImgs);
        if (Array.isArray(parsed)) {
          setGeneratedImagesList(parsed);
        }
      }
    } catch (err) {
      console.warn("[Storage] Error parseando imágenes guardadas, limpiando:", err);
      try { localStorage.removeItem("ecomshop_generated_images"); } catch {}
    }
  }, []);

  // Cargar costes GCP cuando el usuario abre el panel FinOps
  useEffect(() => {
    if (mainView === "finops" && currentUser && !cloudCosts && !loadingCloudCosts) {
      fetchCloudCosts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView, currentUser]);

  // Cuando el usuario inicia sesión o se detecta la sesión corporativa, sincronizar y cargar BBDD
  useEffect(() => {
    if (currentUser) {
      syncLocalToDatabase();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Sincronizar contenidos cuando se abre la vista Historial
  useEffect(() => {
    if (mainView === "history" && currentUser) {
      loadDatabaseContents();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView, currentUser]);

  // Sincronizar imágenes cuando se abre el Estudio de Imágenes
  useEffect(() => {
    if (mainView === "image_studio" && currentUser) {
      loadDatabaseAssets();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView, currentUser]);

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

  // Estado de NotebookLM (ID: 6ae5b7bb-ab27-4541-80cc-6127730fd01b)
  const [notebookState, setNotebookState] = useState<NotebookState>(OFFICIAL_NOTEBOOK);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [newSourceTitle, setNewSourceTitle] = useState("");
  const [newSourceDesc, setNewSourceDesc] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceType, setNewSourceType] = useState<"pdf" | "url" | "note" | "datasheet">("datasheet");
  const [addingSource, setAddingSource] = useState(false);

  const fetchNotebookStatus = async () => {
    try {
      const res = await fetch("/api/notebooklm/status");
      if (res.ok) {
        const data = await res.json();
        setNotebookState(data);
      }
    } catch {}
  };

  const handleAddNotebookSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceTitle || !newSourceDesc) return;
    setAddingSource(true);
    try {
      const res = await fetch("/api/notebooklm/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSourceTitle,
          description: newSourceDesc,
          url: newSourceUrl,
          type: newSourceType
        })
      });
      if (res.ok) {
        const data = await res.json();
        setNotebookState(data);
        setNewSourceTitle("");
        setNewSourceDesc("");
        setNewSourceUrl("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingSource(false);
    }
  };

  // Cuestionar al NotebookLM & Sugerencia de Nuevas Fuentes
  const [notebookTab, setNotebookTab] = useState<"sources" | "ask">("sources");
  const [notebookQuestion, setNotebookQuestion] = useState("");
  const [suggestNewSources, setSuggestNewSources] = useState(true);
  const [askingNotebook, setAskingNotebook] = useState(false);
  const [notebookAnswer, setNotebookAnswer] = useState<{
    answer: string;
    citedSources: { id: string; title: string }[];
    suggestedNewSources: { title: string; type: string; description: string; url?: string }[];
    transferableTopic?: { title: string; category: string; recommendedProducts?: string[] } | null;
  } | null>(null);

  const handleAskNotebook = async (customQ?: string) => {
    const q = customQ || notebookQuestion;
    if (!q.trim()) return;
    setAskingNotebook(true);
    setNotebookAnswer(null);

    try {
      const res = await fetch("/api/notebooklm/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          suggestNewSources,
          apiKey: geminiApiKey || undefined
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setNotebookAnswer(data.data);
        addFinopsRecord({
          action: "notebooklm_query",
          details: `Consulta NotebookLM: "${q.substring(0, 45)}..."`,
          tokensInput: data.data.tokensInput,
          tokensOutput: data.data.tokensOutput
        });
      }
    } catch (err) {
      console.error("Error consultando NotebookLM:", err);
    } finally {
      setAskingNotebook(false);
    }
  };

  const handleTransferNotebookTopic = (topic: { title: string; category: string; recommendedProducts?: string[] }) => {
    setTopicTitle(topic.title);
    setCategory(topic.category as any);
    if (topic.recommendedProducts && topic.recommendedProducts.length > 0) {
      setCustomProductText(topic.recommendedProducts.join(", "));
    }
    setCustomNotes(`Idea fundamentada en Google NotebookLM:\n${notebookAnswer?.answer?.substring(0, 200)}...`);
    setShowNotebookModal(false);
    setMainView("generator");
  };

  const handleAddSuggestedSource = async (src: { title: string; type: string; description: string; url?: string }) => {
    setAddingSource(true);
    try {
      const res = await fetch("/api/notebooklm/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: src.title,
          description: src.description,
          url: src.url || "https://www.ecomshop.es",
          type: src.type || "datasheet"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setNotebookState(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingSource(false);
    }
  };

  // Configuración Gemini API & Agente Estratégico
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [keyStatus, setKeyStatus] = useState<"unchecked" | "valid" | "invalid">("unchecked");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);
  
  const [strategicAngles, setStrategicAngles] = useState<StrategicAngle[]>([]);
  const [selectedAngleId, setSelectedAngleId] = useState<string | null>(null);
  const [loadingAngles, setLoadingAngles] = useState(false);

  const [activeBackendLabel, setActiveBackendLabel] = useState<string>("Gemini Conectado");
  const [connectedModel, setConnectedModel] = useState<string>("gemini-2.5-flash");

  useEffect(() => {
    const saved = localStorage.getItem("ecomshop_gemini_key");
    if (saved) {
      setGeminiApiKey(saved);
      checkKeyValidity(saved);
    } else {
      // Probar si el servidor ya tiene conexión directa (Vertex AI en Cloud Run o local)
      checkKeyValidity("");
    }
  }, []);

  const [keyErrorMessage, setKeyErrorMessage] = useState<string | null>(null);

  const checkKeyValidity = async (keyToTest: string) => {
    setValidatingKey(true);
    setKeyErrorMessage(null);
    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToTest || undefined })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setKeyStatus("valid");
        const detectedModel = data.model || "gemini-2.5-flash";
        setConnectedModel(detectedModel);
        if (data.backend) {
          setActiveBackendLabel(data.backend.includes("Vertex") ? "Vertex AI Conectado" : `${detectedModel} Activo`);
        }
        if (keyToTest) {
          localStorage.setItem("ecomshop_gemini_key", keyToTest);
        }
      } else {
        if (keyToTest) {
          setKeyStatus("invalid");
          setKeyErrorMessage(data.message || "Clave inválida o sin permisos en Google Cloud");
        } else {
          setKeyStatus("unchecked");
        }
      }
    } catch (err: any) {
      if (keyToTest) {
        setKeyStatus("invalid");
        setKeyErrorMessage(err?.message || "Error de conexión al verificar la clave");
      } else {
        setKeyStatus("unchecked");
      }
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

  const handleApplyMultimodalRecommendation = (rec: CampaignRecommendation) => {
    setTopicTitle(rec.title);
    setCategory(rec.category);
    setCustomNotes(`Recomendación del Asesor Multimodal [${rec.suggestedAngle}]:\n- Contexto Técnico Detectado: ${rec.detectedContext}\n- Gancho Inicial: ${rec.hookText}\n- Por qué funciona: ${rec.whyThisWorks}`);
    setCustomCtaText(rec.recommendedCtaText);

    // Si detectó productos
    if (rec.recommendedProducts && rec.recommendedProducts.length > 0) {
      setCustomProductText(rec.recommendedProducts.join(", "));
    }

    // Cambiar a la vista del generador multicanal
    setMainView("generator");
  };

  const handleSelectEditorialTopic = async (topic: EditorialTopicCard) => {
    setSelectedPresetId(topic.id);
    setTopicTitle(topic.title);
    setTargetAudience(topic.targetAudience);

    // Map category
    const catMap: Record<string, "wifi" | "switches" | "fibra" | "engenius" | "general"> = {
      WIFI7: "engenius",
      POE_SWITCHING: "switches",
      FIBRA_SFP: "fibra",
      ROUTERS_5G: "engenius",
      ALL: "engenius"
    };
    const cat = catMap[topic.category] || "engenius";
    setCategory(cat);

    // Auto-link primary SKU URL
    if (topic.suggestedSKUs && topic.suggestedSKUs.length > 0) {
      const primarySku = topic.suggestedSKUs[0];
      const starProd = STAR_PRODUCTS.find((p) => p.model.toLowerCase() === primarySku.toLowerCase());
      if (starProd) {
        setProductUrl(starProd.url);
        setSelectedProducts([starProd.id]);
      } else {
        setProductUrl(`${ECOM_BRAND.storeUrl}?s=${encodeURIComponent(primarySku)}`);
      }
    } else {
      setProductUrl(ECOM_BRAND.storeUrl);
    }

    setCustomNotes(`Línea Editorial [${topic.badge}]:\n- Argumento Clave: ${topic.coreArgument}\n- SKUs: ${topic.suggestedSKUs?.join(", ") || "N/A"}`);
    setSelectedAngleId(null);

    // Actualizar de inmediato los 3 ángulos derivados de ese tema específico
    setLoadingAngles(true);
    try {
      const res = await fetch("/api/strategy/angles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicTitle: topic.title,
          category: cat,
          apiKey: geminiApiKey || undefined
        })
      });
      const data = await res.json();
      if (data.angles) {
        setStrategicAngles(data.angles);
      }
    } catch (err) {
      console.error("Error auto-fetching angles for selected topic:", err);
    } finally {
      setLoadingAngles(false);
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
      const data = await apiFetch<ContentOutput & { intelligenceCard?: ProductIntelligenceCard }>("/api/generate", {
        method: "POST",
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
          customAngle,
          editorialControls,
          apiKey: geminiApiKey || undefined
        })
      });

      setContent(data);
      if (data.intelligenceCard) {
        setIntelligenceCard(data.intelligenceCard);
      }
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
      persistArticleToDatabase(historyEntry);
    } catch (err: any) {
      console.error(err);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setShowSignInModal(true);
      } else {
        alert(`Hubo un error al generar el contenido: ${err?.message || err}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Apertura y orquestación de The Junia Engine (Fase 09)
  const handleOpenJuniaEngine = async () => {
    setIsGeneratingOutline(true);
    try {
      const res = await apiFetch<{ outline: ArticleOutline }>("/api/editorial/outline", {
        method: "POST",
        body: JSON.stringify({
          topicOrProduct: topicTitle || "Solución de Conectividad y Networking B2B",
          targetAudience,
          vertical: editorialControls.targetSector,
          category,
          apiKey: geminiApiKey || undefined
        })
      });

      if (res?.outline) {
        setCurrentOutline(res.outline);
        setShowOutlineModal(true);
      } else {
        throw new Error("No se pudo construir el outline técnico");
      }
    } catch (err: any) {
      console.error("[JuniaEngine] Error al generar outline:", err);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setShowSignInModal(true);
      } else {
        alert(`Error al generar el outline con Junia Engine: ${err?.message || err}`);
      }
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleJuniaArticleGenerated = (generatedContent: ContentOutput) => {
    setContent(generatedContent);
    setActiveTab("blog");

    addFinopsRecord({
      action: "gemini_generation",
      details: `The Junia Engine (Deep Section Writer): ${generatedContent.topicTitle.substring(0, 35)}...`,
      tokensInput: 3200,
      tokensOutput: 4800
    });

    const historyEntry: ArticleHistoryItem = {
      id: `junia-${Date.now()}`,
      title: generatedContent.topicTitle,
      category,
      status: "draft",
      createdAt: new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }),
      content: generatedContent
    };

    setHistoryItems((prev) => {
      const updated = [historyEntry, ...prev];
      try {
        localStorage.setItem("ecomshop_article_history", JSON.stringify(updated.slice(0, 50)));
      } catch {}
      return updated;
    });

    persistArticleToDatabase(historyEntry);
  };

  const handleRefinePrompt = async () => {
    if (!imagePrompt.trim()) return;
    setRefiningPrompt(true);
    try {
      const res = await fetch("/api/images/refine-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          baseImage: imageBase || undefined,
          aspectRatio: imageAspectRatio,
          apiKey: geminiApiKey || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.improvedPrompt) {
        setPromptRefinement(data);
      } else {
        alert("No se pudo cualificar el prompt: " + (data.error || "Error al analizar"));
      }
    } catch (err: any) {
      console.error("[RefinePrompt] Error:", err);
      alert("Error de conexión al cualificar el prompt: " + (err?.message || err));
    } finally {
      setRefiningPrompt(false);
    }
  };

  const handleApplyRefinedPrompt = (newPrompt: string, newRatio?: "16:9" | "1:1" | "4:3") => {
    setImagePrompt(newPrompt);
    if (newRatio) setImageAspectRatio(newRatio);
    setPromptRefinement(null);
  };

  const handleApplyAndGenerateRefinedPrompt = async (newPrompt: string, newRatio?: "16:9" | "1:1" | "4:3") => {
    setImagePrompt(newPrompt);
    if (newRatio) setImageAspectRatio(newRatio);
    setPromptRefinement(null);
    handleGenerateImage("ai", newPrompt, newRatio);
  };

  const handleGenerateImage = async (
    mode: "ai" | "curated" = "ai",
    customPrompt?: string,
    customRatio?: "16:9" | "1:1" | "4:3"
  ) => {
    const promptToUse = customPrompt || imagePrompt;
    const ratioToUse = customRatio || imageAspectRatio;
    if (!promptToUse) return;
    setGeneratingImage(true);
    setImageNotice(null);
    try {
      const data = await apiFetch<{
        imageUrl: string;
        sourceType?: string;
        warning?: string;
        refinedPrompt?: string;
      }>("/api/images/generate", {
        method: "POST",
        body: JSON.stringify({
          prompt: promptToUse,
          aspectRatio: ratioToUse,
          baseImage: imageBase || undefined,
          apiKey: geminiApiKey || undefined,
          mode
        })
      });
      if (data.imageUrl) {
        if (data.warning) {
          setImageNotice(data.warning);
        }
        const newImg = {
          id: (data as any).assetId || Math.random().toString(36).substring(2, 9),
          url: data.imageUrl,
          prompt: data.refinedPrompt || imagePrompt,
          createdAt: new Date().toLocaleTimeString("es-ES"),
          sourceType: data.sourceType,
          warning: data.warning
        };
        setGeneratedImagesList((prev) => {
          const updated = [newImg, ...prev];
          safeSaveGeneratedImages(updated);
          return updated;
        });
        loadDatabaseAssets();

        // Registrar coste en FinOps (0,00 € si es stock gratuito, o tarifa reducida ~0.0038 € si es IA Flash)
        if (data.sourceType !== "curated_varied") {
          addFinopsRecord({
            action: "imagen_image",
            details: `${imageBase ? "Multimodal Variación" : "Gemini Flash Image"}: ${imagePrompt.substring(0, 30)}...`,
            imageCount: 1
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setShowSignInModal(true);
      } else {
        alert("Error al generar la imagen: " + (err?.message || err));
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleUseRealProductPhoto = (product: (typeof STAR_PRODUCTS)[number]) => {
    const newImg = {
      id: "real-" + product.id + "-" + Date.now(),
      url: product.imageUrl,
      prompt: `${product.name} (${product.model}) — Fotografía Oficial de Fabricante / NotebookLM`,
      createdAt: new Date().toLocaleTimeString("es-ES"),
      sourceType: "official_product" as any,
      warning: undefined
    };
    setGeneratedImagesList((prev) => {
      const updated = [newImg, ...prev];
      safeSaveGeneratedImages(updated);
      return updated;
    });
    setImageNotice(`Fotografía oficial de ${product.name} cargada directamente desde el catálogo / NotebookLM. Producto 100% real sin alucinaciones (Coste: 0,00 €).`);
  };

  const updateArticleStatus = async (id: string, newStatus: ArticleHistoryItem["status"]) => {
    setHistoryItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item));
      try { localStorage.setItem("ecomshop_article_history", JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      await apiFetch("/api/contents", {
        method: "PATCH",
        body: JSON.stringify({ id, status: newStatus })
      });
    } catch (err) {
      console.warn("[Database] Error al actualizar estado en Firestore:", err);
    }
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

        {/* 5 Módulos de Navegación del Panel */}
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
            onClick={() => setMainView("advisor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mainView === "advisor"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Brainstorming Multimodal
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[9px] font-bold">
              IA Vision & Audio
            </span>
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
          {/* NotebookLM Status Badge */}
          <button
            onClick={() => setShowNotebookModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium transition shadow-2xs bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100/70"
            title="NotebookLM EcomShop Knowledge Base"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-semibold text-xs">
              NotebookLM: <span className="text-purple-700 font-bold">{notebookState.sources.length} Fuentes</span>
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {/* Corporate Session Badge */}
          {currentUser ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-800">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <div className="flex flex-col text-left">
                <span className="font-semibold text-[11px] leading-tight flex items-center gap-1">
                  {currentUser.email}
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                    {currentUser.role}
                  </span>
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar Sesión Corporativa"
                className="ml-1 p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSignInModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100/80 font-semibold text-xs shadow-2xs transition"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Iniciar Sesión @ecomspain.com</span>
            </button>
          )}

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
                ? activeBackendLabel
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
      {mainView === "advisor" && (
        <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <MultimodalAdvisor
            apiKey={geminiApiKey}
            onApplyRecommendation={handleApplyMultimodalRecommendation}
            onRecordFinops={addFinopsRecord}
          />
        </div>
      )}

      {mainView === "generator" && (
        <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {/* Radar de Oportunidades Diarias (Fase 08 Marketing Autopilot) */}
          <OpportunityRadarWidget
            opportunities={opportunities}
            isLoading={loadingOpportunities}
            onSelectOpportunity={handleSelectOpportunity}
            onLaunchCampaign={handleLaunchCampaign}
            launchingSku={launchingSku}
          />

          {/* Barra de Controles Editoriales Personalizables (Fase 08.6) */}
          <EditorialControlsBar
            controls={editorialControls}
            onChange={setEditorialControls}
          />

          {/* Campaign Workspace Interactivo (Pipeline Stepper + Contenido Multicanal Grounded) */}
          {campaignStage !== "IDLE" && (
            <CampaignWorkspace
              stage={campaignStage}
              opportunity={campaignOpportunity}
              content={content}
              intelligenceCard={intelligenceCard}
              errorMessage={campaignErrorMessage}
              onRetry={() => campaignOpportunity && handleLaunchCampaign(campaignOpportunity)}
              onReset={() => {
                setCampaignStage("IDLE");
                setCampaignOpportunity(null);
                setCampaignErrorMessage(null);
              }}
              onOpenImageStudio={(prompt) => {
                setImagePrompt(prompt);
                setMainView("image_studio");
              }}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Configuración del Tema */}
            <div className="lg:col-span-4 flex flex-col gap-5">
            <SuggestedTopics
              selectedTopicId={selectedPresetId}
              onSelectTopic={handleSelectEditorialTopic}
              geminiApiKey={geminiApiKey || undefined}
            />

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
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Configuración</span>
                  <h2 className="font-editorial text-base font-bold text-slate-900">Entrada de Campaña</h2>
                </div>
                {/* Selector de Modo */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setInputMode("ecomshop_url")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                      inputMode === "ecomshop_url"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    EcomShop URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("prompt_libre")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                      inputMode === "prompt_libre"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Prompt Libre
                  </button>
                </div>
              </div>

              {inputMode === "ecomshop_url" && (
                <div className="space-y-3 bg-blue-50/50 p-3.5 rounded-lg border border-blue-100">
                  <div>
                    <label className="text-xs font-bold text-blue-950 block mb-1">
                      URL de Producto en EcomShop.es (Extracción Automática):
                    </label>
                    <input
                      type="text"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      placeholder="https://www.ecomshop.es/..."
                      className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>

                  {/* Ejemplos rápidos */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-medium">Ejemplos rápidos:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProductUrl("https://www.ecomshop.es/engenius-ecw536");
                        setTopicTitle("EnGenius ECW536 Cloud WiFi 7 AP");
                        setCategory("engenius");
                      }}
                      className="text-[10px] bg-white border border-slate-200 hover:border-blue-300 text-slate-700 px-2 py-0.5 rounded shadow-2xs"
                    >
                      ⚡ ECW536 WiFi 7
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductUrl("https://www.ecomshop.es/engenius-ecs1528fp");
                        setTopicTitle("Switch EnGenius ECS1528FP Cloud PoE+");
                        setCategory("switches");
                      }}
                      className="text-[10px] bg-white border border-slate-200 hover:border-blue-300 text-slate-700 px-2 py-0.5 rounded shadow-2xs"
                    >
                      ⚡ ECS1528FP PoE+
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductUrl("https://www.ecomshop.es/engenius-esg510");
                        setTopicTitle("Gateway EnGenius ESG510 Cloud Security 2.5G");
                        setCategory("engenius");
                      }}
                      className="text-[10px] bg-white border border-slate-200 hover:border-blue-300 text-slate-700 px-2 py-0.5 rounded shadow-2xs"
                    >
                      ⚡ Gateway ESG510
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Público Objetivo</label>
                      <select
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800"
                      >
                        <option value="Instaladores de telecomunicaciones e integradores IT">Instaladores & Integradores IT</option>
                        <option value="Directores de TIC y responsables de sistemas">Directores de Sistemas / CIO</option>
                        <option value="Jefes de compras y directores de operaciones">Jefes de Compras / TCO</option>
                        <option value="Sector Hospitality y Hoteles">Sector Hospitality / Hoteles</option>
                        <option value="Operadores locales y WISP">Operadores WISP / Telco</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Ángulo Estratégico</label>
                      <select
                        value={customAngle}
                        onChange={(e) => setCustomAngle(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800"
                      >
                        <option value="ROI">ROI & Cero Licencias</option>
                        <option value="PERFORMANCE">Rendimiento Técnico & 10G</option>
                        <option value="OPERATIONS">Despliegue Rápido & Soporte</option>
                        <option value="GENERAL">Equilibrado General</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

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

              <div className="flex flex-col gap-2 pt-1">
                {/* The Junia Engine (Fase 09 Multi-Paso Recomendado) */}
                <button
                  onClick={handleOpenJuniaEngine}
                  disabled={isGeneratingOutline || loading}
                  className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md hover:shadow-indigo-500/25 border border-indigo-400/20"
                >
                  {isGeneratingOutline ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Consultando NotebookLM y Creando Outline...
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 text-indigo-200" />
                      <span>Outline Interactivo (The Junia Engine)</span>
                    </>
                  )}
                </button>

                {/* Generación Rápida One-Shot Clásica */}
                <button
                  onClick={handleGenerate}
                  disabled={loading || isGeneratingOutline}
                  className="w-full bg-slate-100 hover:bg-slate-200/90 border border-slate-300/80 text-slate-700 font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
                      Componiendo One-Shot...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                      <span>Generación Rápida (One-Shot Directo)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        {/* Columna Derecha: Previsualización & Derivación Multicanal */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Ficha de Inteligencia de Producto & Evidence Drawer si están disponibles */}
          {intelligenceCard && (
            <div className="space-y-4">
              <ProductIntelligenceView card={intelligenceCard} />
              <EvidenceAuditDrawer
                score={95}
                evidenceLedger={intelligenceCard.evidenceLedger}
                productName={intelligenceCard.product.model}
              />
            </div>
          )}

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
                  <div className="flex flex-col gap-5">
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

                    {/* Ficha de Novedad e Interés por Perfil B2B */}
                    {content.blog.editorialLayout?.targetProfiles && content.blog.editorialLayout.targetProfiles.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-sky-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Propuesta de Valor y Novedad por Perfil (4 Clientes Clave)
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          {content.blog.editorialLayout.targetProfiles.map((p, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 flex flex-col justify-between">
                              <span className="text-[10px] font-bold uppercase text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded w-fit mb-1.5">
                                {p.profile}
                              </span>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {p.keyTakeaway}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Guía Editorial: Dónde Ubicar Fotos y CTAs + Botón Generar Imagen 3 */}
                    {content.blog.editorialLayout?.photoPlacements && content.blog.editorialLayout.photoPlacements.length > 0 && (
                      <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-purple-50/70 border border-purple-200/80 rounded-xl p-4.5 shadow-xs">
                        <div className="flex items-center justify-between mb-3 border-b border-purple-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-purple-600 text-white">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950">
                                Guía de Ubicación de Fotos Recomendadas (Durable CMS)
                              </h4>
                              <p className="text-[11px] text-purple-700">
                                El sistema define la ubicación idónea y genera el prompt optimizado para Imagen 3.
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-purple-800 bg-purple-200/60 px-2 py-0.5 rounded">
                            {content.blog.editorialLayout.photoPlacements.length} Fotos Sugeridas
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {content.blog.editorialLayout.photoPlacements.map((photo, i) => (
                            <div key={photo.id || i} className="bg-white rounded-lg p-3.5 border border-purple-200 shadow-2xs flex flex-col justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-700 uppercase bg-slate-100 px-2 py-0.5 rounded">
                                    Foto #{i + 1} &bull; Tras: {photo.placementAfterHeading}
                                  </span>
                                  <span className="text-[10px] font-semibold text-purple-600">
                                    {photo.photoType}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-800 font-medium mt-1">
                                  {photo.description}
                                </p>
                                <p className="text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-100 line-clamp-2">
                                  "{photo.imagen3Prompt}"
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setImagePrompt(photo.imagen3Prompt);
                                  setMainView("image_studio");
                                }}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                                Generar esta foto en Estudio Imagen 3 &rarr;
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                    <div className="bg-white border border-amber-200/80 rounded-xl p-5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                            Asistente de Campaña Mailchimp
                          </span>
                          <span className="text-xs text-slate-500">Personaliza la oferta técnica y el CTA antes de generar</span>
                        </div>
                        <button
                          onClick={handleGenerate}
                          disabled={loading}
                          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Regenerar Email con estos Equipos
                        </button>
                      </div>

                      {/* Paso 1: Ideas de Campaña */}
                      <div className="mb-5">
                        <label className="text-xs font-bold text-slate-800 block mb-2">
                          Paso 1: Selecciona una Idea o Enfoque de Campaña B2B
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {CAMPAIGN_IDEAS.map((idea) => (
                            <button
                              key={idea.id}
                              onClick={() => handleSelectIdea(idea.id)}
                              className={`text-left p-3 rounded-lg border text-xs transition flex flex-col gap-1 ${
                                selectedCampaignIdea === idea.id
                                  ? "bg-amber-50/80 border-amber-500 text-amber-950 shadow-2xs"
                                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-900">{idea.title}</span>
                                <span className="text-[10px] text-amber-700 font-mono font-bold">Paso 1</span>
                              </div>
                              <p className="text-[11px] text-slate-500">{idea.angle}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Paso 2: Equipos a Promocionar */}
                      <div className="mb-5">
                        <label className="text-xs font-bold text-slate-800 block mb-2">
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
                                    ? "bg-amber-50/60 border-amber-500 text-slate-900 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                  <div className="font-semibold text-slate-900">{prod.name}</div>
                                  <div className="text-[11px] text-slate-500">{prod.model} &bull; {prod.category}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Paso 3: Llamada a la Acción (CTA) */}
                      <div className="mb-4">
                        <label className="text-xs font-bold text-slate-800 block mb-2">
                          Paso 3: Objetivo y Botón de Conversión (CTA B2B)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                          {B2B_CTA_OPTIONS.map((cta) => (
                            <button
                              key={cta.id}
                              onClick={() => handleCtaOptionChange(cta.id)}
                              className={`text-left p-2.5 rounded-lg border text-xs transition ${
                                selectedCtaId === cta.id
                                  ? "bg-amber-100/70 border-amber-500 text-amber-950 font-bold shadow-2xs"
                                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <div className="font-semibold">{cta.label}</div>
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <div>
                            <label className="text-[11px] text-slate-600 font-semibold block mb-1">Texto en el botón:</label>
                            <input
                              type="text"
                              value={customCtaText}
                              onChange={(e) => setCustomCtaText(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-600 font-semibold block mb-1">URL de destino:</label>
                            <input
                              type="text"
                              value={customCtaUrl}
                              onChange={(e) => setCustomCtaUrl(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sincronización Multicanal */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-600 font-medium">
                        <span className="font-bold text-slate-800">Sincronizar con otros canales:</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={syncWhatsApp}
                            onChange={(e) => setSyncWhatsApp(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Incluir en difusiones de WhatsApp</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={syncLinkedIn}
                            onChange={(e) => setSyncLinkedIn(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Mencionar equipos en post de LinkedIn</span>
                        </label>
                      </div>
                    </div>

                    {/* Previsualización del Correo */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-xs text-amber-700 font-bold block mb-1">Asunto A (A/B Testing):</span>
                        <p className="text-xs text-slate-900 font-medium">{content.mailchimp.subjectA}</p>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-xs text-amber-700 font-bold block mb-1">Asunto B (A/B Testing):</span>
                        <p className="text-xs text-slate-900 font-medium">{content.mailchimp.subjectB}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Preheader / Vista previa inbox:</span>
                        <p className="text-xs text-slate-800 font-medium mt-0.5">{content.mailchimp.previewText}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(content.mailchimp.newsletterHtml, "mailchimp-html")}
                        className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition shadow-xs"
                      >
                        {copiedKey === "mailchimp-html" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                        {copiedKey === "mailchimp-html" ? "¡Copiado!" : "Copiar HTML Newsletter"}
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-8 bg-slate-100 shadow-xs flex justify-center">
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
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Formato móvil con negritas y emojis:</span>
                        <p className="text-xs text-slate-500 mt-0.5">Listo para listas de difusión y comunidades de WhatsApp B2B</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(content.whatsapp.formattedMessage, "whatsapp-text")}
                        className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition shadow-xs"
                      >
                        {copiedKey === "whatsapp-text" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-400" />}
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
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-xs text-blue-700 font-bold uppercase tracking-wider">Post B2B con Hook + Valor Técnico:</span>
                        <p className="text-xs text-slate-500 mt-0.5">Optimizado para el algoritmo de LinkedIn (debate y lectura)</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(content.linkedin.fullPostText, "linkedin-text")}
                        className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition shadow-xs"
                      >
                        {copiedKey === "linkedin-text" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
                        {copiedKey === "linkedin-text" ? "¡Copiado!" : "Copiar Post para LinkedIn"}
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 max-w-xl mx-auto w-full shadow-xs">
                      <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                        <div className="w-10 h-10 rounded-full bg-[#0f172a] flex items-center justify-center font-bold text-white text-sm">
                          ES
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">EcomShop / EcomSpain &bull; B2B Networking</div>
                          <div className="text-[11px] text-slate-500">Mayorista en redes y telecomunicaciones</div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans">
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
        </div>
      )}

      {/* VISTA 2: HISTORIAL Y ESTADOS */}
      {mainView === "history" && (
        <div className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h2 className="font-editorial text-lg font-bold text-slate-900">
                  Historial de Publicaciones & Archivo Editorial
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Supervisa los borradores creados, gestiona el ciclo de revisión y recupera ediciones previas en el canvas.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadDatabaseContents()}
                disabled={loadingDatabaseContents}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs"
                title="Recargar artículos desde Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDatabaseContents ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
                <span>{loadingDatabaseContents ? "Sincronizando..." : "Sincronizar BBDD"}</span>
              </button>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar en el archivo..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {historyItems.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center text-slate-500 flex flex-col items-center shadow-xs">
              <History className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-900 font-editorial">No hay publicaciones archivadas aún</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Genera tu primer artículo en el Generador Multicanal y se guardará automáticamente en este panel editorial compartido.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setMainView("generator")}
                  className="bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs"
                >
                  Ir al Generador
                </button>
                <button
                  onClick={() => loadDatabaseContents()}
                  disabled={loadingDatabaseContents}
                  className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDatabaseContents ? "animate-spin text-indigo-600" : ""}`} />
                  Cargar desde BBDD
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {historyItems
                .filter(item => item.title.toLowerCase().includes(searchHistory.toLowerCase()) || item.category.toLowerCase().includes(searchHistory.toLowerCase()))
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between hover:border-slate-300 hover:shadow-2xs transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs uppercase text-slate-800 border border-slate-200">
                        {item.category.substring(0, 3)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 hover:text-sky-600 cursor-pointer font-editorial" onClick={() => {
                          if (item.content) {
                            setContent(item.content);
                            setTopicTitle(item.title);
                            setCategory(item.category as any || "general");
                            setMainView("generator");
                          }
                        }}>
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>Fecha: {item.createdAt}</span>
                          <span>&bull;</span>
                          <span>Slug: /{item.content?.blog?.slug || "general"}</span>
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
                            ? "bg-purple-50 border-purple-200 text-purple-800"
                            : item.status === "approved"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : item.status === "reviewed"
                            ? "bg-sky-50 border-sky-200 text-sky-800"
                            : "bg-amber-50 border-amber-200 text-amber-800"
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
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition border border-slate-200"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-600" />
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
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
              <h2 className="font-editorial text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                Estudio Visual con Google Imagen 3
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Genera imágenes fotorrealistas de infraestructuras IT, racks, APs y fibra óptica para el blog y redes sociales.
              </p>

              <div className="flex flex-col gap-3">
                {/* Botón Destacado: Agente Interrogador */}
                <button
                  type="button"
                  onClick={() => setShowInterrogatorModal(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold p-3 rounded-xl text-xs flex items-center justify-between shadow-xs transition"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Director de Arte IA (Interrogatorio)</div>
                      <div className="text-[10px] text-purple-100 font-normal">
                        Responde preguntas clave o perfila desde una foto base
                      </div>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </button>

                {/* Subida / Visualización de Imagen Base */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-purple-600" />
                      Imagen Base de Referencia (Opcional)
                    </label>
                    {imageBase && (
                      <button
                        type="button"
                        onClick={() => setImageBase(null)}
                        className="text-[10px] text-rose-600 hover:underline font-semibold"
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  {imageBase ? (
                    <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden border border-purple-300 group">
                      <img src={imageBase} alt="Base" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-white text-[11px] font-medium">Referencia activa para variaciones</span>
                      </div>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-300 hover:border-purple-400 bg-white hover:bg-purple-50/30 rounded-lg p-2.5 flex items-center justify-center gap-2 cursor-pointer transition">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-600">Subir imagen base para guiar la generación</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const compressed = await compressImageToDataUrl(file);
                            setImageBase(compressed);
                          } catch {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setImageBase(ev.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Bloque de Fotos Reales de Producto (NotebookLM - 100% Sin Alucinaciones) */}
                <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                      <label className="text-xs font-bold text-emerald-950">Fotos Reales Oficiales (NotebookLM)</label>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                      0 Alucinaciones · 0€
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 mb-2.5 leading-snug">
                    Hardware exacto del catálogo oficial sin manipulación por IA. Fotos de fabricante para tienda y blog:
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {STAR_PRODUCTS.map((prod) => (
                      <div
                        key={prod.id}
                        className="bg-white border border-emerald-200/80 rounded-lg p-2 flex flex-col justify-between hover:shadow-xs transition"
                      >
                        <div 
                          className="relative aspect-video bg-slate-50 rounded overflow-hidden mb-1.5 flex items-center justify-center border border-slate-100 cursor-zoom-in group/thumb"
                          onClick={() => setSelectedImageForDetail({
                            id: prod.id,
                            url: prod.imageUrl,
                            prompt: `${prod.name} (${prod.model}) — ${prod.description}. Especificaciones Oficiales: ${prod.specs.join(", ")}`,
                            createdAt: "Catálogo Oficial",
                            sourceType: "official_product"
                          })}
                          title="Clic para ampliar y ver fotografía oficial en detalle"
                        >
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="object-contain w-full h-full p-1 group-hover/thumb:scale-105 transition duration-200"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center gap-1 text-[10px] text-white font-medium">
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Ampliar</span>
                          </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 truncate mb-0.5" title={prod.name}>
                          {prod.model}
                        </div>
                        <div className="text-[10px] text-slate-500 line-clamp-1 mb-2">
                          {prod.description}
                        </div>
                        <div className="grid grid-cols-2 gap-1 mt-auto">
                          <button
                            type="button"
                            onClick={() => handleUseRealProductPhoto(prod)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-1 rounded text-[10px] transition text-center"
                            title="Añadir fotografía real a la galería (Coste: 0€)"
                          >
                            Usar (0€)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setImageBase(prod.imageUrl);
                              setImagePrompt(`Corporate architectural placement of ${prod.name} (${prod.model}) in an enterprise office`);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1 px-1 rounded text-[10px] transition text-center"
                            title="Usar como base de referencia visual"
                          >
                            Como Base
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Plantillas Técnicas Preconfiguradas</label>
                  <div className="grid grid-cols-1 gap-2">
                    {PRESET_IMAGE_PROMPTS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setImagePrompt(p.prompt);
                          setImageAspectRatio(p.aspectRatio);
                        }}
                        className="text-left p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition"
                      >
                        <div className="font-semibold text-slate-900">{p.title}</div>
                        <div className="text-[10px] text-purple-700 font-mono font-semibold mt-0.5">{p.aspectRatio}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Prompt de Generación (Inglés recomendado)
                    </label>
                    <button
                      type="button"
                      onClick={handleRefinePrompt}
                      disabled={refiningPrompt || !imagePrompt.trim()}
                      className="text-[11px] text-purple-700 hover:text-purple-800 font-bold flex items-center gap-1 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 px-2 py-0.5 rounded transition disabled:opacity-40"
                      title="Analizar y cualificar el prompt actual con IA"
                    >
                      {refiningPrompt ? (
                        <>
                          <div className="w-2.5 h-2.5 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
                          <span>Cualificando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>✨ Cualificar con IA</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={imagePrompt}
                    onChange={(e) => {
                      setImagePrompt(e.target.value);
                      if (promptRefinement) setPromptRefinement(null);
                    }}
                    placeholder="Describe tu idea en español o inglés (ej: switch de 24 puertos en rack con luces led azule y cables ordenados)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white resize-none font-mono"
                  />

                  {/* Asistente y Comparativa de Prompt Cualificado */}
                  <div className="mt-2">
                    <PromptRefinementCard
                      refinement={promptRefinement}
                      loading={refiningPrompt}
                      currentPrompt={imagePrompt}
                      onRequestRefine={handleRefinePrompt}
                      onApply={handleApplyRefinedPrompt}
                      onApplyAndGenerate={handleApplyAndGenerateRefinedPrompt}
                      onDismiss={() => setPromptRefinement(null)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Formato / Relación de Aspecto</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["16:9", "1:1", "4:3"] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setImageAspectRatio(ratio)}
                        className={`py-1.5 rounded-lg border text-xs font-semibold transition ${
                          imageAspectRatio === ratio
                            ? "bg-purple-100 border-purple-500 text-purple-950 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {imageNotice && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-snug flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{imageNotice}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={() => handleGenerateImage("ai")}
                    disabled={generatingImage}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    {generatingImage ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generando con IA Flash (~0,004 €)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generar con IA Flash (~0,004 €)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleGenerateImage("curated")}
                    disabled={generatingImage}
                    className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <span>🖼️ Usar Banco de Stock Web (Gratis 0,00 €)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex-1 flex flex-col shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-editorial text-sm font-bold text-slate-900">Galería de Imágenes Generadas</h3>
                  <p className="text-[11px] text-slate-500">Catálogo compartido de activos visuales en Firestore</p>
                </div>
                <button
                  onClick={() => loadDatabaseAssets()}
                  disabled={loadingDatabaseAssets}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition shadow-2xs"
                  title="Recargar imágenes desde Firestore"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingDatabaseAssets ? "animate-spin text-purple-600" : "text-slate-500"}`} />
                  <span>{loadingDatabaseAssets ? "Cargando..." : "Recargar BBDD"}</span>
                </button>
              </div>

              {generatedImagesList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                  <p className="text-xs font-medium text-slate-600">No hay imágenes generadas en esta sesión.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Selecciona una plantilla, sube una foto base o activa el Director IA a la izquierda para generar activos visuales únicos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[650px]">
                  {generatedImagesList.map((img) => (
                    <div key={img.id} className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden group hover:shadow-md transition duration-200 flex flex-col justify-between">
                      <div 
                        className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden cursor-zoom-in"
                        onClick={() => setSelectedImageForDetail(img)}
                        title="Haz clic para ampliar la foto y ver detalles de generación"
                      >
                        <img 
                          src={img.url} 
                          alt={img.prompt} 
                          className="object-cover w-full h-full group-hover:scale-105 transition duration-300" 
                        />
                        {img.sourceType && (
                          <span className={`absolute top-2 left-2 text-[9px] px-2 py-0.5 rounded font-mono font-medium backdrop-blur-xs z-10 ${
                            img.sourceType === "official_product"
                              ? "bg-emerald-700/95 text-emerald-100 border border-emerald-500/30"
                              : "bg-slate-900/80 text-white"
                          }`}>
                            {img.sourceType === "official_product"
                              ? "✓ Foto Oficial (NotebookLM)"
                              : img.sourceType === "imagen3"
                              ? "Google Imagen 3"
                              : img.sourceType === "gemini_multimodal"
                              ? "Multimodal Gemini"
                              : "Stock Variado"}
                          </span>
                        )}
                        {/* Overlay para ampliar */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white font-medium text-xs backdrop-blur-2xs">
                          <Maximize2 className="w-4 h-4 text-sky-300" />
                          <span>Ampliar en Detalle</span>
                        </div>
                      </div>
                      <div className="p-3 flex flex-col gap-2 flex-1 justify-between">
                        <p 
                          className="text-[11px] text-slate-600 line-clamp-2 cursor-pointer hover:text-slate-900"
                          onClick={() => setSelectedImageForDetail(img)}
                          title="Clic para ver prompt completo"
                        >
                          {img.prompt}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                          <span className="text-[10px] text-slate-400">{img.createdAt}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedImageForDetail(img)}
                              className="bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                              title="Ampliar imagen a pantalla completa con zoom"
                            >
                              <Maximize2 className="w-3 h-3 text-sky-600" />
                              Ampliar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImageBase(img.url);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 px-2 py-1 rounded text-[10px] font-semibold transition"
                              title="Usar esta imagen como referencia base"
                            >
                              Usar como base
                            </button>
                            <a
                              href={img.url}
                              download={`ecomshop-${img.id}.jpg`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 transition shadow-2xs"
                              title="Descargar imagen"
                            >
                              <Download className="w-3 h-3 text-slate-600" />
                              Descargar
                            </a>
                          </div>
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
          <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h2 className="font-editorial text-lg font-bold text-slate-900">
                  Monitor FinOps & Valoración de Costes en Tiempo Real
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Auditoría continua de consumo en Google Gemini 2.5 Flash, Google Imagen 3, Google Cloud Run y Firebase Firestore.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Badge de fuente de datos */}
              {cloudCosts ? (
                cloudCosts.source === "fallback_estimation" ? (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-amber-800 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Estimación local (sin billing viewer)
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Datos Reales Google Cloud
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Tarifas Oficiales de Google Cloud
                </div>
              )}
              {/* Botón Actualizar desde GCP */}
              {currentUser && (
                <button
                  onClick={() => fetchCloudCosts(true)}
                  disabled={loadingCloudCosts}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 text-xs font-semibold transition"
                  title="Consultar Google Cloud Billing en tiempo real"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingCloudCosts ? "animate-spin" : ""}`} />
                  {loadingCloudCosts ? "Consultando GCP…" : "↻ Actualizar"}
                </button>
              )}
            </div>
          </div>

          {/* Tarjetas de Resumen FinOps */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block mb-1">Gasto Acumulado Sesión</span>
              <div className="font-editorial text-2xl font-bold text-slate-950">
                {usageRecords.reduce((acc, curr) => acc + curr.estimatedCostEur, 0).toFixed(4)} €
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">~0,0008€ por artículo completo</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block mb-1">Google Gemini 2.5 Flash</span>
              <div className="font-editorial text-2xl font-bold text-sky-700">
                {usageRecords.filter(r => r.action.startsWith("gemini")).length} <span className="text-xs font-normal text-slate-500">llamadas</span>
              </div>
              <span className="text-[10px] text-slate-500">0.07€ / 1M in &bull; 0.28€ / 1M out</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block mb-1">Google Imagen 3</span>
              <div className="font-editorial text-2xl font-bold text-purple-700">
                {usageRecords.filter(r => r.action === "imagen_image").length} <span className="text-xs font-normal text-slate-500">imágenes</span>
              </div>
              <span className="text-[10px] text-slate-500">~0.028€ por imagen generada</span>
            </div>

            {/* Tarjeta Cloud Run & Firebase — ahora con datos reales */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs relative">
              <span className="text-xs text-slate-500 font-medium block mb-1">Cloud Run & Firebase</span>
              {loadingCloudCosts ? (
                <div className="flex items-center gap-2 py-1">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin" />
                  <span className="text-xs text-slate-400">Consultando GCP…</span>
                </div>
              ) : cloudCosts ? (
                <>
                  <div className="font-editorial text-2xl font-bold text-emerald-700">
                    {cloudCosts.totalEur.toFixed(4)} €
                    {cloudCosts.totalEur === 0 && (
                      <span className="text-xs font-normal text-emerald-600 ml-1">(Capa Gratuita)</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {cloudCosts.period.start} → {cloudCosts.period.end}
                    {cloudCosts.cached && " · caché"}
                  </span>
                </>
              ) : (
                <>
                  <div className="font-editorial text-2xl font-bold text-emerald-700">
                    0,00 € <span className="text-xs font-normal text-emerald-600">(Capa Gratuita)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">2M req/mes gratis en Cloud Run</span>
                </>
              )}
            </div>
          </div>

          {/* Panel de Costes Reales GCP por Servicio */}
          {cloudCosts && cloudCosts.services.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-editorial text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Desglose Real por Servicio Google Cloud MTD
                </h3>
                <div className="flex items-center gap-2">
                  {cloudCosts.billingAccountId && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Billing: {cloudCosts.billingAccountId}
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    cloudCosts.source === "google_cloud_monitoring"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : cloudCosts.source === "google_cloud_billing_api"
                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {cloudCosts.source === "google_cloud_monitoring"
                      ? "Cloud Monitoring API"
                      : cloudCosts.source === "google_cloud_billing_api"
                      ? "Billing API"
                      : "Estimación local"}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="py-2.5">Servicio GCP</th>
                      <th className="py-2.5 text-right">Coste MTD (€)</th>
                      <th className="py-2.5 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {cloudCosts.services.map((svc) => (
                      <tr key={svc.service}>
                        <td className="py-2.5 font-medium">{svc.displayName}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-emerald-700">
                          {svc.costEur.toFixed(6)} €
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            svc.costEur === 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : svc.costEur < 1
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {svc.costEur === 0 ? "FREE TIER" : svc.costEur < 1 ? "< 1€" : `${svc.costEur.toFixed(2)}€`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200">
                      <td className="py-2.5 font-bold text-slate-900">TOTAL Google Cloud MTD</td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                        {cloudCosts.totalEur.toFixed(6)} €
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              {cloudCosts.error && (
                <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                  ⚠️ {cloudCosts.error}. Para acceso completo, añade el rol <strong>roles/billing.viewer</strong> al Service Account.
                </div>
              )}
              <p className="text-[10px] text-slate-400">
                Actualizado: {new Date(cloudCosts.fetchedAt).toLocaleString("es-ES")}
                {cloudCosts.cached && " · Datos en caché (TTL 5 min)"}
              </p>
            </div>
          )}

          {/* Registro de Telemetría y Acciones */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex flex-col gap-3 shadow-xs">
            <h3 className="font-editorial text-sm font-bold text-slate-900">Registro de Telemetría de Costes</h3>
            
            {usageRecords.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Aún no hay consumo registrado en esta sesión.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="py-2.5">Hora</th>
                      <th className="py-2.5">Servicio / Acción</th>
                      <th className="py-2.5">Detalles</th>
                      <th className="py-2.5">Tokens / Unidades</th>
                      <th className="py-2.5 text-right">Coste Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {usageRecords.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 text-slate-500 font-mono text-[11px]">{new Date(r.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.action.startsWith("gemini")
                              ? "bg-sky-50 text-sky-800 border border-sky-200"
                              : r.action === "imagen_image"
                              ? "bg-purple-50 text-purple-800 border border-purple-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}>
                            {r.action}
                          </span>
                        </td>
                        <td className="py-2.5">{r.details}</td>
                        <td className="py-2.5 font-mono text-[11px] text-slate-500">
                          {r.tokensInput ? `In: ${r.tokensInput} / Out: ${r.tokensOutput}` : r.imageCount ? `1 Imagen` : "1 Req"}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-emerald-700">
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-editorial text-base font-bold text-slate-900">Configuración Agente Gemini</h3>
                  <p className="text-[11px] text-slate-500">Gemini 2.5 Flash B2B Strategist</p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 flex flex-col gap-2">
              <p>
                Introduce tu <strong>Google Gemini API Key</strong> para que el agente estratégico genere contenido dinámico B2B con razonamiento avanzado.
              </p>
              <p className="text-slate-400 text-[11px]">
                La clave se almacena de forma segura en tu navegador (localStorage) y se utiliza para las peticiones al motor de generación.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700">Gemini API Key</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  setKeyStatus("unchecked");
                }}
                placeholder="AQ... o AIzaSy..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            {/* Estado de la Key */}
            <div className="flex items-center gap-2 text-xs">
              {validatingKey ? (
                <span className="text-sky-600 flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
                  Comprobando conexión con Gemini...
                </span>
              ) : keyStatus === "valid" ? (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  API Key válida. Modelo <strong>{connectedModel}</strong> conectado.
                </span>
              ) : keyStatus === "invalid" ? (
                <span className="text-rose-700 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{keyErrorMessage || "Clave inválida o sin permisos en Google Cloud."}</span>
                </span>
              ) : (
                <span className="text-slate-500 text-[11px]">
                  Introduce la clave y haz clic en Validar.
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setGeminiApiKey("");
                  localStorage.removeItem("ecomshop_gemini_key");
                  setKeyStatus("unchecked");
                }}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
              >
                Limpiar
              </button>
              <button
                onClick={() => checkKeyValidity(geminiApiKey)}
                disabled={!geminiApiKey || validatingKey}
                className="bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition shadow-2xs"
              >
                Validar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de NotebookLM */}
      {showNotebookModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-editorial text-base font-bold text-slate-900">Estado de Google NotebookLM</h3>
                  <p className="text-[11px] text-slate-500">ID: {notebookState.notebookId} &bull; Sincronizado: {notebookState.lastSync}</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotebookModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Pestañas del Modal */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setNotebookTab("sources")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  notebookTab === "sources"
                    ? "bg-purple-100 text-purple-900 border border-purple-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                📚 Fuentes Sincronizadas ({notebookState.sources.length})
              </button>
              <button
                type="button"
                onClick={() => setNotebookTab("ask")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  notebookTab === "ask"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/70"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Cuestionar al Notebook & Sugerir Fuentes
              </button>
            </div>

            {/* VISTA 1: FUENTES SINCRONIZADAS */}
            {notebookTab === "sources" && (
              <div className="space-y-4">
                {/* Banner de Enlace Oficial */}
                <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Notebook Oficial en Google</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{notebookState.title}</p>
                    <span className="text-[11px] text-slate-500">El Agente Gemini consulta este repositorio de conocimiento para generar contenidos B2B.</span>
                  </div>
                  <a
                    href={notebookState.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shadow-2xs shrink-0"
                  >
                    Abrir NotebookLM
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Lista de Fuentes Cargadas */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Fuentes y Whitepapers Sincronizados ({notebookState.sources.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                    {notebookState.sources.map((src) => (
                      <div key={src.id} className="p-3 rounded-lg border border-slate-200/70 bg-slate-50/60 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">{src.title}</span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                              {src.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1">{src.description}</p>
                          {src.url && (
                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-sky-600 hover:underline mt-1 inline-block">
                              {src.url}
                            </a>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">{src.addedAt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulario para Registrar Nueva Fuente */}
                <form onSubmit={handleAddNotebookSource} className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-purple-600" />
                    Registrar Nueva Fuente / Documento Técnico
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Título de la fuente (ej: Datasheet EnGenius Cloud Switch...)"
                      value={newSourceTitle}
                      onChange={(e) => setNewSourceTitle(e.target.value)}
                      className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                      required
                    />
                    <select
                      value={newSourceType}
                      onChange={(e) => setNewSourceType(e.target.value as any)}
                      className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                    >
                      <option value="datasheet">Datasheet Técnico</option>
                      <option value="pdf">Whitepaper / PDF</option>
                      <option value="url">URL Web / Catálogo</option>
                      <option value="note">Nota de Ingeniería Preventa</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Breve resumen del contenido y especificaciones..."
                    value={newSourceDesc}
                    onChange={(e) => setNewSourceDesc(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                    required
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="URL oficial (opcional: https://www.ecomshop.es/...)"
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={addingSource}
                      className="bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs px-4 py-1.5 rounded transition shrink-0"
                    >
                      {addingSource ? "Añadiendo..." : "Añadir Fuente"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* VISTA 2: CUESTIONAR AL NOTEBOOK & SUGERIR FUENTES */}
            {notebookTab === "ask" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-900 to-slate-900 text-white p-4 rounded-xl shadow-xs">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300">
                    Analista Preventa & Documentalista IA
                  </span>
                  <h4 className="text-sm font-bold mt-0.5">
                    Cuestiona las 20 fuentes oficiales de NotebookLM o detecta vacíos documentales
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Pregunta sobre compatibilidades, especificaciones PoE++ o solicita al agente qué nuevas fuentes de 2026 deberías incorporar.
                  </p>
                </div>

                {/* Preguntas Sugeridas Rápidas */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">Preguntas sugeridas frecuentes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAskNotebook("¿Qué switch EnGenius recomendamos para alimentar puntos de acceso WiFi 7 PoE++?")}
                      className="text-[11px] bg-slate-100 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 px-2.5 py-1 rounded-full text-slate-700 transition"
                    >
                      ⚡ Switches PoE++ para WiFi 7
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAskNotebook("¿Cuáles son las principales ventajas de TCO de EnGenius Cloud frente a Cisco Meraki a 3 años?")}
                      className="text-[11px] bg-slate-100 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 px-2.5 py-1 rounded-full text-slate-700 transition"
                    >
                      💰 Ahorro TCO vs Meraki
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAskNotebook("Analiza nuestras 20 fuentes e indica qué novedades de 2026 nos faltan por cubrir.")}
                      className="text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-full font-semibold transition"
                    >
                      🔍 ¿Qué fuentes de 2026 nos faltan?
                    </button>
                  </div>
                </div>

                {/* Formulario de Pregunta */}
                <div className="space-y-2">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={notebookQuestion}
                      onChange={(e) => setNotebookQuestion(e.target.value)}
                      placeholder="Escribe tu consulta técnica o pide sugerencias de fuentes para 2026..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={suggestNewSources}
                        onChange={(e) => setSuggestNewSources(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>Sugerir nuevas fuentes faltantes si aplica</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleAskNotebook()}
                      disabled={askingNotebook || !notebookQuestion.trim()}
                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-xs"
                    >
                      {askingNotebook ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Consultando NotebookLM...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                          Cuestionar al Notebook
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Resultados de la Consulta */}
                {notebookAnswer && (
                  <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-4 space-y-3.5 animate-in fade-in">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="p-1 rounded bg-purple-600 text-white">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-purple-950">
                          Respuesta Fundamentada en NotebookLM
                        </h5>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium bg-white p-3 rounded-lg border border-purple-100">
                        {notebookAnswer.answer}
                      </p>
                    </div>

                    {/* Fuentes Citadas */}
                    {notebookAnswer.citedSources && notebookAnswer.citedSources.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-600">Fuentes consultadas en el cuaderno:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {notebookAnswer.citedSources.map((cs) => (
                            <span key={cs.id} className="text-[10px] font-semibold bg-white border border-purple-200 text-purple-900 px-2 py-0.5 rounded shadow-2xs">
                              📌 {cs.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nuevas Fuentes Sugeridas para incorporar */}
                    {notebookAnswer.suggestedNewSources && notebookAnswer.suggestedNewSources.length > 0 && (
                      <div className="space-y-2 border-t border-purple-200/60 pt-2.5">
                        <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-purple-600" />
                          Nuevas Fuentes Recomendadas para Incorporar al Cuaderno:
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {notebookAnswer.suggestedNewSources.map((ns, idx) => (
                            <div key={idx} className="bg-white p-2.5 rounded-lg border border-purple-200 flex items-start justify-between gap-3 shadow-2xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">{ns.title}</span>
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                                    {ns.type}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-0.5">{ns.description}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddSuggestedSource(ns)}
                                disabled={addingSource}
                                className="shrink-0 text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded border border-purple-200 transition"
                              >
                                + Añadir al Notebook
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botón Transferir al Generador de Contenido */}
                    {notebookAnswer.transferableTopic && (
                      <div className="border-t border-purple-200/60 pt-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500">¿Quieres redactar sobre esto?</span>
                          <p className="text-xs font-bold text-slate-900">{notebookAnswer.transferableTopic.title}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTransferNotebookTopic(notebookAnswer.transferableTopic!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                          Transferir al Generador &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Autenticación Corporativa */}
      {showSignInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setShowSignInModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-sm font-bold z-10 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition"
            >
              ✕
            </button>
            <CorporateSignIn
              onSuccess={(user) => {
                setCurrentUser(user as any);
                setShowSignInModal(false);
              }}
              onContinueAsGuest={() => {
                setShowSignInModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal del Agente Interrogador de Imagen */}
      <ImageInterrogatorModal
        isOpen={showInterrogatorModal}
        onClose={() => setShowInterrogatorModal(false)}
        apiKey={geminiApiKey || undefined}
        currentBaseImage={imageBase}
        onApplyPrompt={(newPrompt, newRatio, baseImg) => {
          setImagePrompt(newPrompt);
          setImageAspectRatio(newRatio);
          if (baseImg !== undefined) {
            setImageBase(baseImg);
          }
        }}
      />

      {/* Modal de Detalle y Zoom de Imagen */}
      <ImageDetailModal
        image={selectedImageForDetail}
        onClose={() => setSelectedImageForDetail(null)}
        onUseAsBase={(url) => {
          setImageBase(url);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* Modal de The Junia Engine: Outline Interactivo y Redacción Profunda (Fase 09) */}
      {showOutlineModal && currentOutline && (
        <OutlineEditorModal
          isOpen={showOutlineModal}
          onClose={() => setShowOutlineModal(false)}
          initialOutline={currentOutline}
          category={category}
          onArticleGenerated={handleJuniaArticleGenerated}
        />
      )}
    </div>
  );
}
