"use client";

import React, { useState } from "react";
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
  ShieldAlert
} from "lucide-react";
import { ContentOutput } from "@/lib/schema";
import { ProductOpportunityRecord } from "@/lib/services/opportunity-radar";
import { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import { ProductIntelligenceView } from "./product-intelligence-view";
import { EvidenceAuditDrawer } from "./evidence-audit-drawer";
import { CampaignStepper, GenerationStage } from "./campaign-stepper";

interface CampaignWorkspaceProps {
  stage: GenerationStage;
  opportunity: ProductOpportunityRecord | null;
  content: ContentOutput | null;
  intelligenceCard: ProductIntelligenceCard | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  onReset?: () => void;
  onOpenImageStudio?: (prompt: string) => void;
}

export const CampaignWorkspace: React.FC<CampaignWorkspaceProps> = ({
  stage,
  opportunity,
  content,
  intelligenceCard,
  errorMessage,
  onRetry,
  onReset,
  onOpenImageStudio
}) => {
  const [activeTab, setActiveTab] = useState<"blog" | "mailchimp" | "whatsapp" | "linkedin" | "intel">("blog");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (stage === "IDLE") return null;

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl shadow-xl overflow-hidden mb-10 transition-all">
      {/* Cabecera del Campaign Workspace */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600/30 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-mono border border-indigo-500/40 uppercase tracking-wider">
                Campaign Workspace
              </span>
              {opportunity?.sku && (
                <span className="bg-slate-800 text-sky-400 text-xs px-2.5 py-0.5 rounded-full font-mono border border-slate-700">
                  SKU: {opportunity.sku}
                </span>
              )}
              {opportunity?.recommendedAngle && (
                <span className="bg-emerald-950 text-emerald-300 text-xs px-2 py-0.5 rounded font-semibold border border-emerald-800">
                  {opportunity.recommendedAngle}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{opportunity?.actionTitle || content?.topicTitle || "Campaña Multicanal EcomShop"}</span>
            </h2>

            {opportunity?.suggestedBundle && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                <span>Bundle Cruzado: <strong>{opportunity.suggestedBundle.accessorySku}</strong> ({opportunity.suggestedBundle.accessoryName})</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {opportunity?.url && (
              <a
                href={opportunity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>Ver en ecomshop.es</span>
              </a>
            )}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition border border-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cerrar Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stepper del Ciclo de Vida */}
      <div className="p-6 bg-slate-950/40 border-b border-slate-200/80">
        <CampaignStepper
          currentStage={stage}
          errorMessage={errorMessage}
          onRetry={onRetry}
          activeSku={opportunity?.sku}
          activeAngle={opportunity?.recommendedAngle}
        />
      </div>

      {/* Veto / Ajuste Absoluto del EvidenceEngine (NotebookLM) */}
      {content?.evidenceEngineAdjustments && content.evidenceEngineAdjustments.length > 0 && (
        <div className="bg-amber-950/20 border-b border-amber-500/30 px-6 py-3.5 flex items-start gap-3">
          <div className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="font-bold text-amber-300 flex items-center gap-2">
              <span>🛡️ Ajustes aplicados por Veto Absoluto del EvidenceEngine (NotebookLM)</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded font-mono">
                59 Fuentes Master
              </span>
            </div>
            <p className="text-amber-200/90 text-[11px]">
              El motor contrastó las directivas contra el catálogo y manuales oficiales, anulando parámetros incompatibles:
            </p>
            <div className="space-y-1.5 mt-1">
              {content.evidenceEngineAdjustments.map((adj, i) => (
                <div key={i} className="bg-amber-950/40 border border-amber-500/20 rounded p-2 text-[11px] text-amber-200">
                  <div className="font-semibold text-amber-300">
                    ⚠️ {adj.corrected} <span className="text-[10px] text-amber-400 font-mono">[{adj.sourceId}]</span>
                  </div>
                  <div className="text-amber-300/70 text-[10px] mt-0.5">
                    <span className="line-through text-amber-400/50 mr-1">{adj.original}</span> &rarr; {adj.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contenedor Interactivo con Pestañas de Canales (Una vez completado o con contenido disponible) */}
      {content && (
        <div className="flex flex-col">
          {/* Navegación por Pestañas */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-2.5">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab("blog")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "blog"
                    ? "bg-white text-slate-950 border border-slate-200 shadow-xs font-bold"
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
                    ? "bg-white text-slate-950 border border-slate-200 shadow-xs font-bold"
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
                    ? "bg-white text-slate-950 border border-slate-200 shadow-xs font-bold"
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
                    ? "bg-white text-slate-950 border border-slate-200 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                LinkedIn B2B
              </button>

              {intelligenceCard && (
                <button
                  onClick={() => setActiveTab("intel")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "intel"
                      ? "bg-white text-slate-950 border border-slate-200 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Product Intelligence & Auditoría
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Grounded & Fact-Checked</span>
            </div>
          </div>

          {/* Cuerpo de las Pestañas */}
          <div className="p-6">
            {/* 1. BLOG TAB */}
            {activeTab === "blog" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-sky-600">Título SEO & Slug</span>
                    <h3 className="text-base font-bold text-slate-950 mt-0.5">{content.blog.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span>Slug: <code className="text-sky-700 font-mono bg-sky-50 px-1 py-0.5 rounded border border-sky-200">/{content.blog.slug}</code></span>
                      <span>•</span>
                      <span>Lectura: <strong>{content.blog.readingTimeMinutes} min</strong></span>
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(content.blog.htmlContent, "blog-html")}
                    className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition shadow-xs shrink-0"
                  >
                    {copiedKey === "blog-html" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
                    <span>{copiedKey === "blog-html" ? "¡HTML Copiado!" : "Copiar HTML Durable"}</span>
                  </button>
                </div>

                {/* Perfiles B2B */}
                {content.blog.editorialLayout?.targetProfiles && content.blog.editorialLayout.targetProfiles.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-600" />
                      Propuesta de Valor por Perfil Comercial
                    </h4>
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

                {/* Fotos para Imagen 3 */}
                {content.blog.editorialLayout?.photoPlacements && content.blog.editorialLayout.photoPlacements.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-purple-50/70 border border-purple-200/80 rounded-xl p-4.5 shadow-xs">
                    <div className="flex items-center justify-between mb-3 border-b border-purple-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-purple-600 text-white">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950">
                            Fotos Sugeridas para Imagen 3 & Durable CMS
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-purple-800 bg-purple-200/60 px-2 py-0.5 rounded">
                        {content.blog.editorialLayout.photoPlacements.length} Prompts
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

                          {onOpenImageStudio && (
                            <button
                              type="button"
                              onClick={() => onOpenImageStudio(photo.imagen3Prompt)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                              Generar esta foto en Estudio Imagen 3 &rarr;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vista previa de HTML */}
                <div className="border border-slate-200 rounded-xl p-6 bg-white text-slate-900 shadow-xs max-h-[600px] overflow-y-auto">
                  <div 
                    className="prose max-w-none text-sm font-sans leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: content.blog.htmlContent }}
                  />
                </div>
              </div>
            )}

            {/* 2. MAILCHIMP TAB */}
            {activeTab === "mailchimp" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                      Asunto Variante A
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{content.mailchimp.subjectA}</p>
                    <button
                      onClick={() => copyToClipboard(content.mailchimp.subjectA, "sub-a")}
                      className="mt-2 text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> {copiedKey === "sub-a" ? "Copiado" : "Copiar Asunto A"}
                    </button>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                      Asunto Variante B
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{content.mailchimp.subjectB}</p>
                    <button
                      onClick={() => copyToClipboard(content.mailchimp.subjectB, "sub-b")}
                      className="mt-2 text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> {copiedKey === "sub-b" ? "Copiado" : "Copiar Asunto B"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-600">
                    Preview Text: <strong>{content.mailchimp.previewText}</strong>
                  </span>
                  <button
                    onClick={() => copyToClipboard(content.mailchimp.newsletterHtml, "mailchimp-html")}
                    className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs"
                  >
                    {copiedKey === "mailchimp-html" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{copiedKey === "mailchimp-html" ? "¡HTML Copiado!" : "Copiar Template Mailchimp"}</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl p-6 bg-white text-slate-900 shadow-xs max-h-[500px] overflow-y-auto">
                  <div 
                    className="prose max-w-none text-sm font-sans"
                    dangerouslySetInnerHTML={{ __html: content.mailchimp.newsletterHtml }}
                  />
                </div>
              </div>
            )}

            {/* 3. WHATSAPP TAB */}
            {activeTab === "whatsapp" && (
              <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                <div className="bg-emerald-900 text-white p-4 rounded-t-xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-300" />
                    <span className="text-xs font-bold tracking-wide uppercase">WhatsApp Broadcast B2B</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(content.whatsapp.formattedMessage, "wa-msg")}
                    className="bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    {copiedKey === "wa-msg" ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "wa-msg" ? "¡Copiado!" : "Copiar Mensaje"}</span>
                  </button>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-200 p-6 rounded-b-xl">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed bg-white p-5 rounded-lg border border-emerald-100 shadow-xs">
                    {content.whatsapp.formattedMessage}
                  </pre>
                </div>
              </div>
            )}

            {/* 4. LINKEDIN TAB */}
            {activeTab === "linkedin" && (
              <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                <div className="bg-blue-900 text-white p-4 rounded-t-xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-300" />
                    <span className="text-xs font-bold tracking-wide uppercase">LinkedIn B2B Post</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(content.linkedin.fullPostText, "li-post")}
                    className="bg-blue-800 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    {copiedKey === "li-post" ? <Check className="w-3.5 h-3.5 text-blue-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "li-post" ? "¡Copiado!" : "Copiar Post"}</span>
                  </button>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-b-xl">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
                    {content.linkedin.fullPostText}
                  </pre>
                </div>
              </div>
            )}

            {/* 5. PRODUCT INTELLIGENCE TAB */}
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
          </div>
        </div>
      )}
    </div>
  );
};

