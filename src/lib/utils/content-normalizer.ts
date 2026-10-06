import { ContentItem } from "@/server/domain/types";
import { ContentOutput } from "@/lib/schema";

export type ContentIntegrityStatus = "VALID" | "CORRUPTED" | "LEGACY_NEEDS_REPAIR";

export interface IntegrityReport {
  contentId: string;
  workspaceId: string;
  status: ContentIntegrityStatus;
  hasRoot: boolean;
  orphanVersionsCount: number;
  reasons: string[];
}

export interface ContentLibraryItem {
  id: string;
  workspaceId: string;
  type: string;
  title: string;
  slug: string;
  status: "draft" | "reviewed" | "approved" | "published";
  rawStatus: string;
  integrityStatus: ContentIntegrityStatus;
  createdAt: string;
  updatedAt: string;
  productId: string | null;
  campaignId: string | null;
  preview: string;
  category: string;
  currentVersion: number;
  authorId: string;
  channels: string[];
  hasVersions: boolean;
  content?: ContentOutput | null;
}

export type NormalizedArticleSummary = ContentLibraryItem;

export function extractPreviewText(raw: Record<string, unknown> | null | undefined, fallbackTitle: string): string {
  if (!raw) return fallbackTitle;
  const blog = (raw.blog && typeof raw.blog === "object" ? (raw.blog as Record<string, unknown>) : null) || raw;

  if (typeof blog.metaDescription === "string" && blog.metaDescription.trim().length > 0) {
    return blog.metaDescription.trim();
  }
  if (typeof blog.cleanPlainTextExcerpt === "string" && blog.cleanPlainTextExcerpt.trim().length > 0) {
    return blog.cleanPlainTextExcerpt.trim().slice(0, 200);
  }
  if (typeof blog.tldr === "string" && blog.tldr.trim().length > 0) {
    return blog.tldr.trim();
  }
  if (typeof blog.introduction === "string" && blog.introduction.trim().length > 0) {
    return blog.introduction.trim().slice(0, 200);
  }
  return fallbackTitle;
}

