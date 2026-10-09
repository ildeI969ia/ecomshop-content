import { getAdminFirestore } from "@/server/config/firebase";
import { ContentItem } from "@/server/domain/types";
import { normalizePersistedContent, ContentLibraryItem } from "@/lib/utils/content-normalizer";

export interface PublicBlogPostItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  preview: string;
  readingTimeMinutes: number;
  publishedAt: string;
  createdAt: string;
  productId: string | null;
  featuredImageUrl: string | null;
  targetKeywords: string[];
  author: {
    name: string;
    role: string;
  };
}

export interface PublicBlogDetail extends PublicBlogPostItem {
  htmlContent: string;
  cleanPlainTextExcerpt: string;
  metaDescription: string;
  jsonLd?: string;
  comparativeTableHtml?: string;
  editorialThesis?: {
    problem: string;
    targetProfessional?: string;
    businessContext?: string;
    technicalQuestion: string;
    whyItMatters: string;
    centralArgument: string;
    solutionApproach: string;
    productRole?: string;
  };
  editorialLayout?: {
    photoPlacements?: Array<{
      id: string;
      photoType: string;
      description: string;
      imageUrl?: string;
      altText?: string;
      caption?: string;
    }>;
    ctaPlacements?: Array<{
      id: string;
      buttonText: string;
      targetUrl: string;
      ctaType: string;
    }>;
  };
}

/**
 * Helper para extraer la imagen principal de un artículo
 */
function extractFeaturedImage(rawBlog: any, rawItem: any): string | null {
  if (rawBlog?.editorialLayout?.photoPlacements && Array.isArray(rawBlog.editorialLayout.photoPlacements)) {
    const validPhoto = rawBlog.editorialLayout.photoPlacements.find((p: any) => typeof p.imageUrl === "string" && p.imageUrl.startsWith("http"));
    if (validPhoto?.imageUrl) return validPhoto.imageUrl;
  }
  if (typeof rawBlog?.featuredImageUrl === "string" && rawBlog.featuredImageUrl.startsWith("http")) {
    return rawBlog.featuredImageUrl;
  }
  if (typeof rawItem?.featuredImageUrl === "string" && rawItem.featuredImageUrl.startsWith("http")) {
    return rawItem.featuredImageUrl;
  }
  // Búsqueda en el cuerpo HTML por si hay <img>
  const html = rawBlog?.htmlContent || "";
  const match = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Obtiene todos los artículos publicados para el feed público del Blog
 */
export async function getPublishedBlogPosts(limitCount = 20): Promise<PublicBlogPostItem[]> {
  try {
    const db = getAdminFirestore();
    // Consulta con timeout de seguridad (4000ms) para evitar bloqueos durante compilación
    const queryPromise = db
      .collection("contents")
      .where("status", "==", "PUBLISHED")
      .limit(Math.max(limitCount * 2, 50))
      .get();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 4000)
    );

    const snapshot = await Promise.race([queryPromise, timeoutPromise]);

    if (snapshot.empty) {
      return [];
    }

    const items: PublicBlogPostItem[] = snapshot.docs.map((doc) => {
      const item = doc.data() as ContentItem;
      const normalized = normalizePersistedContent(item);
      const rawBody = (item.versions?.[0]?.body as any) || (item.canonicalBody as any) || item;
      const rawBlog = rawBody.blog || rawBody;

      const featuredImage = extractFeaturedImage(rawBlog, item);

      return {
        id: item.id || doc.id,
        title: item.title || normalized.title,
        slug: item.slug || normalized.slug,
        category: item.category || normalized.category || "Tecnología B2B",
        preview: normalized.preview,
        readingTimeMinutes: normalized.content?.blog.readingTimeMinutes || 5,
        publishedAt: item.approvedAt || item.updatedAt || item.createdAt || new Date().toISOString(),
        createdAt: item.createdAt || new Date().toISOString(),
        productId: normalized.productId,
        featuredImageUrl: featuredImage,
        targetKeywords: normalized.content?.blog.targetKeywords || [],
        author: {
          name: "Equipo de Ingeniería EcomShop",
          role: "Consultoría y Soluciones de Red B2B"
        }
      };
    });

    // Ordenación en memoria descendente por fecha de publicación/creación
    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return items.slice(0, limitCount);
  } catch (error) {
    console.error("[getPublishedBlogPosts] Error al consultar Firestore:", error);
    return [];
  }
}

/**
 * Obtiene un artículo publicado por su Slug con el contenido completo
 */
export async function getPublishedBlogPostBySlug(slug: string): Promise<PublicBlogDetail | null> {
  try {
    const db = getAdminFirestore();
    const queryPromise = db
      .collection("contents")
      .where("slug", "==", slug)
      .where("status", "==", "PUBLISHED")
      .limit(1)
      .get();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 4000)
    );

    const snapshot = await Promise.race([queryPromise, timeoutPromise]);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const item = doc.data() as ContentItem;
    const normalized = normalizePersistedContent(item);
    const rawBody = (item.versions?.[0]?.body as any) || (item.canonicalBody as any) || item;
    const rawBlog = rawBody.blog || rawBody;
    const rawGeo = rawBody.geo || {};

    const featuredImage = extractFeaturedImage(rawBlog, item);

    return {
      id: item.id || doc.id,
      title: item.title || normalized.title,
      slug: item.slug || normalized.slug,
      category: item.category || normalized.category || "Tecnología B2B",
      preview: normalized.preview,
      readingTimeMinutes: normalized.content?.blog.readingTimeMinutes || 5,
      publishedAt: item.approvedAt || item.updatedAt || item.createdAt,
      createdAt: item.createdAt,
      productId: normalized.productId,
      featuredImageUrl: featuredImage,
      targetKeywords: normalized.content?.blog.targetKeywords || [],
      htmlContent: normalized.content?.blog.htmlContent || "",
      cleanPlainTextExcerpt: normalized.content?.blog.cleanPlainTextExcerpt || normalized.preview,
      metaDescription: normalized.content?.blog.metaDescription || normalized.preview,
      jsonLd: rawGeo.jsonLd || undefined,
      comparativeTableHtml: rawGeo.comparativeTableHtml || undefined,
      editorialThesis: normalized.content?.editorialThesis || undefined,
      editorialLayout: normalized.content?.blog.editorialLayout,
      author: {
        name: "Equipo de Ingeniería EcomShop",
        role: "Consultoría y Soluciones de Red B2B"
      }
    };
  } catch (error) {
    console.error(`[getPublishedBlogPostBySlug] Error al buscar slug "${slug}":`, error);
    return null;
  }
}
