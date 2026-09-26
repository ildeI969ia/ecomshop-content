export interface PhotoPlacement {
  id: string;
  placementAfterHeading: string;
  afterSectionId?: string;
  position?: "AFTER_SECTION" | "BEFORE_SECTION" | "INLINE";
  photoType: "PRODUCT_HERO" | "PRODUCT_CONTEXT" | "TECHNICAL_DIAGRAM" | "INSTALLATION" | "COMPARISON" | "DETAIL" | "ENVIRONMENT" | "CONCEPTUAL" | string;
  aspectRatio?: string;
  description: string;
  imagen3Prompt: string;
  productSku?: string;
  requiresReferenceProductImage?: boolean;
  altText?: string;
  caption?: string;
  assetId?: string;
  imageUrl?: string;
  status?: "PENDING" | "GENERATED" | "FAILED";
}

export interface ProductVisualContext {
  sku: string;
  name: string;
  brand: string;
  deviceType?: string;
  environment?: string;
  officialImageUrl?: string;
}

/**
 * Visual Editorial Planner
 * Genera de forma dinámica las recomendaciones de fotografía/diagramas
 * basadas en el contenido real del artículo y las especificaciones del producto.
 */
export function planArticleVisuals(
  sections: Array<{ id?: string; title: string; contentType?: string; bodyHtml?: string }>,
  product: ProductVisualContext
): { photoPlacements: PhotoPlacement[]; htmlWithSlots: string } {
  const photoPlacements: PhotoPlacement[] = [];
  const processedSections: string[] = [];

  const brand = product.brand || "EnGenius";
  const sku = product.sku || "PROD-1";
  const name = product.name || sku;
  const deviceType = product.deviceType || "B2B networking hardware";

  // 1. Imagen Hero / Producto Contextual para la primera sección
  const firstSec = sections[0];
  const heroId = `photo-01-${sku.toLowerCase()}`;
  photoPlacements.push({
    id: heroId,
    placementAfterHeading: firstSec ? firstSec.title : "Introducción",
    afterSectionId: firstSec?.id || "sec-1",
    position: "AFTER_SECTION",
    photoType: "PRODUCT_HERO",
    aspectRatio: "16:9",
    description: `Fotografía comercial principal del producto ${brand} ${name} (${sku}) en entorno profesional.`,
    imagen3Prompt: `Professional B2B product photography of ${brand} ${name} (${sku}) ${deviceType}, high quality studio lighting, metallic details, clean corporate background, 8k resolution, photorealistic.`,
    productSku: sku,
    requiresReferenceProductImage: !!product.officialImageUrl,
    altText: `${brand} ${name} ${sku} ${deviceType}`,
    caption: `Vista principal de ${brand} ${name} (${sku}) diseñado para despliegues profesionales.`,
    status: "PENDING"
  });

  // Slot 1 HTML
  const slot1Html = `\n<figure class="blog-image-slot my-8 p-4 bg-slate-900 border border-slate-800 rounded-xl" data-image-id="${heroId}" data-placement-after="${firstSec?.id || "sec-1"}">
  <img src="{{IMAGE:${heroId}}}" alt="${brand} ${name} ${sku}" class="w-full h-auto rounded-lg shadow-lg object-cover" />
  <figcaption class="mt-2 text-xs text-slate-400 text-center font-sans">Vista principal de ${brand} ${name} (${sku})</figcaption>
</figure>\n`;

  // Iterar sobre secciones intermedias para agregar fotos contextuales o diagramas
  sections.forEach((sec, idx) => {
    let secHtml = sec.bodyHtml || "";

    if (idx === 0) {
      secHtml = secHtml + slot1Html;
    } else if (idx === 2 || (sections.length > 3 && idx === Math.floor(sections.length / 2))) {
      const isDiagram = sec.contentType === "TOPOLOGY_DIAGRAM" || sec.title.toLowerCase().includes("topolog") || sec.title.toLowerCase().includes("arquitectura");
      const photoId = `photo-0${idx + 1}-${sku.toLowerCase()}`;
      const photoType = isDiagram ? "TECHNICAL_DIAGRAM" : "PRODUCT_CONTEXT";

      const placement: PhotoPlacement = {
        id: photoId,
        placementAfterHeading: sec.title,
        afterSectionId: sec.id || `sec-${idx + 1}`,
        position: "AFTER_SECTION",
        photoType,
        aspectRatio: "16:9",
        description: isDiagram
          ? `Diagrama de arquitectura y topología de red para ${brand} ${sku}.`
          : `Escena de instalación en rack/servidor del ${brand} ${name} (${sku}).`,
        imagen3Prompt: isDiagram
          ? `Detailed technical network topology diagram showing ${brand} ${sku} deployment, clean vectors, high contrast, professional IT presentation.`
          : `Professional IT environment, network technician installing ${brand} ${sku} into a server rack, Ethernet cabling, PoE LED indicators, photorealistic.`,
        productSku: sku,
        requiresReferenceProductImage: false,
        altText: isDiagram ? `Diagrama de red ${brand} ${sku}` : `Instalación de ${brand} ${sku}`,
        caption: isDiagram ? `Arquitectura de red recomendada con ${brand} ${sku}` : `Despliegue de ${brand} ${sku} en entorno real`,
        status: "PENDING"
      };

      photoPlacements.push(placement);

      const slotHtml = `\n<figure class="blog-image-slot my-8 p-4 bg-slate-900 border border-slate-800 rounded-xl" data-image-id="${photoId}" data-placement-after="${sec.id || `sec-${idx + 1}`}">
  <img src="{{IMAGE:${photoId}}}" alt="${placement.altText}" class="w-full h-auto rounded-lg shadow-lg object-cover" />
  <figcaption class="mt-2 text-xs text-slate-400 text-center font-sans">${placement.caption}</figcaption>
</figure>\n`;

      secHtml = secHtml + slotHtml;
    }

    processedSections.push(secHtml);
  });

  return {
    photoPlacements,
    htmlWithSlots: processedSections.join("\n\n")
  };
}