export function normalizePersistedContent(item: ContentItem, userWorkspaceId?: string): NormalizedArticleSummary {
  const rawItem = item as unknown as Record<string, unknown>;
  const versionBody = item.versions?.[0]?.body as Record<string, unknown> | undefined;

  const candidateBody =
    versionBody ||
    (typeof rawItem.content === "object" && rawItem.content !== null ? (rawItem.content as Record<string, unknown>) : null) ||
    (typeof rawItem.canonicalBody === "object" && rawItem.canonicalBody !== null ? (rawItem.canonicalBody as Record<string, unknown>) : null) ||
    (typeof rawItem.body === "object" && rawItem.body !== null ? (rawItem.body as Record<string, unknown>) : null);

  const normalizedStatus: "draft" | "reviewed" | "approved" | "published" =
    item.status === "PUBLISHED" ? "published" :
    item.status === "APPROVED" ? "approved" :
    item.status === "IN_REVIEW" ? "reviewed" : "draft";

  const preview = extractPreviewText(candidateBody, item.title || "Artículo sin título");

  let parsedContent: ContentOutput | null = null;
  if (candidateBody) {
    const rawBlog = (candidateBody.blog && typeof candidateBody.blog === "object"
      ? (candidateBody.blog as Record<string, unknown>)
      : candidateBody) as Record<string, unknown>;

    const rawMailchimp = typeof candidateBody.mailchimp === "object" && candidateBody.mailchimp !== null
      ? (candidateBody.mailchimp as Record<string, unknown>)
      : {};
    const rawWhatsapp = typeof candidateBody.whatsapp === "object" && candidateBody.whatsapp !== null
      ? (candidateBody.whatsapp as Record<string, unknown>)
      : {};
    const rawLinkedin = typeof candidateBody.linkedin === "object" && candidateBody.linkedin !== null
      ? (candidateBody.linkedin as Record<string, unknown>)
      : {};

    parsedContent = {
      topicId: String(candidateBody.topicId || item.id),
      topicTitle: String(candidateBody.topicTitle || item.title || "Sin título"),
      category: String(candidateBody.category || item.category || "general"),
      generatedAt: String(candidateBody.generatedAt || item.createdAt || new Date().toISOString()),
      blog: {
        title: String(rawBlog.title || item.title || "Sin título"),
        metaDescription: String(rawBlog.metaDescription || preview),
        slug: String(rawBlog.slug || item.slug || `post-${item.id}`),
        readingTimeMinutes: typeof rawBlog.readingTimeMinutes === "number" ? rawBlog.readingTimeMinutes : 5,
        targetKeywords: Array.isArray(rawBlog.targetKeywords) ? (rawBlog.targetKeywords as string[]) : [],
        htmlContent: String(rawBlog.htmlContent || rawBlog.content || ""),
        cleanPlainTextExcerpt: String(rawBlog.cleanPlainTextExcerpt || preview),
        editorialLayout: (typeof rawBlog.editorialLayout === "object" && rawBlog.editorialLayout !== null
          ? (rawBlog.editorialLayout as ContentOutput["blog"]["editorialLayout"])
          : { photoPlacements: [] })
      },
      mailchimp: {
        subjectA: String(rawMailchimp.subjectA || ""),
        subjectB: String(rawMailchimp.subjectB || ""),
        previewText: String(rawMailchimp.previewText || ""),
        ctaButtonText: String(rawMailchimp.ctaButtonText || ""),
        ctaUrl: String(rawMailchimp.ctaUrl || ""),
        newsletterHtml: String(rawMailchimp.newsletterHtml || ""),
        plainText: String(rawMailchimp.plainText || "")
      },
      whatsapp: {
        headline: String(rawWhatsapp.headline || ""),
        formattedMessage: String(rawWhatsapp.formattedMessage || ""),
        callToAction: String(rawWhatsapp.callToAction || ""),
        targetUrl: String(rawWhatsapp.targetUrl || "")
      },
      linkedin: {
        hook: String(rawLinkedin.hook || ""),
        body: String(rawLinkedin.body || ""),
        takeaways: Array.isArray(rawLinkedin.takeaways) ? (rawLinkedin.takeaways as string[]) : [],
        callToAction: String(rawLinkedin.callToAction || ""),
        hashtags: Array.isArray(rawLinkedin.hashtags) ? (rawLinkedin.hashtags as string[]) : [],
        fullPostText: String(rawLinkedin.fullPostText || "")
      },
      geo: typeof candidateBody.geo === "object" && candidateBody.geo !== null
        ? (candidateBody.geo as ContentOutput["geo"])
        : undefined,
      ecomshop: typeof candidateBody.ecomshop === "object" && candidateBody.ecomshop !== null
        ? (candidateBody.ecomshop as ContentOutput["ecomshop"])
        : undefined,
      editorialThesis: typeof candidateBody.editorialThesis === "object" && candidateBody.editorialThesis !== null
        ? (candidateBody.editorialThesis as ContentOutput["editorialThesis"])
        : undefined,
      outline: Array.isArray(candidateBody.outline)
        ? (candidateBody.outline as ContentOutput["outline"])
        : undefined
    };

    // Canales disponibles inferidos
    const channels: string[] = ["BLOG"];
    if (parsedContent?.geo) channels.push("GEO");
    if (parsedContent?.linkedin?.fullPostText) channels.push("LINKEDIN");
    if (parsedContent?.whatsapp?.formattedMessage) channels.push("WHATSAPP");
    if (parsedContent?.mailchimp?.newsletterHtml) channels.push("MAILCHIMP");
    if (parsedContent?.ecomshop?.cmsHtml) channels.push("ECOMSHOP");

    // Evaluación determinista de integridad de contenido
    const resolvedWorkspace = item.workspaceId || userWorkspaceId;
    const hasValidWorkspace = Boolean(resolvedWorkspace && resolvedWorkspace.trim().length > 0);
    const hasValidTitle = Boolean(item.title && item.title.trim().length > 0 && item.title !== "Sin título");
    const hasValidVersion = (item.currentVersion || 1) >= 1 && (Boolean(item.versions && item.versions.length > 0) || Boolean(parsedContent));

    let integrityStatus: ContentIntegrityStatus = "VALID";
    if (!hasValidWorkspace || !item.id) {
      integrityStatus = "CORRUPTED";
    } else if (!hasValidTitle || !hasValidVersion) {
      integrityStatus = "LEGACY_NEEDS_REPAIR";
    }

    return {
      id: item.id,
      workspaceId: resolvedWorkspace || "default-ecomspain",
      type: "editorial_campaign",
      title: item.title || "Sin título",
      slug: item.slug || `post-${item.id}`,
      status: normalizedStatus,
      rawStatus: item.status,
      integrityStatus,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt || item.createdAt,
      productId: item.linkedProductIds?.[0] || null,
      campaignId: item.campaignId || null,
      preview,
      category: item.category || "general",
      currentVersion: item.currentVersion || 1,
      authorId: item.authorId || item.createdBy || "system",
      channels,
      hasVersions: Boolean(item.versions && item.versions.length > 0),
      content: parsedContent
    };
  }

  // Si no hay body estructurado, inferir canales básicos y clasificar integridad
  const fallbackChannels: string[] = ["BLOG"];
  const resolvedWorkspace = item.workspaceId || userWorkspaceId;
  const hasValidWorkspace = Boolean(resolvedWorkspace && resolvedWorkspace.trim().length > 0);
  const hasValidTitle = Boolean(item.title && item.title.trim().length > 0 && item.title !== "Sin título");
  const integrityStatus: ContentIntegrityStatus = (!hasValidWorkspace || !item.id)
    ? "CORRUPTED"
    : "LEGACY_NEEDS_REPAIR";

  return {
    id: item.id,
    workspaceId: resolvedWorkspace || "default-ecomspain",
    type: "editorial_campaign",
    title: item.title || "Sin título",
    slug: item.slug || `post-${item.id}`,
    status: normalizedStatus,
    rawStatus: item.status,
    integrityStatus,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt || item.createdAt,
    productId: item.linkedProductIds?.[0] || null,
    campaignId: item.campaignId || null,
    preview,
    category: item.category || "general",
    currentVersion: item.currentVersion || 1,
    authorId: item.authorId || item.createdBy || "system",
    channels: fallbackChannels,
    hasVersions: Boolean(item.versions && item.versions.length > 0),
    content: null
  };
}
