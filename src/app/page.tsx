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
  ChevronDown,
  ChevronUp,
  ArrowRight,
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
  RotateCcw,
  Search,
  Filter,
  Plus,
  Zap,
  Camera,
  Upload,
  Shield,
  LogOut,
  User as UserIcon,
  Maximize2,
  Trash2,
  FileText,
  CheckSquare,
  Save,
  Package,
  ShieldAlert,
  ShieldCheck
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
import { BulkActionToolbar } from "@/components/media/BulkActionToolbar";
import { DocumentDetailModal } from "@/components/media/DocumentDetailModal";
import { ProductIntelligenceView } from "@/components/product-intelligence-view";
import { EvidenceAuditDrawer } from "@/components/evidence-audit-drawer";
import { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import { OpportunityRadarWidget } from "@/components/opportunity-radar-widget";
import { ProductOpportunityRecord } from "@/lib/services/opportunity-radar";
import { CorporateSignIn } from "@/components/auth/CorporateSignIn";
import { apiFetch, ApiError } from "@/lib/api-client";
import { CampaignWorkspace } from "@/components/campaign-workspace";
import { CampaignStepper, GenerationStage } from "@/components/campaign-stepper";
import { EditorialControlsBar } from "@/components/editorial-controls-bar";
import { EditorialControls, BusinessGoal } from "@/lib/types/editorial-controls";
import { SuggestedTopics } from "@/components/suggested-topics";
import { EditorialTopicCard } from "@/lib/types/editorial-topics";
import { compressImageToDataUrl } from "@/lib/image-compressor";
import { OutlineEditorModal } from "@/components/outline-editor-modal";
import { ArticleOutline } from "@/lib/types/article-outline";
import { PromptRefinementCard, PromptRefinementData } from "@/components/PromptRefinementCard";
import {
  saveImageToIndexedDB,
  saveImagesBulkToIndexedDB,
  getAllImagesFromIndexedDB,
  deleteImageFromIndexedDB,
  deleteImagesBulkFromIndexedDB,
  clearAllImagesFromIndexedDB
} from "@/lib/image-db";
import { ImageStudioView } from "@/components/image-studio-view";

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
    businessGoal: "ALL_OPPORTUNITIES",
    targetSector: "ENTERPRISE_OFFICE",
    includePricing: false,
    emphasizeUplinkSwitching: true,
    technicalDeepDiveLevel: "HIGH_TECHNICAL",
    editorialTone: "ENGINEERING_PREVENTA",
    competitorFocus: "MERAKI",
    strategicCta: "FREE_SURVEY",
    customInstructions: ""
  });

  const [selectedBusinessGoal, setSelectedBusinessGoal] = useState<BusinessGoal>("ALL_OPPORTUNITIES");
  const [isRegeneratingRadar, setIsRegeneratingRadar] = useState(false);
  const [isReplacingSku, setIsReplacingSku] = useState<string | null>(null);
  const [excludedSkus, setExcludedSkus] = useState<string[]>([]);

  // Estado para Junia Engine (Fase 09 Multi-Paso)
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [currentOutline, setCurrentOutline] = useState<ArticleOutline | null>(null);
  const [showOutlineModal, setShowOutlineModal] = useState(false);

  // Unified Workspace State (Selector de Origen y Selección de Tarjeta)
  const [entryOrigin, setEntryOrigin] = useState<"radar" | "url" | "topic">("radar");
  const [selectedRadarOppId, setSelectedRadarOppId] = useState<string | null>(null);
  const [canvasActiveTab, setCanvasActiveTab] = useState<"blog" | "linkedin" | "mailchimp" | "whatsapp" | "intel">("blog");
  const [isSavingArticle, setIsSavingArticle] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

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

  const loadOpportunities = async (
    controls?: EditorialControls,
    excluded?: string[],
    directive?: string,
    shuffle?: number,
    goal?: BusinessGoal
  ) => {
    if (!currentUser) return;
    setLoadingOpportunities(true);
    try {
      const activeGoal = goal || selectedBusinessGoal;
      const data = await apiFetch<{ opportunities?: ProductOpportunityRecord[] }>("/api/opportunities", {
        method: "POST",
        body: JSON.stringify({
          limit: 3,
          businessGoal: activeGoal,
          editorialControls: controls || editorialControls,
          excludedSkus: excluded || excludedSkus,
          customDirective: directive,
          shuffleSeed: shuffle || 0
        })
      });
      if (data.opportunities) {
        setOpportunities(data.opportunities);
      }
    } catch (err) {
      console.warn("Radar de oportunidades requiere autenticación o no devolvió datos:", err);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [currentUser]);

  const handleRegenerateRadar = async () => {
    setIsRegeneratingRadar(true);
    const randomSeed = Math.floor(Math.random() * 100) + 1;
    await loadOpportunities(editorialControls, excludedSkus, undefined, randomSeed, selectedBusinessGoal);
    setIsRegeneratingRadar(false);
  };

  const handleReplaceOpportunity = async (
    opp: ProductOpportunityRecord,
    newSku?: string,
    customDirective?: string,
    newAngle?: "ROI" | "PERFORMANCE" | "OPERATIONS"
  ) => {
    if (newAngle && !newSku && !customDirective) {
      setOpportunities(prev => prev.map(item => {
        if (item.id === opp.id) {
          return {
            ...item,
            recommendedAngle: newAngle,
            actionTitle: newAngle === "ROI" 
              ? `Oportunidad TCO & 0€ Cuotas: Pack ${item.model}`
              : newAngle === "PERFORMANCE"
              ? `Oportunidad Máximo Rendimiento: Despliegue de ${item.model}`
              : `Oportunidad Operativa: Despliegue Express 24h de ${item.model}`
          };
        }
        return item;
      }));
      return;
    }

    setIsReplacingSku(opp.sku);
    try {
      const currentSkus = opportunities.map(o => o.sku);
      const updatedExcluded = Array.from(new Set([...excludedSkus, opp.sku]));
      setExcludedSkus(updatedExcluded);

      if (newSku) {
        const res = await apiFetch<{ opportunities?: ProductOpportunityRecord[] }>("/api/opportunities", {
          method: "POST",
          body: JSON.stringify({
            limit: 1,
            businessGoal: selectedBusinessGoal,
            editorialControls,
            excludedSkus: currentSkus.filter(s => s !== newSku),
            customDirective: newSku
          })
        });
        if (res.opportunities && res.opportunities.length > 0) {
          const replacement = res.opportunities[0];
          setOpportunities(prev => prev.map(item => item.id === opp.id ? replacement : item));
        }
      } else {
        const res = await apiFetch<{ replacement?: ProductOpportunityRecord }>("/api/opportunities", {
          method: "POST",
          body: JSON.stringify({
            replaceSku: opp.sku,
            businessGoal: selectedBusinessGoal,
            currentSkus,
            editorialControls,
            customDirective
          })
        });
        if (res.replacement) {
          setOpportunities(prev => prev.map(item => item.id === opp.id ? res.replacement! : item));
        }
      }
    } catch (err) {
      console.error("Error al reemplazar oportunidad:", err);
    } finally {
      setIsReplacingSku(null);
    }
  };

  const handleSelectOpportunity = (opp: ProductOpportunityRecord) => {
    setSelectedRadarOppId(opp.id);
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
          businessGoal: selectedBusinessGoal,
          narrativeAnchor: opp.narrativeAnchor,
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

  const handleUnifiedLaunch = async () => {
    if (entryOrigin === "radar") {
      const activeOpp = opportunities.find(o => o.id === selectedRadarOppId) || opportunities[0];
      if (activeOpp) {
        await handleLaunchCampaign(activeOpp);
        return;
      }
    }
    await handleGenerate();
  };

  const handleSaveToFirestore = async (status: "approved" | "published" = "approved") => {
    if (!content) return;
    setIsSavingArticle(true);
    try {
      const entry: ArticleHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        title: content.blog.title || topicTitle,
        category,
        status,
        createdAt: new Date().toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        }),
        content
      };
      await persistArticleToDatabase(entry);
      setHistoryItems(prev => [entry, ...prev]);
      setSaveSuccessMessage("¡Guardado y Aprobado en Firestore con éxito!");
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error guardando en Firestore:", err);
    } finally {
      setIsSavingArticle(false);
    }
  };

  // Vista Principal del Panel de Administración (5 Módulos)
  const [mainView, setMainView] = useState<"generator" | "advisor" | "history" | "image_studio" | "finops">("generator");

  // Historial de Contenidos y Estados
  const [historyItems, setHistoryItems] = useState<ArticleHistoryItem[]>([]);
  const [searchHistory, setSearchHistory] = useState("");
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [selectedDocumentForDetail, setSelectedDocumentForDetail] = useState<ArticleHistoryItem | null>(null);
  const [isBulkDeletingArticles, setIsBulkDeletingArticles] = useState(false);

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
      const res = await apiFetch<{ contents?: any[] }>("/api/contents");
      if (res?.contents && Array.isArray(res.contents)) {
        const sanitizedRemote: ArticleHistoryItem[] = res.contents.map((item: any, idx: number) => ({
          id: item?.id ? String(item.id) : `remote-${idx}-${Date.now()}`,
          title: item?.title ? String(item.title) : "Artículo sin título",
          category: item?.category ? String(item.category) : "general",
          status: (["draft", "reviewed", "approved", "published"].includes(item?.status) ? item.status : "draft") as any,
          createdAt: item?.createdAt ? String(item.createdAt) : new Date().toLocaleDateString("es-ES"),
          content: item?.content || null
        }));

        setHistoryItems((prev) => {
          const existingIds = new Set(sanitizedRemote.map((c) => c.id));
          const existingSlugs = new Set(sanitizedRemote.map((c) => c.content?.blog?.slug).filter(Boolean));
          const merged = [...sanitizedRemote];
          for (const localItem of prev) {
            if (!localItem) continue;
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
          .map((a: any) => {
            const rawUrl = a.publicUrl || a.url || (a.storagePath && (a.storagePath.startsWith("http") || a.storagePath.startsWith("data:")) ? a.storagePath : "");
            return {
              id: a.id || String(Math.random()),
              url: rawUrl,
              prompt: a.prompt || (a.filename ? a.filename.replace(/^(AI|Placement|Fotografía Oficial|Artículo):\s*/i, "") : "Imagen generada"),
              createdAt: a.createdAt ? (isNaN(new Date(a.createdAt).getTime()) ? a.createdAt : new Date(a.createdAt).toLocaleTimeString("es-ES")) : new Date().toLocaleTimeString("es-ES"),
              sourceType: a.aiProvenance?.model || a.sourceType || "imagen3"
            };
          })
          .filter((a: any) => Boolean(a.url));

        setGeneratedImagesList((prev) => {
          // Prevalecen las imágenes generadas por el usuario (más recientes y con alta resolución)
          const seenIds = new Set<string>();
          const seenUrls = new Set<string>();
          const merged: Array<{ id: string; url: string; prompt: string; createdAt: string; sourceType?: string; warning?: string }> = [];

          // 1. Prioridad: generaciones locales del usuario en IndexedDB/estado
          for (const localImg of prev) {
            if (localImg.url && !seenIds.has(localImg.id) && !seenUrls.has(localImg.url)) {
              merged.push(localImg);
              seenIds.add(localImg.id);
              seenUrls.add(localImg.url);
            }
          }

          // 2. Activos remotos de Firestore que no estén ya en la lista
          for (const dbImg of dbImages) {
            if (dbImg.url && !seenIds.has(dbImg.id) && !seenUrls.has(dbImg.url)) {
              merged.push(dbImg);
              seenIds.add(dbImg.id);
              seenUrls.add(dbImg.url);
            }
          }

          safeSaveGeneratedImages(merged);
          saveImagesBulkToIndexedDB(merged);
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
  const [presetTemplates, setPresetTemplates] = useState<Array<{ id: string; title: string; prompt: string; aspectRatio: "16:9" | "1:1" | "4:3" }>>(PRESET_IMAGE_PROMPTS);
  const [isRegeneratingTemplates, setIsRegeneratingTemplates] = useState(false);
  const [varyingTemplateId, setVaryingTemplateId] = useState<string | null>(null);
  const [showInterrogatorModal, setShowInterrogatorModal] = useState(false);
  const [generatedImagesList, setGeneratedImagesList] = useState<
    { id: string; url: string; prompt: string; createdAt: string; sourceType?: string; warning?: string }[]
  >([]);
  const [selectedImageForDetail, setSelectedImageForDetail] = useState<ImageDetailItem | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isBulkDeletingImages, setIsBulkDeletingImages] = useState(false);
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
   * Guarda de forma defensiva la lista de imágenes en localStorage sin perder las URLs
   * Evita el temido QuotaExceededError que crashea el árbol de componentes de React.
   */
  const safeSaveGeneratedImages = (
    images: Array<{ id: string; url: string; prompt: string; createdAt: string; sourceType?: string; warning?: string }>
  ) => {
    try {
      localStorage.setItem("ecomshop_generated_images", JSON.stringify(images.slice(0, 30)));
    } catch {
      try {
        localStorage.setItem("ecomshop_generated_images", JSON.stringify(images.slice(0, 10)));
      } catch {
        console.warn("[Storage] Cuota de almacenamiento local alcanzada; Firestore mantiene los activos persistentes.");
      }
    }
  };

  useEffect(() => {
    // Cargar historial y finops de localStorage con control total de excepciones
    try {
      const savedHist = localStorage.getItem("ecomshop_article_history");
      if (savedHist) {
        const parsed = JSON.parse(savedHist);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.map((item: any, idx: number) => ({
            id: item?.id ? String(item.id) : `hist-${idx}-${Date.now()}`,
            title: item?.title ? String(item.title) : "Artículo sin título",
            category: item?.category ? String(item.category) : "general",
            status: (["draft", "reviewed", "approved", "published"].includes(item?.status) ? item.status : "draft") as any,
            createdAt: item?.createdAt ? String(item.createdAt) : new Date().toLocaleDateString("es-ES"),
            content: item?.content || null
          }));
          setHistoryItems(sanitized);
        }
      }
    } catch (err) {
      console.warn("[Storage] Error parseando historial local:", err);
    }

    try {
      const savedFinops = localStorage.getItem("ecomshop_finops_records");
      if (savedFinops) setUsageRecords(JSON.parse(savedFinops));
    } catch {}

    // Cargar historial de imágenes desde IndexedDB (sesiones anteriores persistentes)
    getAllImagesFromIndexedDB().then((idbImages) => {
      if (idbImages && idbImages.length > 0) {
        const validIdbImages = idbImages.filter((img) => Boolean(img?.url && img.url.length > 20));
        setGeneratedImagesList((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const existingUrls = new Set(prev.map((i) => i.url));
          const merged = [...prev];
          for (const img of validIdbImages) {
            if (!existingIds.has(img.id) && !existingUrls.has(img.url)) {
              merged.push(img);
              existingIds.add(img.id);
              existingUrls.add(img.url);
            }
          }
          return merged;
        });
      }
    }).catch((err) => {
      console.warn("[IndexedDB] Error cargando imágenes históricas:", err);
    });

    // Fallback de compatibilidad con localStorage de sesiones previas
    try {
      const savedImgs = localStorage.getItem("ecomshop_generated_images");
      if (savedImgs) {
        const parsed = JSON.parse(savedImgs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validParsed = parsed.filter((img: any) => Boolean(img?.url && img.url.length > 20));
          if (validParsed.length > 0) {
            setGeneratedImagesList((prev) => {
              const existingIds = new Set(prev.map((i) => i.id));
              const existingUrls = new Set(prev.map((i) => i.url));
              const merged = [...prev];
              for (const img of validParsed) {
                if (!existingIds.has(img.id) && !existingUrls.has(img.url)) {
                  merged.push(img);
                  existingIds.add(img.id);
                  existingUrls.add(img.url);
                }
              }
              return merged;
            });
            // Migrar automáticamente al nuevo almacenamiento IndexedDB
            saveImagesBulkToIndexedDB(validParsed);
          }
        }
      }
    } catch (err) {
      console.warn("[Storage] Error parseando imágenes guardadas, limpiando:", err);
      try { localStorage.removeItem("ecomshop_generated_images"); } catch {}
    }

    // Cargar plantillas de imagen personalizadas si existen en localStorage
    try {
      const savedTemplates = localStorage.getItem("ecomshop_image_templates");
      if (savedTemplates) {
        const parsedTemplates = JSON.parse(savedTemplates);
        if (Array.isArray(parsedTemplates) && parsedTemplates.length > 0) {
          setPresetTemplates(parsedTemplates);
        }
      }
    } catch (err) {
      console.warn("[Storage] Error cargando plantillas de imagen:", err);
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
    if (!currentUser) {
      setShowSignInModal(true);
      return;
    }

    setLoading(true);
    setCampaignOpportunity(null);
    setCampaignErrorMessage(null);
    setCampaignStage("EXTRACTING");

    const t1 = setTimeout(() => {
      setCampaignStage((prev) => (prev === "EXTRACTING" ? "NOTEBOOK_GROUNDING" : prev));
    }, 1200);

    const t2 = setTimeout(() => {
      setCampaignStage((prev) => (prev === "NOTEBOOK_GROUNDING" ? "GENERATING_CHANNELS" : prev));
    }, 2600);

    const t3 = setTimeout(() => {
      setCampaignStage((prev) => (prev === "GENERATING_CHANNELS" ? "FACT_CHECKING" : prev));
    }, 5200);

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
          businessGoal: selectedBusinessGoal,
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
      setActiveTab("blog");
      setCampaignStage("COMPLETED");

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
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setCampaignStage("ERROR");
      setCampaignErrorMessage(err?.message || "Error al procesar la campaña multicanal.");
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
  const handleOpenJuniaEngine = async (topicOverride?: string, categoryOverride?: string) => {
    setIsGeneratingOutline(true);
    const targetTopic = topicOverride || topicTitle || "Solución de Conectividad y Networking B2B";
    const targetCat = categoryOverride || category;

    try {
      const res = await apiFetch<{ outline: ArticleOutline }>("/api/editorial/outline", {
        method: "POST",
        body: JSON.stringify({
          topicOrProduct: targetTopic,
          targetAudience,
          vertical: editorialControls.targetSector,
          category: targetCat,
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
        saveImageToIndexedDB(newImg);
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
    saveImageToIndexedDB(newImg);
    setGeneratedImagesList((prev) => {
      const updated = [newImg, ...prev];
      safeSaveGeneratedImages(updated);
      return updated;
    });
    setImageNotice(`Fotografía oficial de ${product.name} cargada directamente desde el catálogo / NotebookLM. Producto 100% real sin alucinaciones (Coste: 0,00 €).`);
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm("¿Deseas eliminar esta imagen generada del historial?")) return;
    try {
      await deleteImageFromIndexedDB(id);
      try {
        await apiFetch(`/api/assets?id=${encodeURIComponent(id)}`, { 
          method: "DELETE",
          body: JSON.stringify({ ids: [id] })
        });
      } catch {
        // Silencioso si no está en backend
      }
      setGeneratedImagesList((prev) => {
        const updated = prev.filter((img) => img.id !== id);
        safeSaveGeneratedImages(updated);
        return updated;
      });
      setSelectedImageIds((prev) => prev.filter((i) => i !== id));
      if (selectedImageForDetail?.id === id) {
        setSelectedImageForDetail(null);
      }
    } catch (err) {
      console.error("Error al eliminar imagen:", err);
    }
  };

  const handleBulkDeleteImages = async () => {
    if (selectedImageIds.length === 0) return;
    if (!confirm(`¿Eliminar permanentemente las ${selectedImageIds.length} imágenes seleccionadas de IndexedDB y Firestore?`)) return;
    setIsBulkDeletingImages(true);
    try {
      await deleteImagesBulkFromIndexedDB(selectedImageIds);
      try {
        await apiFetch("/api/assets", {
          method: "DELETE",
          body: JSON.stringify({ ids: selectedImageIds })
        });
      } catch {
        // Silencioso si no está en backend
      }
      setGeneratedImagesList((prev) => {
        const idSet = new Set(selectedImageIds);
        const updated = prev.filter((img) => !idSet.has(img.id));
        safeSaveGeneratedImages(updated);
        return updated;
      });
      if (selectedImageForDetail && selectedImageIds.includes(selectedImageForDetail.id)) {
        setSelectedImageForDetail(null);
      }
      setSelectedImageIds([]);
    } catch (err) {
      console.error("Error al eliminar imágenes en bloque:", err);
      alert("Error al eliminar imágenes en bloque");
    } finally {
      setIsBulkDeletingImages(false);
    }
  };

  const handleRegenerateAllTemplates = async () => {
    try {
      setIsRegeneratingTemplates(true);
      const res = await fetch("/api/images/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "full_set" })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const newTemplates = data.templates || (Array.isArray(data) ? data : null);
      if (newTemplates && Array.isArray(newTemplates) && newTemplates.length > 0) {
        setPresetTemplates(newTemplates);
        try {
          localStorage.setItem("ecomshop_image_templates", JSON.stringify(newTemplates));
        } catch {
          // Silencioso ante cuotas locales
        }
        setImageNotice("¡Plantillas técnicas regeneradas con éxito mediante IA!");
      }
    } catch (err) {
      console.error("Error al regenerar plantillas con IA:", err);
      setImageNotice("No se pudieron regenerar las plantillas con IA en este momento.");
    } finally {
      setIsRegeneratingTemplates(false);
    }
  };

  const handleVarySingleTemplate = async (
    templateToVary: (typeof PRESET_IMAGE_PROMPTS)[number],
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    try {
      setVaryingTemplateId(templateToVary.id);
      const res = await fetch("/api/images/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "single_variation", currentTemplate: templateToVary })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const varied: (typeof PRESET_IMAGE_PROMPTS)[number] | undefined = data.template || data;
      if (varied && varied.prompt) {
        setPresetTemplates((prev) => {
          const updated = prev.map((item) =>
            item.id === templateToVary.id ? { ...item, ...varied, id: templateToVary.id } : item
          );
          try {
            localStorage.setItem("ecomshop_image_templates", JSON.stringify(updated));
          } catch {
            // Silencioso
          }
          return updated;
        });
        if (imagePrompt === templateToVary.prompt) {
          setImagePrompt(varied.prompt);
          setImageAspectRatio(varied.aspectRatio);
        }
      }
    } catch (err) {
      console.error("Error al variar plantilla:", err);
    } finally {
      setVaryingTemplateId(null);
    }
  };

  const handleRestoreDefaultTemplates = () => {
    setPresetTemplates(PRESET_IMAGE_PROMPTS);
    try {
      localStorage.removeItem("ecomshop_image_templates");
    } catch (err) {
      console.warn("Error al limpiar plantillas guardadas:", err);
    }
    setImageNotice("Plantillas restauradas a los valores de catálogo originales.");
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("¿Deseas eliminar este artículo del archivo editorial?")) return;
    try {
      await apiFetch(`/api/contents?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        body: JSON.stringify({ ids: [id] })
      });
      setHistoryItems((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        try { localStorage.setItem("ecomshop_article_history", JSON.stringify(updated.slice(0, 50))); } catch {}
        return updated;
      });
      setSelectedArticleIds((prev) => prev.filter((i) => i !== id));
      if (selectedDocumentForDetail?.id === id) {
        setSelectedDocumentForDetail(null);
      }
    } catch (err) {
      console.error("Error al eliminar artículo:", err);
      alert("Error al eliminar artículo");
    }
  };

  const handleBulkDeleteArticles = async () => {
    if (selectedArticleIds.length === 0) return;
    if (!confirm(`¿Eliminar los ${selectedArticleIds.length} artículos seleccionados del archivo? Esta acción no se puede deshacer.`)) return;
    setIsBulkDeletingArticles(true);
    try {
      await apiFetch("/api/contents", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedArticleIds })
      });
      setHistoryItems((prev) => {
        const idSet = new Set(selectedArticleIds);
        const updated = prev.filter((item) => !idSet.has(item.id));
        try { localStorage.setItem("ecomshop_article_history", JSON.stringify(updated.slice(0, 50))); } catch {}
        return updated;
      });
      if (selectedDocumentForDetail && selectedArticleIds.includes(selectedDocumentForDetail.id)) {
        setSelectedDocumentForDetail(null);
      }
      setSelectedArticleIds([]);
    } catch (err) {
      console.error("Error al eliminar artículos en lote:", err);
      alert("Error al eliminar artículos en lote");
    } finally {
      setIsBulkDeletingArticles(false);
    }
  };

  const handleInsertImageIntoArticle = (img: { url: string; prompt: string }, mode: "hero" | "body" = "body") => {
    const figureHtml = `<figure class="my-6"><img src="${img.url}" alt="${img.prompt}" class="rounded-xl shadow-lg w-full max-h-[500px] object-cover" /><figcaption class="text-xs text-slate-500 mt-2 text-center">${img.prompt.substring(0, 80)}</figcaption></figure>\n`;

    if (!content) {
      const initialContent: ContentOutput = {
        topicId: "custom-" + Date.now(),
        topicTitle: img.prompt.substring(0, 60),
        category: category,
        generatedAt: new Date().toISOString(),
        blog: {
          title: img.prompt.substring(0, 60),
          metaDescription: img.prompt,
          slug: "articulo-" + Date.now(),
          readingTimeMinutes: 5,
          targetKeywords: [category, "redes-b2b"],
          htmlContent: figureHtml + "<p>Introduce aquí el contenido redactado del artículo...</p>",
          cleanPlainTextExcerpt: img.prompt
        },
        mailchimp: {
          subjectA: img.prompt.substring(0, 50),
          subjectB: "Novedad B2B: " + img.prompt.substring(0, 40),
          previewText: img.prompt,
          ctaButtonText: "Ver Detalles",
          ctaUrl: ECOM_BRAND.storeUrl,
          newsletterHtml: `<p>${img.prompt}</p><img src="${img.url}" style="width:100%;max-width:600px;border-radius:8px;" />`,
          plainText: img.prompt
        },
        whatsapp: {
          headline: img.prompt.substring(0, 50),
          formattedMessage: `*${img.prompt.substring(0, 50)}*\n\n${img.prompt}\n\nMás info: ${ECOM_BRAND.storeUrl}`,
          callToAction: "Ver Equipamiento",
          targetUrl: ECOM_BRAND.storeUrl
        },
        linkedin: {
          hook: `🚀 ${img.prompt.substring(0, 80)}...`,
          body: img.prompt,
          takeaways: ["Fiabilidad empresarial", "Despliegue ágil"],
          callToAction: "Consulta disponibilidad y cotización B2B.",
          hashtags: ["#Networking", "#Wifi7", "#B2B"],
          fullPostText: `🚀 ${img.prompt.substring(0, 80)}...\n\n${img.prompt}\n\n[📸 Visual: ${img.url}]\n\n#Networking #B2B`
        }
      };
      setContent(initialContent);
      setTopicTitle(img.prompt.substring(0, 60));
      setMainView("generator");
      setActiveTab("blog");
      return;
    }

    const currentHtml = content.blog?.htmlContent || "";
    const updatedHtml = mode === "hero" ? figureHtml + currentHtml : currentHtml + "\n" + figureHtml;

    setContent({
      ...content,
      blog: {
        ...content.blog,
        htmlContent: updatedHtml
      }
    });

    setMainView("generator");
    setActiveTab("blog");
  };

  const handleReuseInLinkedIn = (img: { url: string; prompt: string }) => {
    if (!content) {
      handleInsertImageIntoArticle(img, "hero");
      setActiveTab("linkedin");
      return;
    }

    const currentLinkedin = content.linkedin || {
      hook: `🚀 ${img.prompt.substring(0, 80)}...`,
      body: img.prompt,
      takeaways: ["Rendimiento B2B"],
      callToAction: "Contáctanos.",
      hashtags: ["#Networking"],
      fullPostText: ""
    };

    const visualNote = `\n\n[📸 Activo Visual: ${img.url}]`;
    const updatedFullPost = currentLinkedin.fullPostText
      ? (currentLinkedin.fullPostText.includes(img.url) ? currentLinkedin.fullPostText : currentLinkedin.fullPostText + visualNote)
      : `🚀 ${img.prompt.substring(0, 80)}...\n\n${img.prompt}${visualNote}\n\n#B2B #Networking`;

    setContent({
      ...content,
      linkedin: {
        ...currentLinkedin,
        fullPostText: updatedFullPost
      }
    });

    setMainView("generator");
    setActiveTab("linkedin");
  };

  const handleReuseImageInCampaign = (image: ImageDetailItem, channel: "linkedin" | "newsletter") => {
    if (channel === "linkedin") {
      handleReuseInLinkedIn(image);
    } else {
      if (content?.mailchimp) {
        const currentHtml = content.mailchimp.newsletterHtml || "";
        const imgBanner = `<div style="margin:20px 0;text-align:center;"><img src="${image.url}" alt="${image.prompt}" style="width:100%;max-width:580px;border-radius:8px;display:block;margin:0 auto;" /></div>`;
        setContent({
          ...content,
          mailchimp: {
            ...content.mailchimp,
            newsletterHtml: currentHtml + imgBanner
          }
        });
      }
      setMainView("generator");
      setActiveTab("mailchimp");
    }
  };

  const handleClearAllImages = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar TODAS las imágenes generadas del historial? Esta acción no se puede deshacer.")) return;
    try {
      await clearAllImagesFromIndexedDB();
      try {
        await apiFetch("/api/assets?clearAll=true", { method: "DELETE" });
      } catch {
        // Silencioso si no está en backend
      }
      setGeneratedImagesList([]);
      setSelectedImageIds([]);
      try { localStorage.removeItem("ecomshop_generated_images"); } catch {}
      setSelectedImageForDetail(null);
    } catch (err) {
      console.error("Error al limpiar historial de imágenes:", err);
    }
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

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono tracking-widest uppercase text-slate-400">Verificando sesión corporativa...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <CorporateSignIn
        onSuccess={(user) => {
          setCurrentUser(user as any);
        }}
      />
    );
  }

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
        <div className="flex-1 p-6 sm:p-8 max-w-[1780px] 2xl:max-w-[1920px] mx-auto w-full">
          <MultimodalAdvisor
            apiKey={geminiApiKey}
            onApplyRecommendation={handleApplyMultimodalRecommendation}
            onLaunchJuniaEngine={(rec) => {
              handleApplyMultimodalRecommendation(rec);
              handleOpenJuniaEngine(rec.title, rec.category);
            }}
            onRecordFinops={addFinopsRecord}
          />
        </div>
      )}

      {mainView === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 min-h-[calc(100vh-4rem)] max-w-[1920px] mx-auto w-full">
          {/* ========================================================================= */}
          {/* PANEL IZQUIERDO: EL HUB DE ENTRADA (35% Ancho / 4 Columnas en Desktop)     */}
          {/* ========================================================================= */}
          <aside className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4">
            {/* 1. Selector de Origen de Campaña (Tabs Superiores) */}
            <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 text-xs shadow-md">
              <button
                type="button"
                onClick={() => setEntryOrigin("radar")}
                className={`flex-1 py-2 px-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  entryOrigin === "radar"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
                <span className="truncate">Radar Oportunidades</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryOrigin("url")}
                className={`flex-1 py-2 px-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  entryOrigin === "url"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span className="truncate">URL EcomShop</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryOrigin("topic")}
                className={`flex-1 py-2 px-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  entryOrigin === "topic"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate">Línea / Libre</span>
              </button>
            </div>

            {/* 2. Contenido según el Tab seleccionado */}
            {/* TAB A: RADAR OPORTUNIDADES */}
            {entryOrigin === "radar" && (
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 text-white shadow-lg flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Oportunidades Product Brain
                    </span>
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                      Autopilot
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRegenerateRadar}
                    disabled={isRegeneratingRadar || loadingOpportunities}
                    title="Ver otras oportunidades del catálogo"
                    className="text-[11px] text-indigo-300 hover:text-white bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRegeneratingRadar ? "animate-spin" : ""}`} />
                    <span>{isRegeneratingRadar ? "Cargando..." : "Ver otras"}</span>
                  </button>
                </div>

                {/* Filtro de Objetivo */}
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-400 font-semibold shrink-0">Objetivo:</label>
                  <select
                    value={selectedBusinessGoal}
                    onChange={(e) => {
                      const goal = e.target.value as BusinessGoal;
                      setSelectedBusinessGoal(goal);
                      loadOpportunities(editorialControls, excludedSkus, undefined, undefined, goal);
                    }}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="ALL_OPPORTUNITIES">⚡ Todas las Oportunidades</option>
                    <option value="WIFI7_MULTIGIG_EXPANSION">🚀 Expansión Wi-Fi 7 & Multi-Gig</option>
                    <option value="HOSPITALITY_SOLUTIONS">🏨 Soluciones Hospitality & Hoteles</option>
                    <option value="SWITCHING_POE_BACKBONE">🔌 Switching PoE & Backbone</option>
                    <option value="STOCK_CLEARANCE_PROMO">📦 Liquidación & Alta Rotación</option>
                  </select>
                </div>

                {/* 3 Tarjetas de Oportunidad Compactas */}
                <div className="flex flex-col gap-2.5 mt-1">
                  {opportunities.map((opp, idx) => {
                    const isSelected = selectedRadarOppId === opp.id;
                    const score = opp.scores.totalScore;

                    return (
                      <div
                        key={opp.id}
                        onClick={() => {
                          setSelectedRadarOppId(opp.id);
                          handleSelectOpportunity(opp);
                        }}
                        className={`cursor-pointer rounded-xl p-3.5 border transition-all duration-200 flex flex-col gap-2 ${
                          isSelected
                            ? "bg-slate-900 border-blue-500 ring-2 ring-blue-500/50 shadow-md"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                        }`}
                      >
                        {/* Cabecera Tarjeta: SKU, Ángulo y Score */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-indigo-950 text-indigo-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-indigo-800/80">
                              #{idx + 1} {opp.sku}
                            </span>
                            <span className="text-[10px] font-semibold uppercase text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                              {opp.recommendedAngle}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isSelected && (
                              <span className="text-[10px] text-blue-400 font-bold bg-blue-950/70 border border-blue-800/60 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> Seleccionada
                              </span>
                            )}
                            <div className="flex items-center gap-1 text-amber-400 font-mono text-xs font-bold">
                              <Zap className="w-3 h-3 fill-amber-400" />
                              <span>{score}</span>
                            </div>
                          </div>
                        </div>

                        {/* Título de Campaña y Target */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-100 line-clamp-1 leading-snug">
                            {opp.actionTitle}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Target: <strong className="text-slate-200">{opp.targetSegment}</strong>
                          </p>
                        </div>

                        {/* Bundle y Pitch en 2 líneas */}
                        <div className="bg-slate-950/60 rounded p-2 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
                          {opp.suggestedBundle ? (
                            <div className="truncate">
                              <span className="text-indigo-300 font-semibold">Bundle:</span> + {opp.suggestedBundle.accessorySku} ({opp.suggestedBundle.accessoryName})
                            </div>
                          ) : (
                            <div className="truncate">
                              <span className="text-sky-300 font-semibold">Pitch:</span> {opp.narrativeAnchor?.pitch30s || "Enfoque Enterprise 10G"}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB B: URL EcomShop */}
            {entryOrigin === "url" && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 flex flex-col gap-3.5 shadow-xs">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">
                    URL de Producto en EcomShop.es
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Pega el enlace de la tienda para extraer fichas técnicas y modelos en vivo:
                  </p>
                  <input
                    type="text"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://www.ecomshop.es/..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                  />
                </div>

                {/* Ejemplos rápidos */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                    Ejemplos Rápidos:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProductUrl("https://www.ecomshop.es/engenius-ecw536");
                        setTopicTitle("EnGenius ECW536 Cloud WiFi 7 AP");
                        setCategory("engenius");
                        setCustomAngle("ROI");
                      }}
                      className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded shadow-2xs font-medium transition"
                    >
                      ⚡ ECW536 WiFi 7
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductUrl("https://www.ecomshop.es/engenius-ecs1528fp");
                        setTopicTitle("Switch EnGenius ECS1528FP Cloud PoE+");
                        setCategory("switches");
                        setCustomAngle("PERFORMANCE");
                      }}
                      className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded shadow-2xs font-medium transition"
                    >
                      ⚡ ECS1528FP PoE+
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductUrl("https://www.ecomshop.es/engenius-esg510");
                        setTopicTitle("Gateway EnGenius ESG510 Cloud Security 2.5G");
                        setCategory("engenius");
                        setCustomAngle("OPERATIONS");
                      }}
                      className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded shadow-2xs font-medium transition"
                    >
                      ⚡ Gateway ESG510
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Público Objetivo</label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800 font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800 font-medium"
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

            {/* TAB C: Línea / Tema Libre */}
            {entryOrigin === "topic" && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 flex flex-col gap-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900">
                    Líneas Editoriales & Tema Libre
                  </span>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px]">
                    <button
                      type="button"
                      onClick={() => setInputMode("ecomshop_url")}
                      className={`px-2 py-0.5 rounded font-medium transition ${
                        inputMode === "ecomshop_url" ? "bg-white text-indigo-700 shadow-2xs font-bold" : "text-slate-600"
                      }`}
                    >
                      Sugeridas
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("prompt_libre")}
                      className={`px-2 py-0.5 rounded font-medium transition ${
                        inputMode === "prompt_libre" ? "bg-white text-indigo-700 shadow-2xs font-bold" : "text-slate-600"
                      }`}
                    >
                      Texto Libre
                    </button>
                  </div>
                </div>

                {inputMode === "ecomshop_url" ? (
                  <SuggestedTopics
                    selectedTopicId={selectedPresetId}
                    onSelectTopic={handleSelectEditorialTopic}
                    geminiApiKey={geminiApiKey || undefined}
                  />
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Título o Tesis de la Campaña:
                      </label>
                      <textarea
                        rows={3}
                        value={topicTitle}
                        onChange={(e) => setTopicTitle(e.target.value)}
                        placeholder="Ej: Despliegue de red Wi-Fi 7 y PoE++ en oficinas corporativas sin licencias recurrentes..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Categoría</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800"
                        >
                          <option value="engenius">EnGenius Networks</option>
                          <option value="wifi">WiFi Profesional / WiFi 7</option>
                          <option value="switches">Switches & PoE</option>
                          <option value="fibra">Fibra Óptica</option>
                          <option value="general">Networking General</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Público</label>
                        <input
                          type="text"
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Acordeón Colapsable "⚙️ Ajustes Editoriales Avanzados" */}
            <details className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs group">
              <summary className="p-3.5 flex items-center justify-between text-xs font-bold text-slate-200 cursor-pointer hover:bg-slate-800/60 transition list-none select-none">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <span>⚙️ Ajustes Editoriales Avanzados</span>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    ({editorialControls.targetSector.replace("_", " ")} &bull; {editorialControls.competitorFocus})
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
              </summary>
              <div className="p-3 border-t border-slate-800 bg-slate-950/40">
                <EditorialControlsBar
                  controls={editorialControls}
                  onChange={setEditorialControls}
                  onApplyToRadar={handleRegenerateRadar}
                  isApplying={isRegeneratingRadar}
                  embedded={true}
                />
              </div>
            </details>

            {/* 4. Botón Único de Acción Principal (Sticky al pie del panel izquierdo) */}
            <div className="sticky bottom-4 z-20 bg-slate-950/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-2xl space-y-2 mt-auto">
              <button
                type="button"
                onClick={handleUnifiedLaunch}
                disabled={loading || (campaignStage !== "IDLE" && campaignStage !== "COMPLETED" && campaignStage !== "ERROR")}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
              >
                {loading || (campaignStage !== "IDLE" && campaignStage !== "COMPLETED" && campaignStage !== "ERROR") ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generando Campaña en Directo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>🚀 Generar Campaña Multicanal</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOpenJuniaEngine()}
                disabled={isGeneratingOutline || loading}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition"
              >
                {isGeneratingOutline ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-200 rounded-full animate-spin" />
                    <span>Creando Outline Técnico...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>📋 Planificar Outline (The Junia Engine)</span>
                  </>
                )}
              </button>
            </div>
          </aside>

          {/* ========================================================================= */}
          {/* PANEL DERECHO: EL CANVAS DE RESULTADOS (65% Ancho / 8 Columnas)            */}
          {/* ========================================================================= */}
          <main className="lg:col-span-8 xl:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col min-h-[calc(100vh-6rem)] shadow-sm overflow-hidden">
            {/* ESTADO 1: VACÍO (IDLE) */}
            {campaignStage === "IDLE" && !content && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10 text-slate-300">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-5 shadow-lg shadow-indigo-950/50">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Lienzo de Trabajo Activo • Marketing Copilot B2B</span>
                </div>

                <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-white tracking-tight max-w-xl mb-3">
                  Generador Multicanal Fundamentado con NotebookLM
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
                  Selecciona una oportunidad a la izquierda o introduce una URL para desplegar la campaña completa.
                </p>

                {/* 3 Pasos Visuales del Motor Editorial */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8 text-left">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-mono font-bold text-xs flex items-center justify-center border border-sky-500/30">
                      01
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Selección o URL
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Elige una oportunidad algorítmica del radar o pega la URL de un equipo de ecomshop.es a la izquierda.
                    </p>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                      02
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Grounding Oficial
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      NotebookLM extrae fichas técnicas EnGenius (Wi-Fi 7, PoE+, 10G) y audita compatibilidades en tiempo real.
                    </p>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                      03
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Despliegue Omnicanal
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Revisa y copia con 1 clic los 4 formatos calibrados con directivas comerciales y fotos recomendadas.
                    </p>
                  </div>
                </div>

                {/* Tarjetas de Acceso Rápido de Prueba */}
                <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-5 max-w-2xl w-full text-left space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Probar con equipos estrella (1-clic):</span>
                    <span className="text-[11px] font-mono text-emerald-400">● 100% Cero Licencias</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProductUrl("https://www.ecomshop.es/engenius-ecw536");
                        setTopicTitle("EnGenius ECW536 Cloud WiFi 7 AP");
                        setCategory("engenius");
                        setCustomAngle("ROI");
                        handleGenerate();
                      }}
                      className="p-3 bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-sky-500/60 rounded-lg text-left transition group space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-400 group-hover:text-sky-300">ECW536</span>
                        <Zap className="w-3 h-3 text-amber-400" />
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium">Wi-Fi 7 Enterprise 4x4</p>
                      <span className="text-[10px] text-slate-500 block">Probar campaña &rarr;</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProductUrl("https://www.ecomshop.es/engenius-ecs1528fp");
                        setTopicTitle("Switch EnGenius ECS1528FP Cloud PoE+");
                        setCategory("switches");
                        setCustomAngle("PERFORMANCE");
                        handleGenerate();
                      }}
                      className="p-3 bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-indigo-500/60 rounded-lg text-left transition group space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300">ECS1528FP</span>
                        <Zap className="w-3 h-3 text-amber-400" />
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium">Switch 24p PoE+ 410W</p>
                      <span className="text-[10px] text-slate-500 block">Probar campaña &rarr;</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProductUrl("https://www.ecomshop.es/engenius-esg510");
                        setTopicTitle("Gateway EnGenius ESG510 Cloud Security 2.5G");
                        setCategory("engenius");
                        setCustomAngle("OPERATIONS");
                        handleGenerate();
                      }}
                      className="p-3 bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500/60 rounded-lg text-left transition group space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">ESG510</span>
                        <Zap className="w-3 h-3 text-amber-400" />
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium">Gateway 2.5G Security</p>
                      <span className="text-[10px] text-slate-500 block">Probar campaña &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ESTADO 2: PROGRESO EN VIVO (GENERATING / STEPPER) */}
            {campaignStage !== "IDLE" && campaignStage !== "COMPLETED" && (
              <div className="flex-1 flex flex-col justify-center p-6 sm:p-10">
                <div className="max-w-2xl mx-auto w-full space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-2 animate-bounce">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      Pipeline de Campaña en Ejecución
                    </h3>
                    <p className="text-xs text-slate-400">
                      Extrayendo datos de EcomShop, cotejando con Master NotebookLM y aplicando Quality Gate:
                    </p>
                  </div>

                  <CampaignStepper
                    currentStage={campaignStage}
                    errorMessage={campaignErrorMessage}
                    onRetry={handleUnifiedLaunch}
                    activeSku={campaignOpportunity?.sku || "SKU EcomShop"}
                    activeAngle={campaignOpportunity?.recommendedAngle || customAngle}
                  />

                  {campaignErrorMessage && (
                    <div className="p-4 bg-rose-950/60 border border-rose-500/50 rounded-xl text-center space-y-3">
                      <p className="text-xs text-rose-200 font-medium">{campaignErrorMessage}</p>
                      <button
                        type="button"
                        onClick={handleUnifiedLaunch}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition"
                      >
                        Reintentar Generación
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ESTADO 3: WORKSPACE DE CONTENIDOS (COMPLETED) */}
            {content && (campaignStage === "COMPLETED" || campaignStage === "IDLE") && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Cabecera del Workspace de Contenidos */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-emerald-950 text-emerald-300 text-xs px-2.5 py-0.5 rounded font-bold border border-emerald-800 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Quality Gate: 95/100
                      </span>
                      {campaignOpportunity?.sku && (
                        <span className="bg-slate-800 text-sky-400 text-xs px-2 py-0.5 rounded font-mono border border-slate-700">
                          SKU: {campaignOpportunity.sku}
                        </span>
                      )}
                      <span className="bg-indigo-950 text-indigo-300 text-xs px-2 py-0.5 rounded font-mono border border-indigo-800">
                        {category.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white line-clamp-1">
                      {content.blog?.title || topicTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setCampaignStage("IDLE");
                        setContent(null);
                        setCampaignOpportunity(null);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Nueva Campaña</span>
                    </button>
                  </div>
                </div>

                {/* Veto del EvidenceEngine si hubo ajustes */}
                {content.evidenceEngineAdjustments && content.evidenceEngineAdjustments.length > 0 && (
                  <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3.5 mb-4 text-xs flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-amber-300 block">
                        🛡️ Ajustes aplicados por Veto Absoluto del EvidenceEngine:
                      </span>
                      {content.evidenceEngineAdjustments.map((adj, i) => (
                        <p key={i} className="text-amber-200 text-[11px]">
                          <strong>{adj.corrected}</strong>: {adj.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selector de Pestañas Horizontales */}
                <div className="bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 flex items-center gap-1 text-xs mb-4 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setCanvasActiveTab("blog")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition shrink-0 ${
                      canvasActiveTab === "blog"
                        ? "bg-sky-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-300" />
                    <span>📝 Blog Técnico SEO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCanvasActiveTab("linkedin")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition shrink-0 ${
                      canvasActiveTab === "linkedin"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-300" />
                    <span>💼 LinkedIn B2B</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCanvasActiveTab("mailchimp")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition shrink-0 ${
                      canvasActiveTab === "mailchimp"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-300" />
                    <span>📧 Mailchimp HTML</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCanvasActiveTab("whatsapp")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition shrink-0 ${
                      canvasActiveTab === "whatsapp"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                    <span>💬 WhatsApp Comercial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCanvasActiveTab("intel")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition shrink-0 ${
                      canvasActiveTab === "intel"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                    <span>🔍 Evidencias Auditadas</span>
                  </button>
                </div>

                {/* Toast de Guardado Exitoso */}
                {saveSuccessMessage && (
                  <div className="mb-3 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fadeIn">
                    <span>{saveSuccessMessage}</span>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                )}

                {/* Contenido de Cada Pestaña */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {/* PESTAÑA 1: BLOG TÉCNICO SEO */}
                  {canvasActiveTab === "blog" && (
                    <div className="space-y-4">
                      {/* Barra de Acciones Superior */}
                      <div className="flex flex-wrap items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 gap-3">
                        <div className="text-xs text-slate-400">
                          Slug: <code className="text-sky-400 font-mono">/{content.blog?.slug}</code> &bull; Lectura: <strong className="text-white">{content.blog?.readingTimeMinutes} min</strong>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(content.blog?.htmlContent || "", "blog-html")}
                            className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                          >
                            {copiedKey === "blog-html" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === "blog-html" ? "¡Copiado!" : "📋 Copiar al Portapapeles"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveToFirestore("approved")}
                            disabled={isSavingArticle}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
                          >
                            <Save className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isSavingArticle ? "Guardando..." : "💾 Guardar / Aprobar en Firestore"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Guía de Fotos para Imagen 3 */}
                      {content.blog?.editorialLayout?.photoPlacements && content.blog.editorialLayout.photoPlacements.length > 0 && (
                        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5" /> Fotos Sugeridas para Imagen 3 & Durable CMS
                            </span>
                            <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded font-mono border border-purple-800">
                              {content.blog.editorialLayout.photoPlacements.length} Prompts
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {content.blog.editorialLayout.photoPlacements.map((photo, i) => (
                              <div key={i} className="bg-slate-900 rounded-lg p-3 border border-slate-800 flex flex-col justify-between gap-2">
                                <p className="text-xs text-slate-300 font-medium line-clamp-2">
                                  {photo.description}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImagePrompt(photo.imagen3Prompt);
                                    setMainView("image_studio");
                                  }}
                                  className="w-full text-center bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[11px] font-bold py-1 px-2 rounded transition border border-purple-700/60"
                                >
                                  🎨 Generar en Estudio Imagen 3 &rarr;
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Visor HTML Renderizado */}
                      <div className="bg-white rounded-xl p-6 text-slate-900 shadow-md border border-slate-200">
                        <div
                          className="prose max-w-none text-sm font-sans leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: content.blog?.htmlContent || "" }}
                        />
                      </div>
                    </div>
                  )}

                  {/* PESTAÑA 2: LINKEDIN B2B */}
                  {canvasActiveTab === "linkedin" && (
                    <div className="space-y-4 max-w-2xl mx-auto">
                      <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                          Post con Gancho y Valor Técnico
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(content.linkedin?.fullPostText || "", "li-post")}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                          >
                            {copiedKey === "li-post" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === "li-post" ? "¡Copiado!" : "📋 Copiar al Portapapeles"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveToFirestore("approved")}
                            disabled={isSavingArticle}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
                          >
                            <Save className="w-3.5 h-3.5 text-emerald-400" />
                            <span>💾 Guardar</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 text-slate-200 text-xs leading-relaxed whitespace-pre-line font-sans shadow-md">
                        {content.linkedin?.fullPostText}
                      </div>
                    </div>
                  )}

                  {/* PESTAÑA 3: MAILCHIMP HTML */}
                  {canvasActiveTab === "mailchimp" && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 gap-3">
                        <div className="text-xs text-amber-300 font-medium">
                          Preheader: <span className="text-slate-300">{content.mailchimp?.previewText}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(content.mailchimp?.newsletterHtml || "", "mailchimp-html")}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                          >
                            {copiedKey === "mailchimp-html" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === "mailchimp-html" ? "¡Copiado!" : "📋 Copiar Template HTML"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveToFirestore("approved")}
                            disabled={isSavingArticle}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
                          >
                            <Save className="w-3.5 h-3.5 text-emerald-400" />
                            <span>💾 Guardar</span>
                          </button>
                        </div>
                      </div>

                      {/* Variantes A/B */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                          <span className="text-amber-400 font-bold block mb-1">Asunto Variante A:</span>
                          <p className="text-slate-200">{content.mailchimp?.subjectA}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                          <span className="text-amber-400 font-bold block mb-1">Asunto Variante B:</span>
                          <p className="text-slate-200">{content.mailchimp?.subjectB}</p>
                        </div>
                      </div>

                      {/* Vista previa newsletter */}
                      <div className="bg-white rounded-xl p-6 text-slate-900 shadow-md border border-slate-200">
                        <div
                          className="prose max-w-none text-sm font-sans"
                          dangerouslySetInnerHTML={{ __html: content.mailchimp?.newsletterHtml || "" }}
                        />
                      </div>
                    </div>
                  )}

                  {/* PESTAÑA 4: WHATSAPP COMERCIAL */}
                  {canvasActiveTab === "whatsapp" && (
                    <div className="space-y-4 max-w-lg mx-auto">
                      <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                          Formato Móvil con Emojis
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(content.whatsapp?.formattedMessage || "", "wa-msg")}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                          >
                            {copiedKey === "wa-msg" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === "wa-msg" ? "¡Copiado!" : "📋 Copiar al Portapapeles"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveToFirestore("approved")}
                            disabled={isSavingArticle}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
                          >
                            <Save className="w-3.5 h-3.5 text-emerald-400" />
                            <span>💾 Guardar</span>
                          </button>
                        </div>
                      </div>

                      {/* Bocadillo de WhatsApp */}
                      <div className="bg-[#0b141a] p-5 rounded-2xl border border-emerald-950/60 shadow-xl">
                        <div className="bg-[#202c33] text-[#e9edef] p-4 rounded-xl text-xs leading-relaxed whitespace-pre-line border-l-4 border-emerald-500 font-sans">
                          {content.whatsapp?.formattedMessage}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PESTAÑA 5: EVIDENCIAS AUDITADAS */}
                  {canvasActiveTab === "intel" && (
                    <div className="space-y-4">
                      {intelligenceCard ? (
                        <>
                          <ProductIntelligenceView card={intelligenceCard} />
                          <EvidenceAuditDrawer
                            score={95}
                            evidenceLedger={intelligenceCard.evidenceLedger}
                            productName={intelligenceCard.product?.model || "EnGenius"}
                          />
                        </>
                      ) : (
                        <div className="p-8 text-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                          <ShieldCheck className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                          <p className="text-xs">Ficha de inteligencia generada con validación de catálogo EnGenius.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* VISTA 2: HISTORIAL Y ESTADOS */}
      {mainView === "history" && (
        <div className="flex-1 max-w-[1780px] 2xl:max-w-[1920px] mx-auto w-full p-6 sm:p-8 flex flex-col gap-6">
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
              {historyItems.length > 0 && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={
                      historyItems.length > 0 &&
                      historyItems.every(item => selectedArticleIds.includes(item.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedArticleIds(historyItems.map(item => item.id));
                      } else {
                        setSelectedArticleIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <span>Seleccionar todos</span>
                </label>
              )}
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
                .filter(item => {
                  if (!item) return false;
                  const query = (searchHistory || "").toLowerCase();
                  const title = String(item.title || "").toLowerCase();
                  const cat = String(item.category || "").toLowerCase();
                  return title.includes(query) || cat.includes(query);
                })
                .map((item, idx) => {
                  const itemId = item?.id || `hist-item-${idx}`;
                  const itemTitle = item?.title || "Artículo sin título";
                  const itemCat = String(item?.category || "GEN");
                  const itemDate = item?.createdAt || "Fecha no disponible";
                  const itemSlug = item?.content?.blog?.slug || "general";
                  const itemStatus = item?.status || "draft";
                  const isSelected = selectedArticleIds.includes(itemId);

                  return (
                    <div
                      key={itemId}
                      className={`bg-white border rounded-xl p-4 flex items-center justify-between hover:shadow-2xs transition ${
                        isSelected ? "border-indigo-500 ring-1 ring-indigo-500/30 bg-indigo-50/20" : "border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedArticleIds(prev => [...prev, itemId]);
                            } else {
                              setSelectedArticleIds(prev => prev.filter(id => id !== itemId));
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0"
                          title="Seleccionar para acción masiva"
                        />
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs uppercase text-slate-800 border border-slate-200 shrink-0">
                          {itemCat.substring(0, 3)}
                        </div>
                        <div>
                          <h4
                            className="text-sm font-bold text-slate-900 hover:text-sky-600 cursor-pointer font-editorial"
                            onClick={() => setSelectedDocumentForDetail(item)}
                            title="Clic para ver detalle del documento"
                          >
                            {itemTitle}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span>Fecha: {itemDate}</span>
                            <span>&bull;</span>
                            <span>Slug: /{itemSlug}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Selector de Estado */}
                        <select
                          value={itemStatus}
                          onChange={(e) => updateArticleStatus(itemId, e.target.value as any)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold focus:outline-none ${
                            itemStatus === "published"
                              ? "bg-purple-50 border-purple-200 text-purple-800"
                              : itemStatus === "approved"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : itemStatus === "reviewed"
                              ? "bg-sky-50 border-sky-200 text-sky-800"
                              : "bg-amber-50 border-amber-200 text-amber-800"
                          }`}
                        >
                          <option value="draft">🟡 Borrador</option>
                          <option value="reviewed">🔵 Revisado</option>
                          <option value="approved">🟢 Aprobado</option>
                          <option value="published">🟣 Publicado</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setSelectedDocumentForDetail(item)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition border border-indigo-200 font-semibold"
                          title="Inspeccionar documento en detalle (HTML, Markdown, Metadatos)"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">Ver Documento</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (item?.content) {
                              setContent(item.content);
                              setTopicTitle(itemTitle);
                              setCategory((item?.category as any) || "general");
                              setMainView("generator");
                            }
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition border border-slate-200 font-medium"
                          title="Cargar en el lienzo de edición"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-600" />
                          <span className="hidden md:inline">Cargar en Editor</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteArticle(itemId)}
                          className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-400 hover:text-rose-600 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition shadow-2xs"
                          title="Eliminar este artículo del archivo"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span className="hidden lg:inline">Borrar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: ESTUDIO DE IMÁGENES (IMAGEN 3 & GALERÍA RESPONSIVA) */}
      {mainView === "image_studio" && (
        <ImageStudioView
          images={generatedImagesList}
          selectedImageIds={selectedImageIds}
          onSelectImage={(id, selected) => {
            if (selected) {
              setSelectedImageIds((prev) => [...prev, id]);
            } else {
              setSelectedImageIds((prev) => prev.filter((itemId) => itemId !== id));
            }
          }}
          onSelectAll={(all) => {
            if (all) {
              setSelectedImageIds(generatedImagesList.map((img) => img.id));
            } else {
              setSelectedImageIds([]);
            }
          }}
          onClearAll={handleClearAllImages}
          onRefreshDatabase={loadDatabaseAssets}
          loadingDatabaseAssets={loadingDatabaseAssets}
          onOpenLightbox={(img) => setSelectedImageForDetail(img)}
          onDeleteImage={handleDeleteImage}
          onApplyToCampaignBlog={(img) => handleInsertImageIntoArticle(img, "body")}
          onUseAsBase={(url) => {
            setImageBase(url);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onReuseInLinkedIn={handleReuseInLinkedIn}
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
          onRefinePrompt={handleRefinePrompt}
          onApplyRefinedPrompt={handleApplyRefinedPrompt}
          onApplyAndGenerateRefinedPrompt={handleApplyAndGenerateRefinedPrompt}
          onDismissRefinement={() => setPromptRefinement(null)}
          presetTemplates={presetTemplates}
          onVarySingleTemplate={handleVarySingleTemplate}
          varyingTemplateId={varyingTemplateId}
          isRegeneratingTemplates={isRegeneratingTemplates}
          onRegenerateAllTemplates={handleRegenerateAllTemplates}
          onRestoreDefaultTemplates={handleRestoreDefaultTemplates}
          onUseRealProductPhoto={handleUseRealProductPhoto}
        />
      )}

      {/* VISTA 4: MONITOR FINOPS & VALORACIÓN DE COSTES */}
      {mainView === "finops" && (
        <div className="flex-1 max-w-[1780px] 2xl:max-w-[1920px] mx-auto w-full p-6 sm:p-8 flex flex-col gap-6">
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

      {/* Barra Flotante de Acciones Masivas (Artículos en Archivo) */}
      {mainView === "history" && selectedArticleIds.length > 0 && (
        <BulkActionToolbar
          selectedCount={selectedArticleIds.length}
          itemType="documents"
          onClearSelection={() => setSelectedArticleIds([])}
          onBulkDelete={handleBulkDeleteArticles}
          isDeleting={isBulkDeletingArticles}
        />
      )}

      {/* Barra Flotante de Acciones Masivas (Imágenes en Galería) */}
      {mainView === "image_studio" && selectedImageIds.length > 0 && (
        <BulkActionToolbar
          selectedCount={selectedImageIds.length}
          itemType="images"
          onClearSelection={() => setSelectedImageIds([])}
          onBulkDelete={handleBulkDeleteImages}
          isDeleting={isBulkDeletingImages}
        />
      )}

      {/* Modal de Detalle Completo de Documento */}
      <DocumentDetailModal
        document={selectedDocumentForDetail}
        onClose={() => setSelectedDocumentForDetail(null)}
        onLoadInEditor={(doc) => {
          if (doc?.content) {
            setContent(doc.content);
            setTopicTitle(doc.title);
            setCategory((doc.category as any) || "general");
            setMainView("generator");
          }
        }}
        onDelete={handleDeleteArticle}
      />

      {/* Modal de Detalle y Zoom de Imagen */}
      <ImageDetailModal
        image={selectedImageForDetail}
        onClose={() => setSelectedImageForDetail(null)}
        onUseAsBase={(url) => {
          setImageBase(url);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onDelete={handleDeleteImage}
        onInsertIntoArticle={handleInsertImageIntoArticle}
        onReuseInCampaign={handleReuseImageInCampaign}
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
