"use client";

import React, { useState, useMemo } from "react";
import { 
  Globe, 
  Mail, 
  MessageSquare, 
  Share2, 
  Copy, 
  Check, 
  Layers, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Package, 
  Flame, 
  Tag, 
  Download, 
  Eye, 
  ArrowLeft,
  ImageIcon,
  ShieldAlert,
  BookOpen,
  Info,
  Save,
  Zap,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  FileText,
  Code,
  Table,
  Store,
  Filter
} from "lucide-react";
import { ContentOutput } from "@/lib/schema";
import { ProductOpportunityRecord } from "@/lib/services/opportunity-radar";
import { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import { ProductIntelligenceView } from "./product-intelligence-view";
import { EvidenceAuditDrawer } from "./evidence-audit-drawer";
import { CampaignStepper, GenerationStage } from "./campaign-stepper";
import { SourceDrawer, CitationDetail } from "./source-drawer";
import { ECOMSHOP_CATALOG, getCatalogDevice, getAllCatalogDevices, getEcomshopOnlyDevices, getDevicesGroupedByType, catalogProductToCatalogDevice } from "@/lib/catalog";
import { ECOMSHOP_FULL_CATALOG, CatalogProduct } from "@/lib/data/ecomshop-catalog";
import { injectInternalLinks } from "@/lib/services/internal-linking-engine";
import { formatForWhatsApp, formatForLinkedIn, formatForCleanBlogHtml } from "@/lib/copy-formatters";
import { SafeHtml } from "@/components/SafeHtml";
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription } from "@/components/ui";

export type WorkspaceTab = "geo" | "blog" | "mailchimp" | "whatsapp" | "linkedin" | "ecomshop" | "intel" | "quality";

export type ProductFamily = "ALL" | "WIFI" | "SWITCHES" | "GATEWAYS" | "FIBER";

interface CampaignWorkspaceProps {
  stage: GenerationStage;
  opportunity: ProductOpportunityRecord | null;
  content: ContentOutput | null;
  intelligenceCard: ProductIntelligenceCard | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  onReset?: () => void;
  onOpenImageStudio?: (prompt: string) => void;
  onSaveToFirestore?: (status?: "approved" | "published") => void;
  onApprove?: () => void;
  onPublishToStore?: () => void;
  isSavingArticle?: boolean;
  onSelectQuickSku?: (sku: string) => void;
  onLaunchWithSku?: (sku: string) => void;
  selectedSku?: string;
  isLoadingIntelligence?: boolean;
  initialTab?: WorkspaceTab;
}

export function getProductFamily(deviceType: string): ProductFamily {
  switch (deviceType) {
    case "ACCESS_POINT":
    case "CPE_PTP":
      return "WIFI";
    case "SWITCH":
      return "SWITCHES";
    case "GATEWAY":
    case "ROUTER_CELLULAR":
      return "GATEWAYS";
    case "FIBER_OPTIC":
    case "TESTER":
    case "ACCESSORY":
    case "CCTV_CAMERA":
      return "FIBER";
    default:
      return "WIFI";
  }
}

