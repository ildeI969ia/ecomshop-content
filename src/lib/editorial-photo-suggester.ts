import { PhotoPlacement } from "@/lib/services/visual-planner";

export interface EditableArticleSection {
  id: string;
  index: number;
  headingText: string;
  bodyHtml: string;
  existingImage?: {
    imageUrl: string;
    altText: string;
    caption: string;
  };
  suggestedPhoto: {
    recommended: boolean;
    photoType: "TECHNICAL_DIAGRAM" | "INSTALLATION" | "PRODUCT_DETAIL" | "ENVIRONMENT" | "COMPARISON";
    badgeLabel: string;
    editorialReason: string;
    suggestedPrompt: string;
    suggestedAlt: string;
    suggestedCaption: string;
    aspectRatio: "16:9" | "4:3" | "1:1";
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function detectSkuHardwareContext(sku: string): {
  hwDescription: string;
  environmentDesc: string;
  portsDesc: string;
} {
  const upper = sku.trim().toUpperCase();
  if (upper.includes("ENSTATION") || upper.includes("ENH") || upper.includes("EWS8") || upper.includes("OUTDOOR") || upper.includes("546")) {
    return {
      hwDescription: `outdoor rugged IP67 directional wireless CPE/bridge access point (${sku}) with weatherproof white enclosure`,
      environmentDesc: "mounted on an exterior telecommunications mast overlooking an industrial campus or building-to-building PtP link",
      portsDesc: "weatherproof PoE Gigabit Ethernet port gland, mounting bracket and alignment LED indicators"
    };
  }
  if (upper.startsWith("ECW") || upper.startsWith("EWS") || upper.includes("AP")) {
    return {
      hwDescription: `sleek enterprise ceiling-mounted Wi-Fi access point (${sku}) with low-profile matte white industrial design`,
      environmentDesc: "installed on a modern corporate office or high-density conference hall ceiling with clean structured cabling",
      portsDesc: "Multi-Gigabit PoE++ RJ45 uplink port and subtle status LED indicator"
    };
  }
  if (upper.startsWith("ECS") || upper.startsWith("EGS") || upper.includes("SWITCH") || upper.startsWith("ST3") || upper.startsWith("S2")) {
    return {
      hwDescription: `19-inch rackmount enterprise managed PoE switch (${sku}) in brushed dark metal chassis`,
      environmentDesc: "installed inside an organized data center telecommunications rack with neat Cat6A patch cords and fiber uplinks",
      portsDesc: "high-density RJ45 PoE+ ports with active amber/green link LEDs and 10G SFP+ fiber transceiver slots"
    };
  }
  if (upper.startsWith("ESG") || upper.startsWith("RUT") || upper.startsWith("TRB") || upper.includes("GATEWAY")) {
    return {
      hwDescription: `enterprise SD-WAN security gateway / industrial router (${sku}) in compact metallic enclosure`,
      environmentDesc: "deployed in a corporate wiring closet or industrial telemetry cabinet with redundant WAN connections",
      portsDesc: "dual WAN/LAN Gigabit ports, SFP uplink, and status telemetry LEDs"
    };
  }
  if (upper.includes("DAC") || upper.includes("SFP") || upper.includes("FIB")) {
    return {
      hwDescription: `high-speed 10G SFP+ direct attach copper / optical transceiver connectivity (${sku})`,
      environmentDesc: "interconnecting top-of-rack switches inside a clean high-density server rack",
      portsDesc: "precision metallic SFP+ connector latched into switch uplink cage"
    };
  }
  return {
    hwDescription: `professional B2B telecommunications networking hardware (${sku})`,
    environmentDesc: "deployed in a clean enterprise IT infrastructure environment",
    portsDesc: "professional Ethernet and fiber networking interfaces with active status indicators"
  };
}

export function buildSectionPhotoSuggestion(
  sku: string,
  headingText: string,
  sectionHtml: string,
  sectionIndex: number,
  existingPlacement?: PhotoPlacement
): EditableArticleSection["suggestedPhoto"] {
  const hw = detectSkuHardwareContext(sku);
  const textLower = `${headingText} ${stripTags(sectionHtml)}`.toLowerCase();

  if (existingPlacement?.imagen3Prompt) {
    return {
      recommended: true,
      photoType: "ENVIRONMENT",
      badgeLabel: existingPlacement.photoType || "FOTOGRAFÍA TÉCNICA",
      editorialReason: existingPlacement.description || `Ilustración técnica tras "${headingText}"`,
      suggestedPrompt: existingPlacement.imagen3Prompt,
      suggestedAlt: existingPlacement.altText || `${sku} - ${headingText}`,
      suggestedCaption: existingPlacement.caption || existingPlacement.description || `${sku} en despliegue profesional`,
      aspectRatio: (existingPlacement.aspectRatio as "16:9" | "4:3" | "1:1") || "16:9"
    };
  }

  // 1. Arquitectura / Topología / Enlaces PtP / Cuello de botella / Backhaul
  if (
    textLower.includes("arquitectura") ||
    textLower.includes("topolog") ||
    textLower.includes("ptp") ||
    textLower.includes("ptmp") ||
    textLower.includes("backhaul") ||
    textLower.includes("uplink") ||
    textLower.includes("cuello de botella") ||
    textLower.includes("diseño")
  ) {
    return {
      recommended: true,
      photoType: "TECHNICAL_DIAGRAM",
      badgeLabel: "Arquitectura / Despliegue Técnico",
      editorialReason: `Aquí conviene insertar una imagen que visualice la arquitectura o el enlace de red explicado en "${headingText || "esta sección"}" para cortar el bloque de texto técnico.`,
      suggestedPrompt: `Photorealistic B2B telecommunications visualization of ${hw.hwDescription}, ${hw.environmentDesc}, illustrating high-capacity wireless/wired backhaul architecture, crisp lighting, technical precision, 8k resolution, no text overlays.`,
      suggestedAlt: `Arquitectura de despliegue de ${sku} - ${headingText || "Topología B2B"}`,
      suggestedCaption: `Escenario de arquitectura y dimensionamiento de enlace con ${sku} en entorno profesional.`,
      aspectRatio: "16:9"
    };
  }

  // 2. Instalación / Montaje / Obra / PoE / Cableado / Exterior
  if (
    textLower.includes("instalaci") ||
    textLower.includes("montaje") ||
    textLower.includes("despliegue") ||
    textLower.includes("campo") ||
    textLower.includes("poe") ||
    textLower.includes("cableado") ||
    textLower.includes("exterior") ||
    textLower.includes("mastil") ||
    textLower.includes("rack")
  ) {
    return {
      recommended: true,
      photoType: "INSTALLATION",
      badgeLabel: "Fotografía de Instalación en Campo",
      editorialReason: `Punto clave para mostrar cómo queda instalado físicamente el ${sku} y reforzar la confianza del instalador o ingeniero.`,
      suggestedPrompt: `Professional field installation photograph of ${hw.hwDescription}, ${hw.environmentDesc}, showing clean PoE structured cabling and weather-sealed mounting hardware, natural industrial lighting, 8k photorealistic.`,
      suggestedAlt: `Instalación profesional de ${sku} en infraestructura real`,
      suggestedCaption: `Montaje e integración física de ${sku} siguiendo buenas prácticas de ingeniería.`,
      aspectRatio: "16:9"
    };
  }

  // 3. Puertos / Hardware / Especificaciones / Rendimiento / Capacidad
  if (
    textLower.includes("puerto") ||
    textLower.includes("interfaz") ||
    textLower.includes("rendimiento") ||
    textLower.includes("velocidad") ||
    textLower.includes("capacidad") ||
    textLower.includes("especificaci") ||
    textLower.includes("hardware") ||
    textLower.includes("validaci")
  ) {
    return {
      recommended: sectionIndex % 2 === 1 || sectionIndex === 0,
      photoType: "PRODUCT_DETAIL",
      badgeLabel: "Detalle de Hardware y Conectividad",
      editorialReason: `Una toma cercana del hardware y sus interfaces (${sku}) ayuda al lector técnico a verificar visualmente la calidad constructiva y conectividad.`,
      suggestedPrompt: `Macro close-up studio & engineering photograph of ${hw.hwDescription}, focusing on ${hw.portsDesc}, sharp depth of field, high-end industrial hardware photography, 8k.`,
      suggestedAlt: `Detalle técnico de interfaces y chasis de ${sku}`,
      suggestedCaption: `Detalle de construcción e interfaces físicas del equipo ${sku}.`,
      aspectRatio: "16:9"
    };
  }

  // Por defecto para secciones pares o conclusión
  return {
    recommended: sectionIndex === 0 || sectionIndex === 2,
    photoType: "ENVIRONMENT",
    badgeLabel: "Fotografía de Contexto B2B",
    editorialReason: `Añadir apoyo visual tras "${headingText || `Sección ${sectionIndex + 1}`}" mejora la retención de lectura y el SEO de imágenes (Google Lens / Discover).`,
    suggestedPrompt: `Editorial B2B photograph of ${hw.hwDescription}, ${hw.environmentDesc}, modern enterprise telecommunications aesthetic, cinematic lighting, 8k photorealistic.`,
    suggestedAlt: `${sku} en entorno empresarial - ${headingText || "Conectividad B2B"}`,
    suggestedCaption: `Implementación profesional de ${sku} en infraestructuras de telecomunicaciones.`,
    aspectRatio: "16:9"
  };
}

/**
 * Divide el HTML del artículo en secciones editables basadas en encabezados <h2>
 * y extrae cualquier <figure> o <img> ya presente al final de cada sección.
 */
export function parseHtmlIntoEditableSections(
  html: string,
  sku: string,
  existingPlacements: PhotoPlacement[] = []
): EditableArticleSection[] {
  const cleanHtml = (html || "").trim();
  if (!cleanHtml) {
    const sug = buildSectionPhotoSuggestion(sku, "Introducción", "", 0, existingPlacements[0]);
    return [
      {
        id: "sec-0",
        index: 0,
        headingText: "",
        bodyHtml: "<p>Escribe aquí el contenido del artículo...</p>",
        suggestedPhoto: sug
      }
    ];
  }

  // Dividir por bloques que comienzan en <h2...
  const parts = cleanHtml.split(/(?=<h2[\s>])/i).filter((p) => p.trim().length > 0);

  return parts.map((rawPart, idx) => {
    let workingPart = rawPart.trim();
    let headingText = "";

    const h2Match = workingPart.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (h2Match) {
      headingText = stripTags(h2Match[1]);
    }

    // Detectar si ya existe un <figure ...> con <img ...> en esta sección
    let existingImage: EditableArticleSection["existingImage"] | undefined;
    const figureRegex = /<figure[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<\/figure>/i;
    const figMatch = workingPart.match(figureRegex);

    if (figMatch) {
      const fullFigure = figMatch[0];
      const imgSrc = figMatch[1];
      const altMatch = fullFigure.match(/alt=["']([^"']*)["']/i);
      const capMatch = fullFigure.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);

      if (imgSrc && !imgSrc.includes("{{IMAGE:")) {
        existingImage = {
          imageUrl: imgSrc,
          altText: altMatch ? altMatch[1] : `${sku} - ${headingText || "Imagen técnica"}`,
          caption: capMatch ? stripTags(capMatch[1]) : `${sku} - ${headingText}`
        };
      }
      // Quitar el figure del bodyHtml editable para que se gestione limpiamente en la tarjeta visual de la sección
      workingPart = workingPart.replace(fullFigure, "").trim();
    }

    const matchingPlacement = existingPlacements.find(
      (p) =>
        p.photoType !== "PRODUCT_HERO" &&
        headingText &&
        p.placementAfterHeading &&
        p.placementAfterHeading.toLowerCase() === headingText.toLowerCase()
    );

    const suggestedPhoto = buildSectionPhotoSuggestion(
      sku,
      headingText,
      workingPart,
      idx,
      matchingPlacement
    );

    return {
      id: `sec-${idx}`,
      index: idx,
      headingText,
      bodyHtml: workingPart,
      existingImage,
      suggestedPhoto
    };
  });
}

/**
 * Reconstruye el HTML completo a partir de las secciones editables y sus imágenes insertadas.
 */
export function serializeEditableSectionsToHtml(sections: EditableArticleSection[]): string {
  return sections
    .map((sec) => {
      const baseHtml = sec.bodyHtml.trim();
      if (!sec.existingImage || !sec.existingImage.imageUrl) {
        return baseHtml;
      }
      const safeAlt = sec.existingImage.altText.replace(/"/g, "&quot;");
      const figureHtml = `\n<figure class="blog-image-slot my-8 p-4 bg-slate-900/5 border border-slate-200 rounded-xl" data-image-id="inline-${sec.id}">
  <img src="${sec.existingImage.imageUrl}" alt="${safeAlt}" class="w-full h-auto rounded-lg shadow-md object-cover" />
  <figcaption class="mt-2 text-xs text-slate-600 text-center font-sans">${sec.existingImage.caption}</figcaption>
</figure>`;
      return `${baseHtml}${figureHtml}`;
    })
    .join("\n\n");
}