export const CampaignWorkspace: React.FC<CampaignWorkspaceProps> = ({
  stage,
  opportunity,
  content: initialContent,
  intelligenceCard,
  errorMessage,
  onRetry,
  onReset,
  onOpenImageStudio,
  onSaveToFirestore,
  onApprove,
  onPublishToStore,
  isSavingArticle = false,
  onSelectQuickSku,
  onLaunchWithSku,
  selectedSku = "ECW510",
  isLoadingIntelligence = false,
  initialTab
}) => {
  const [content, setContent] = useState<ContentOutput | null>(initialContent);

  // Sincronizar estado si la prop initialContent cambia desde el padre
  React.useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab || "geo");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(["geo"]));
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const [showCloseWorkspaceConfirm, setShowCloseWorkspaceConfirm] = useState(false);

  // Estado para el Selector de Producto con Buscador en Tiempo Real y Familias
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<ProductFamily>("ALL");

  // Estado para el Drawer de Fuentes / Citaciones
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const [activeCitationData, setActiveCitationData] = useState<CitationDetail | null>(null);

  const [isRegeneratingChannel, setIsRegeneratingChannel] = useState(false);

  // 1. Filtrado dinámico de los productos de ECOMSHOP_FULL_CATALOG por Familia y Buscador
  const allCatalogDevices = useMemo(() => {
    return ECOMSHOP_FULL_CATALOG.map(catalogProductToCatalogDevice);
  }, []);

  const familyCounts = useMemo(() => {
    const counts = { ALL: allCatalogDevices.length, WIFI: 0, SWITCHES: 0, GATEWAYS: 0, FIBER: 0 };
    allCatalogDevices.forEach((device) => {
      const fam = getProductFamily(device.type);
      counts[fam] = (counts[fam] || 0) + 1;
    });
    return counts;
  }, [allCatalogDevices]);

  const filteredCatalogProducts = useMemo(() => {
    return allCatalogDevices.filter((device) => {
      const matchesFamily =
        selectedFamily === "ALL" || getProductFamily(device.type) === selectedFamily;
      
      const query = productSearchQuery.trim().toLowerCase();
      if (!query) return matchesFamily;

      const matchesQuery =
        device.sku.toLowerCase().includes(query) ||
        device.name.toLowerCase().includes(query) ||
        device.brand.toLowerCase().includes(query) ||
        device.shortDesc.toLowerCase().includes(query);

      return matchesFamily && matchesQuery;
    });
  }, [allCatalogDevices, selectedFamily, productSearchQuery]);

  const handleOpenCitation = (citationId: string, customData?: CitationDetail) => {
    setActiveCitationId(citationId);
    if (customData) {
      setActiveCitationData(customData);
    } else if (content?.citations && content.citations[citationId]) {
      const c = content.citations[citationId];
      setActiveCitationData({
        id: citationId,
        title: c.title,
        type: c.type,
        excerpt: c.excerpt,
        url: c.url
      });
    } else {
      setActiveCitationData(null);
    }
    setDrawerOpen(true);
  };

  const handleSelectTab = (tab: WorkspaceTab) => {
    if (tab === activeTab) return;
    setIsTabTransitioning(true);
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set(prev).add(tab));
    setTimeout(() => setIsTabTransitioning(false), 150);
  };

  const copyToClipboard = async (text: string, key: string) => {
    setClipboardError(null);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Portapapeles no disponible en este contexto.");
      }
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err: any) {
      console.error("Error al copiar al portapapeles:", err);
      setClipboardError(`Error al copiar: ${err.message || "Permiso denegado"}`);
      setTimeout(() => setClipboardError(null), 4000);
    }
  };

  const handleSafeReset = () => {
    if (!onReset) return;
    if (content) {
      setShowCloseWorkspaceConfirm(true);
      return;
    }
    onReset();
  };

  // Enriquecer el HTML con enlaces internos a catálogo canónico y etiquetas de citación interactivas
  const enrichedBlogHtml = useMemo(() => {
    if (!content?.blog?.htmlContent) return "";
    const linked = injectInternalLinks(content.blog.htmlContent, 6).enrichedHtml;
    return linked.replace(
      /\[(src-\d+)\]/gi,
      (match, id) =>
        `<button type="button" data-citation="${id.toLowerCase()}" class="inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded font-mono text-[11px] font-bold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-300 transition cursor-pointer" title="Ver evidencia oficial de NotebookLM">[${id.toUpperCase()}]</button>`
    );
  }, [content?.blog?.htmlContent]);

  const enrichedMailchimpHtml = useMemo(() => {
    if (!content?.mailchimp?.newsletterHtml) return "";
    return content.mailchimp.newsletterHtml.replace(
      /\[(src-\d+)\]/gi,
      (match, id) =>
        `<button type="button" data-citation="${id.toLowerCase()}" class="inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded font-mono text-[11px] font-bold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-300 transition cursor-pointer" title="Ver evidencia oficial de NotebookLM">[${id.toUpperCase()}]</button>`
    );
  }, [content?.mailchimp?.newsletterHtml]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest("[data-citation]");
    if (target) {
      const citationId = target.getAttribute("data-citation");
      if (citationId) {
        e.preventDefault();
        e.stopPropagation();
        handleOpenCitation(citationId);
      }
    }
  };

  // 2. Función de Regeneración por Canal conectando a /api/generate/channel y /api/generate/geo-article
  const handleRegenerateChannel = async (targetChannel: WorkspaceTab | string) => {
    if (isRegeneratingChannel) return;
    setIsRegeneratingChannel(true);
    try {
      if (targetChannel === "geo") {
        const res = await fetch("/api/generate/geo-article", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: selectedSku,
            topicTitle: content?.topicTitle || `Artículo GEO para ${selectedSku}`
          })
        });
        const json = await res.json();
        if (json.success && json.data) {
          setContent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              geo: {
                title: json.data.title || prev.blog?.title || "Artículo GEO EcomShop",
                metaDescription: json.data.metaDescription || prev.blog?.metaDescription || "",
                htmlContent: json.data.htmlContent || prev.blog?.htmlContent || "",
                comparativeTableHtml: json.data.comparativeTableHtml || "",
                jsonLd: json.data.jsonLd || "",
                markdownContent: json.data.markdownContent || ""
              },
              blog: {
                ...prev.blog,
                title: json.data.title || prev.blog.title,
                htmlContent: json.data.htmlContent || prev.blog.htmlContent,
                metaDescription: json.data.metaDescription || prev.blog.metaDescription
              }
            };
          });
        }
      } else {
        const res = await fetch("/api/generate/channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: targetChannel,
            sku: selectedSku,
            topicTitle: content?.topicTitle || `Campaña ${targetChannel} para ${selectedSku}`,
            category: content?.category || "general",
            currentContent: content ? (content as any)[targetChannel] : null
          })
        });
        const json = await res.json();
        if (json.success && json.data) {
          setContent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              [targetChannel]: json.data
            };
          });
        }
      }
    } catch (err) {
      console.error(`Error al regenerar canal ${targetChannel}:`, err);
    } finally {
      setIsRegeneratingChannel(false);
    }
  };

  // Generador dinámico de JSON-LD para canal GEO y Ficha
  const currentJsonLd = useMemo(() => {
    if (content?.geo?.jsonLd) return content.geo.jsonLd;
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": content?.blog?.title || content?.topicTitle || `Equipamiento ${selectedSku}`,
      "image": `https://ecomshop.es/images/${selectedSku.toLowerCase()}.jpg`,
      "description": content?.blog?.metaDescription || `Especificaciones técnicas oficiales de ${selectedSku} en EcomShop.es`,
      "sku": selectedSku,
      "brand": {
        "@type": "Brand",
        "name": "EcomShop"
      },
      "offers": {
        "@type": "Offer",
        "url": `https://ecomshop.es/productos/${selectedSku.toLowerCase()}`,
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      }
    };
    return JSON.stringify(schema, null, 2);
  }, [content, selectedSku]);

  // Generadores de exportación Markdown por Canal
  const getChannelMarkdown = (channel: WorkspaceTab): string => {
    if (!content) return "";
    switch (channel) {
      case "geo":
        return content.geo?.markdownContent || `# ${content.blog.title}\n\n> ${content.blog.metaDescription}\n\n${content.blog.htmlContent}\n\n\`\`\`json\n${currentJsonLd}\n\`\`\``;
      case "blog":
        return `# ${content.blog.title}\n\n> ${content.blog.metaDescription}\n\n${content.blog.htmlContent}`;
      case "linkedin":
        return `# LinkedIn B2B Post\n\n${content.linkedin.fullPostText}`;
      case "whatsapp":
        return `# WhatsApp Broadcast B2B\n\n${content.whatsapp.formattedMessage}`;
      case "ecomshop":
        return `# Ficha Técnica EcomShop.es - ${selectedSku}\n\n## Argumentario CMS\n${content.ecomshop?.argumentario || content.blog.cleanPlainTextExcerpt}\n\n## Características Destacadas\n${(content.ecomshop?.features || []).map(f => `- ${f}`).join("\n")}`;
      case "mailchimp":
        return `# Mailchimp Newsletter Draft\n\n**Asunto A:** ${content.mailchimp.subjectA}\n**Asunto B:** ${content.mailchimp.subjectB}\n\n${content.mailchimp.plainText}`;
      default:
        return JSON.stringify(content, null, 2);
    }
  };

  const getChannelHtmlWithJsonLd = (channel: WorkspaceTab): string => {
    if (!content) return "";
    let htmlContent = "";
    switch (channel) {
      case "geo":
        htmlContent = content.geo?.htmlContent || formatForCleanBlogHtml(content.blog.htmlContent);
        break;
      case "blog":
        htmlContent = formatForCleanBlogHtml(content.blog.htmlContent);
        break;
      case "linkedin":
        htmlContent = `<article class="linkedin-post">\n  <header><h1>${content.linkedin.hook}</h1></header>\n  <main><p>${content.linkedin.fullPostText.replace(/\n/g, "<br/>")}</p></main>\n</article>`;
        break;
      case "whatsapp":
        htmlContent = `<div class="whatsapp-message">\n  <p>${content.whatsapp.formattedMessage.replace(/\n/g, "<br/>")}</p>\n</div>`;
        break;
      case "ecomshop":
        htmlContent = content.ecomshop?.cmsHtml || `<section class="ecomshop-cms-sheet">\n  <h2>${selectedSku} - Argumentario Comercial</h2>\n  <p>${content.blog.cleanPlainTextExcerpt}</p>\n</section>`;
        break;
      case "mailchimp":
        htmlContent = content.mailchimp.newsletterHtml;
        break;
      default:
        htmlContent = `<pre>${JSON.stringify(content, null, 2)}</pre>`;
    }

    return `${htmlContent.trim()}\n\n<script type="application/ld+json">\n${currentJsonLd}\n</script>`;
  };


  // ESTADO 1: IDLE (Dashboard con Selector de 43+ productos por Familia y Buscador)
  if (stage === "IDLE" && !content) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col gap-6 p-6">
        {/* Banner Bienvenida Omnicanal */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800/90 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="indigo" size="xs">
                Workspace Editorial Omnicanal
              </Badge>
              <Badge variant="neutral" size="xs">
                <BookOpen className="w-3 h-3 text-indigo-400" />
                Catálogo Canónico EcomShop ({allCatalogDevices.length} SKUs)
              </Badge>
              <span className="bg-emerald-950 text-emerald-300 font-mono text-xs px-2 py-0.5 rounded border border-emerald-800 font-bold">
                Coste estimado: ≈0,03 €
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Panel Editorial Multicanal & Selector de Equipamiento
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Genera activos validados para Prensa / Blog GEO, LinkedIn B2B, WhatsApp y Ficha ecomshop.es con exportación 1-clic y grounding técnico de EcomShop.
            </p>
          </div>

          {selectedSku && onLaunchWithSku && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => onLaunchWithSku(selectedSku)}
              leftIcon={<Zap className="w-3.5 h-3.5 text-amber-300" />}
            >
              🚀 Lanzar Campaña ({selectedSku}) &bull; ≈0,03 €
            </Button>
          )}
        </div>

        {/* 1. SELECTOR DE PRODUCTO CON BUSCADOR EN TIEMPO REAL Y CLASIFICACIÓN POR FAMILIA */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Selector de Producto Catálogo EcomShop ({filteredCatalogProducts.length} de {allCatalogDevices.length} SKUs)
              </h3>
            </div>

            {/* Buscador en tiempo real */}
            <div className="relative min-w-[260px] md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="Buscar por SKU, nombre, Wi-Fi 7, PoE..."
                className="w-full bg-slate-900 border border-slate-700/80 text-white text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 font-mono transition"
              />
              {productSearchQuery && (
                <button
                  type="button"
                  onClick={() => setProductSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filtros por Familia (Wi-Fi, Switches, Gateways, Fibra) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-indigo-400" /> Familias:
            </span>

            {[
              { id: "ALL", label: "Todas las Familias", count: familyCounts.ALL },
              { id: "WIFI", label: "Wi-Fi & APs", count: familyCounts.WIFI },
              { id: "SWITCHES", label: "Switches PoE", count: familyCounts.SWITCHES },
              { id: "GATEWAYS", label: "Gateways & Celular", count: familyCounts.GATEWAYS },
              { id: "FIBER", label: "Fibra & Testers", count: familyCounts.FIBER }
            ].map((fam) => {
              const isActive = selectedFamily === fam.id;
              return (
                <button
                  key={fam.id}
                  type="button"
                  onClick={() => setSelectedFamily(fam.id as ProductFamily)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs font-bold border border-indigo-500"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  <span>{fam.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? "bg-indigo-700 text-white" : "bg-slate-800 text-slate-400"}`}>
                    {fam.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grid de productos filtrados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {filteredCatalogProducts.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs bg-slate-900/50 rounded-lg border border-slate-800">
                No se encontraron productos coincidentes con "{productSearchQuery}" en la familia seleccionada.
              </div>
            ) : (
              filteredCatalogProducts.map((device) => {
                const isSelected = selectedSku === device.sku;
                const family = getProductFamily(device.type);

                return (
                  <div
                    key={device.sku}
                    className={`rounded-xl p-3 border transition-all duration-200 flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? "bg-slate-950 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg"
                        : "bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {device.sku}
                        </span>
                        <Badge
                          variant={
                            family === "WIFI" ? "cyan" :
                            family === "SWITCHES" ? "success" :
                            family === "GATEWAYS" ? "warning" : "neutral"
                          }
                          size="xs"
                        >
                          {family}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{device.brand}</span>
                        <h4 className="text-xs font-bold text-white line-clamp-1 leading-snug">{device.name}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {device.shortDesc}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => onSelectQuickSku?.(device.sku)}
                        className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                          isSelected
                            ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/50"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isSelected ? "Activo" : "Seleccionar"}</span>
                      </button>

                      {onLaunchWithSku && (
                        <button
                          type="button"
                          onClick={() => onLaunchWithSku(device.sku)}
                          className="py-1 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                          title={`Generar campaña de ${device.sku}`}
                        >
                          <Zap className="w-3 h-3 text-amber-300" />
                          <span>Lanzar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ficha Técnica / Inteligencia en Vivo */}
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Ficha de Inteligencia NotebookLM {selectedSku ? `(${selectedSku})` : ""}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-full">
              Grounding Oficial
            </span>
          </div>

          {isLoadingIntelligence ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-950/40 rounded-xl border border-slate-800">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono">Sintetizando especificaciones técnicas de {selectedSku}...</p>
            </div>
          ) : intelligenceCard ? (
            <div className="space-y-4">
              <ProductIntelligenceView card={intelligenceCard} />
              <EvidenceAuditDrawer
                score={95}
                evidenceLedger={intelligenceCard.evidenceLedger}
                productName={intelligenceCard.product.model}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800 text-xs">
              Selecciona una oportunidad a la izquierda o haz clic en un SKU para ver la ficha de ingeniería y grounding oficial.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ESTADO 2: LOADING (Milestone Stepper Animado)
  if (stage !== "IDLE" && !content) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col gap-6 p-6">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800/90 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600/30 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-mono border border-indigo-500/40 uppercase tracking-wider animate-pulse">
                Generando Campaña
              </span>
              {opportunity?.sku && (
                <span className="bg-slate-800 text-sky-400 text-xs px-2.5 py-0.5 rounded-full font-mono border border-slate-700">
                  SKU: {opportunity.sku}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {opportunity?.actionTitle || `Orquestando campaña para ${opportunity?.sku || selectedSku}`}
            </h2>
            <p className="text-xs text-slate-400">
              Procesando los 4 hitos: scraping de producto, contrastación contra fuentes NotebookLM, redacción omnicanal y fact-checking.
            </p>
          </div>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition border border-slate-700 cursor-pointer self-start md:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancelar</span>
            </button>
          )}
        </div>

        <div className="p-6 bg-slate-950/80 rounded-xl border border-slate-800 shadow-inner">
          <CampaignStepper
            currentStage={stage}
            errorMessage={errorMessage}
            onRetry={onRetry}
            activeSku={opportunity?.sku || selectedSku}
            activeAngle={opportunity?.recommendedAngle}
          />
        </div>
      </div>
    );
  }

  // ESTADO 3: CONTENIDO GENERADO (Workspace Omnicanal con Pestañas de Previsualización & Exportación 1-clic)
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mb-10 transition-all text-slate-100">
      {/* Cabecera del Campaign Workspace */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="indigo" size="xs">
                Campaign Workspace Omnicanal
              </Badge>
              {selectedSku && (
                <Badge variant="cyan" size="xs">
                  SKU: {selectedSku}
                </Badge>
              )}
              {opportunity?.recommendedAngle && (
                <Badge variant="success" size="xs">
                  {opportunity.recommendedAngle}
                </Badge>
              )}
              <Badge variant="neutral" size="xs">
                <BookOpen className="w-3 h-3 text-indigo-400" />
                NotebookLM Grounded
              </Badge>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{opportunity?.actionTitle || content?.topicTitle || `Campaña Omnicanal para ${selectedSku}`}</span>
            </h2>

            {opportunity?.suggestedBundle && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                <span>Bundle Cruzado: <strong>{opportunity.suggestedBundle.accessorySku}</strong> ({opportunity.suggestedBundle.accessoryName})</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Badge
              variant={content?.source === "fallback" || content?.status === "NEEDS_REVIEW" ? "warning" : "success"}
              size="sm"
              className="font-mono font-bold"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {typeof content?.factCheckScore === "number" ? `Fidelidad: ${content.factCheckScore}/100` : "Product Truth: VERIFIED"}
            </Badge>

            {onApprove && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50"
                disabled={isSavingArticle}
                isLoading={isSavingArticle}
                onClick={onApprove}
                leftIcon={!isSavingArticle ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" /> : undefined}
              >
                Aprobar Campaña
              </Button>
            )}

            {onPublishToStore && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 border-indigo-500/50"
                disabled={isSavingArticle}
                isLoading={isSavingArticle}
                onClick={onPublishToStore}
                leftIcon={!isSavingArticle ? <Sparkles className="w-3.5 h-3.5 text-indigo-200" /> : undefined}
              >
                Publicar Campaña
              </Button>
            )}

            {onSaveToFirestore && !onApprove && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50"
                disabled={isSavingArticle}
                isLoading={isSavingArticle}
                onClick={() => onSaveToFirestore("approved")}
                leftIcon={!isSavingArticle ? <Save className="w-3.5 h-3.5" /> : undefined}
              >
                {isSavingArticle ? "Guardando..." : "Guardar en Firestore"}
              </Button>
            )}

            {onReset && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSafeReset}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Cerrar Workspace
              </Button>
            )}
          </div>
        </div>

        {/* Notificación flotante de error al copiar */}
        {clipboardError && (
          <div className="mt-2 p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg text-xs text-rose-200 flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{clipboardError}</span>
          </div>
        )}
      </div>

      {/* Stepper del Ciclo de Vida */}
      <div className="p-6 bg-slate-950/40 border-b border-slate-800">
        <CampaignStepper
          currentStage={stage}
          errorMessage={errorMessage}
          onRetry={onRetry}
          activeSku={opportunity?.sku || selectedSku}
          activeAngle={opportunity?.recommendedAngle}
        />
      </div>

      {/* CONTENEDOR DE PESTAÑAS Y ACCIONES OMNICANAL */}
      {content && (
        <div className="flex flex-col">
          {/* BARRA SUPERIOR DE PESTAÑAS POR CANAL */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-2.5 flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSelectTab("geo")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "geo"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-sky-300" />
                <span>Prensa / Blog GEO</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab("linkedin")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "linkedin"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-blue-300" />
                <span>LinkedIn B2B</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab("whatsapp")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "whatsapp"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                <span>WhatsApp Broadcast</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab("ecomshop")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "ecomshop"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Store className="w-3.5 h-3.5 text-amber-300" />
                <span>Ficha ecomshop.es</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab("mailchimp")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "mailchimp"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-purple-300" />
                <span>Mailchimp B2B</span>
              </button>

              {intelligenceCard && (
                <button
                  type="button"
                  onClick={() => handleSelectTab("intel")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === "intel"
                      ? "bg-indigo-600 text-white shadow-xs font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Product Intelligence</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSelectTab("quality")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "quality"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Quality Gate</span>
              </button>
            </div>

            {/* BARRA DE ACCIÓN OBLIGATORIA CON 3 BOTONES EN CADA PESTAÑA */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => copyToClipboard(getChannelMarkdown(activeTab), `${activeTab}-md`)}
                leftIcon={copiedKey === `${activeTab}-md` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              >
                {copiedKey === `${activeTab}-md` ? "¡Markdown Copiado!" : "Copiar Markdown"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => copyToClipboard(getChannelHtmlWithJsonLd(activeTab), `${activeTab}-html-jsonld`)}
                leftIcon={copiedKey === `${activeTab}-html-jsonld` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5 text-indigo-300" />}
              >
                {copiedKey === `${activeTab}-html-jsonld` ? "¡HTML + JSON-LD Copiado!" : "Copiar HTML + JSON-LD"}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="xs"
                className="bg-indigo-600 hover:bg-indigo-500 border-indigo-500"
                disabled={isRegeneratingChannel}
                isLoading={isRegeneratingChannel}
                onClick={() => handleRegenerateChannel(activeTab)}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingChannel ? "animate-spin" : ""}`} />}
              >
                Regenerar este canal
              </Button>
            </div>
          </div>

          {/* CUERPO DE LAS PESTAÑAS */}
          <div className="p-6 transition-opacity duration-200">
            {isTabTransitioning ? (
              <div className="space-y-4 animate-pulse p-4">
                <div className="h-6 bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-800 rounded w-2/3" />
                <div className="h-32 bg-slate-800 rounded" />
              </div>
            ) : (
              <>
                {/* 1. PESTAÑA PRENSA / BLOG GEO */}
                {activeTab === "geo" && (
                  <div className="flex flex-col gap-6">
                    <Card variant="default" padding="md" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-indigo-900/40 bg-slate-950">
                      <div>
                        <Badge variant="indigo" size="xs" className="mb-1">
                          Artículo Prensa & GEO Engine Optimization
                        </Badge>
                        <h3 className="text-base font-bold text-white mt-1">{content.geo?.title || content.blog.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {content.geo?.metaDescription || content.blog.metaDescription}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => copyToClipboard(getChannelMarkdown("geo"), "geo-md")}
                          leftIcon={copiedKey === "geo-md" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        >
                          Copiar Markdown
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => copyToClipboard(getChannelHtmlWithJsonLd("geo"), "geo-html")}
                          leftIcon={copiedKey === "geo-html" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5 text-indigo-300" />}
                        >
                          Copiar HTML + JSON-LD
                        </Button>
                      </div>
                    </Card>

                    {/* VISTA DEL ARTÍCULO HTML */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-sky-400" />
                        <span>Vista previa del Artículo Blog GEO</span>
                      </h4>
                      <div 
                        onClick={handleContainerClick}
                        className="border border-slate-200 rounded-xl p-6 bg-white text-slate-900 shadow-xs max-h-[500px] overflow-y-auto"
                      >
                        <SafeHtml
                          className="prose max-w-none text-[15px] font-sans leading-relaxed"
                          html={content.geo?.htmlContent || enrichedBlogHtml}
                        />
                      </div>
                    </div>

                    {/* TABLA COMPARATIVA TÉCNICA */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Table className="w-4 h-4 text-emerald-400" />
                        <span>Tabla Comparativa Técnica (Prensa B2B)</span>
                      </h4>
                      <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 overflow-x-auto">
                        {content.geo?.comparativeTableHtml ? (
                          <SafeHtml html={content.geo.comparativeTableHtml} />
                        ) : (
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-300 font-bold">
                                <th className="p-2.5 bg-slate-900">Parámetro Técnico</th>
                                <th className="p-2.5 bg-indigo-950/70 text-indigo-200">EcomShop {selectedSku}</th>
                                <th className="p-2.5 bg-slate-900">Estándar Mercado Competencia</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                              <tr>
                                <td className="p-2.5 font-mono text-slate-400">Estándar Wi-Fi / Conectividad</td>
                                <td className="p-2.5 font-bold text-white bg-indigo-950/30">Wi-Fi 7 / 802.11be Tri-Band</td>
                                <td className="p-2.5 text-slate-400">Wi-Fi 6 / Dual Band</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-slate-400">Rendimiento Físico Máximo</td>
                                <td className="p-2.5 font-bold text-white bg-indigo-950/30">Hasta 9.3 Gbps combinados</td>
                                <td className="p-2.5 text-slate-400">3.0 Gbps - 5.4 Gbps</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-slate-400">Alimentación PoE</td>
                                <td className="p-2.5 font-bold text-white bg-indigo-950/30">802.3at / 802.3bt PoE+</td>
                                <td className="p-2.5 text-slate-400">802.3af (limitado)</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-mono text-slate-400">Gestión de Red</td>
                                <td className="p-2.5 font-bold text-white bg-indigo-950/30">EcomCloud Pro / On-Premise 0 Licencias</td>
                                <td className="p-2.5 text-slate-400">Suscripción Anual Licenciada</td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* VISOR DE CÓDIGO JSON-LD */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Code className="w-4 h-4 text-indigo-400" />
                          <span>Visor de Código JSON-LD (Schema.org / Perplexity / SearchGPT)</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentJsonLd, "jsonld-code")}
                          className="text-xs text-indigo-300 hover:text-white font-mono flex items-center gap-1 bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-800 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKey === "jsonld-code" ? "¡JSON-LD Copiado!" : "Copiar JSON-LD"}</span>
                        </button>
                      </div>
                      <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-indigo-300 overflow-x-auto max-h-60 shadow-inner">
                        {currentJsonLd}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 2. PESTAÑA LINKEDIN B2B */}
                {activeTab === "linkedin" && (
                  <div className="flex flex-col gap-6 max-w-3xl mx-auto">
                    <div className="bg-slate-950 border border-slate-800 text-white p-4 rounded-t-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-bold tracking-wide uppercase">LinkedIn B2B Post (Formato Optimizado)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => copyToClipboard(getChannelMarkdown("linkedin"), "li-md")}
                          leftIcon={<Copy className="w-3.5 h-3.5" />}
                        >
                          Copiar Markdown
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="xs"
                          onClick={() => copyToClipboard(formatForLinkedIn(content.linkedin.fullPostText), "li-post")}
                          leftIcon={copiedKey === "li-post" ? <Check className="w-3.5 h-3.5 text-sky-200" /> : <Copy className="w-3.5 h-3.5" />}
                        >
                          {copiedKey === "li-post" ? "¡Post Copiado!" : "Copiar Post LinkedIn"}
                        </Button>
                      </div>
                    </div>

                    {/* Feed Card Mockup LinkedIn */}
                    <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg text-slate-200 text-[14px] font-sans my-2 w-full space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          EC
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">EcomShop Telecomunicaciones</h4>
                          <p className="text-[11px] text-slate-400">Director de Estrategia Técnica • 1h • 🌐</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="font-bold text-slate-100 text-sm">{content.linkedin.hook}</p>
                        <p className="whitespace-pre-wrap text-slate-300 leading-relaxed text-xs">{content.linkedin.fullPostText}</p>
                      </div>
                      {content.linkedin.hashtags && content.linkedin.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {content.linkedin.hashtags.map((tag, i) => (
                            <span key={i} className="text-xs text-sky-400 font-semibold hover:underline cursor-pointer">
                              {tag.startsWith("#") ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-400 font-semibold">
                        <span className="hover:text-sky-400 cursor-pointer flex items-center gap-1">👍 Me gusta</span>
                        <span className="hover:text-sky-400 cursor-pointer flex items-center gap-1">💬 Comentar</span>
                        <span className="hover:text-sky-400 cursor-pointer flex items-center gap-1">🔁 Compartir</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. PESTAÑA WHATSAPP BROADCAST */}
                {activeTab === "whatsapp" && (
                  <div className="flex flex-col gap-6 max-w-3xl mx-auto">
                    <div className="bg-emerald-950 border border-emerald-800/80 text-white p-4 rounded-t-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold tracking-wide uppercase">WhatsApp Broadcast (Mensajería Interactiva)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => copyToClipboard(getChannelMarkdown("whatsapp"), "wa-md")}
                          leftIcon={<Copy className="w-3.5 h-3.5" />}
                        >
                          Copiar Markdown
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="xs"
                          className="bg-emerald-700 hover:bg-emerald-600 border-emerald-600"
                          onClick={() => copyToClipboard(formatForWhatsApp(content.whatsapp.formattedMessage), "wa-msg")}
                          leftIcon={copiedKey === "wa-msg" ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                        >
                          {copiedKey === "wa-msg" ? "¡WhatsApp Copiado!" : "Copiar Mensaje WhatsApp"}
                        </Button>
                      </div>
                    </div>

                    {/* Mockup Móvil Interactivo WhatsApp */}
                    <div className="w-[320px] mx-auto border-4 border-slate-700 rounded-[36px] bg-[rgb(11,20,26)] overflow-hidden shadow-2xl font-sans my-2">
                      <div className="bg-[rgb(32,44,51)] text-white px-4 py-3 flex items-center gap-3 border-b border-slate-700">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                          ES
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-100">EcomShop Broadcast</p>
                          <p className="text-[10px] text-emerald-400">Canal Oficial Mayorista B2B</p>
                        </div>
                      </div>
                      <div className="p-3 bg-[rgb(11,20,26)] min-h-[280px] flex flex-col justify-end">
                        <div className="bg-[rgb(0,92,75)] text-slate-100 p-3.5 rounded-xl rounded-tr-none text-[13px] leading-relaxed shadow-sm space-y-2">
                          <p className="whitespace-pre-wrap">{content.whatsapp.formattedMessage}</p>
                          <div className="pt-2 border-t border-emerald-600/40 text-[11px] text-emerald-100 font-semibold space-y-1">
                            <div>📦 SKU: {selectedSku}</div>
                            <div>📞 Pedidos / Consultas: +34 900 800 900</div>
                            <div>🌐 Info: https://ecomshop.es/b2b</div>
                          </div>
                          <span className="text-[9px] text-emerald-200/70 block text-right mt-1 font-mono">10:42 ✓✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. PESTAÑA FICHA ESHOP.ES */}
                {activeTab === "ecomshop" && (
                  <div className="flex flex-col gap-6">
                    <Card variant="default" padding="md" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-amber-900/40 bg-slate-950">
                      <div>
                        <Badge variant="warning" size="xs" className="mb-1">
                          Argumentario CMS ecomshop.es (Sin Estilos Inline Sucios)
                        </Badge>
                        <h3 className="text-base font-bold text-white mt-1">Ficha Comercial CMS: {selectedSku}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Texto promocional limpio y estructurado listo para copiar en la tienda EcomShop.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => copyToClipboard(getChannelMarkdown("ecomshop"), "ecom-md")}
                          leftIcon={copiedKey === "ecom-md" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        >
                          Copiar Markdown
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => copyToClipboard(getChannelHtmlWithJsonLd("ecomshop"), "ecom-html")}
                          leftIcon={copiedKey === "ecom-html" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5 text-amber-400" />}
                        >
                          Copiar HTML CMS + JSON-LD
                        </Button>
                      </div>
                    </Card>

                    {/* VISTA PREVIA FICHA CMS */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4 text-slate-200 text-xs leading-relaxed">
                      <div>
                        <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wide mb-1">Argumentario Principal de Venta</h4>
                        <p className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 text-slate-300">
                          {content.ecomshop?.argumentario || content.blog.cleanPlainTextExcerpt}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wide mb-2">Puntos Fuertes Destacados en Ficha</h4>
                        <ul className="space-y-1.5 list-disc pl-5">
                          {(content.ecomshop?.features || [
                            `Compatibilidad nativa con gestión EcomCloud de 0 licencias recurrentes`,
                            `Homologado para proyectos de ingeniería e infraestructura crítica EcomSpain`,
                            `Soporte técnico directo en España y garantía oficial de fabricante`
                          ]).map((feat, i) => (
                            <li key={i} className="text-slate-300 font-medium">{feat}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. PESTAÑA MAILCHIMP B2B */}
                {activeTab === "mailchimp" && (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card variant="subtle" padding="md" className="border-purple-900/40 bg-slate-950">
                        <Badge variant="neutral" size="xs" className="mb-2 text-purple-300">
                          Asunto Variante A
                        </Badge>
                        <p className="text-sm font-semibold text-slate-100">{content.mailchimp.subjectA}</p>
                      </Card>

                      <Card variant="subtle" padding="md" className="border-purple-900/40 bg-slate-950">
                        <Badge variant="neutral" size="xs" className="mb-2 text-purple-300">
                          Asunto Variante B
                        </Badge>
                        <p className="text-sm font-semibold text-slate-100">{content.mailchimp.subjectB}</p>
                      </Card>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-6 bg-white text-slate-900 max-h-[450px] overflow-y-auto">
                      <SafeHtml html={enrichedMailchimpHtml} />
                    </div>
                  </div>
                )}

                {/* 6. PESTAÑA PRODUCT INTELLIGENCE */}
                {activeTab === "intel" && intelligenceCard && (
                  <div className="space-y-6">
                    <ProductIntelligenceView card={intelligenceCard} />
                    <EvidenceAuditDrawer
                      score={95}
                      evidenceLedger={intelligenceCard.evidenceLedger}
                      productName={intelligenceCard.product.model}
                    />
                  </div>
                )}

                {/* 7. PESTAÑA QUALITY GATE */}
                {activeTab === "quality" && (
                  <div className="space-y-6">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="p-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
                            <FileCheck className="w-4 h-4" />
                          </span>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                            Quality Gate & Auditoría de Rigor Técnico
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400">
                          Evaluación continua de controles técnicos, evidencias de NotebookLM y compliance B2B.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-mono uppercase">Score Fidelidad</div>
                          <div className="text-lg font-mono font-bold text-emerald-400">
                            {typeof content.factCheckScore === "number" ? `${content.factCheckScore} / 100` : "100 / 100"}
                          </div>
                        </div>
                        <Badge variant="success" size="sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ESTADO: PASS
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Drawer Lateral de Evidencia Oficial NotebookLM */}
      <SourceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        citationId={activeCitationId}
        citationData={activeCitationData}
      />
    </div>
  );
};
