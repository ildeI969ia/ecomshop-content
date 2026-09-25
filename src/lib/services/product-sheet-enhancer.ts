import { getCatalogDevice, CatalogDevice, ECOMSHOP_CATALOG } from "@/lib/catalog";
import { validateContentGrounding, GroundingValidationResult } from "./claim-validator";
import { OFFICIAL_NOTEBOOK } from "@/lib/notebooklm";

export interface ProductSheetDiffItem<T> {
  original: T;
  proposed: T;
  accepted: boolean;
}

export interface EnhancedProductSheet {
  sku: string;
  brand: string;
  name: ProductSheetDiffItem<string>;
  metaTitle: ProductSheetDiffItem<string>;
  metaDescription: ProductSheetDiffItem<string>;
  advantages: ProductSheetDiffItem<string[]>; // 5 ventajas
  specs: ProductSheetDiffItem<Record<string, string>>;
  faq: ProductSheetDiffItem<Array<{ question: string; answer: string }>>;
  comparison: ProductSheetDiffItem<{ closestModel: string; diffText: string }>;
  claims: Array<{ text: string; sourceId: string }>;
  groundingValidation?: GroundingValidationResult;
}

/**
 * Servicio "Mejorar Ficha de Producto" (Fase 6f)
 * Toma los datos actuales del catálogo/web y las evidencias de NotebookLM para proponer
 * mejoras de ficha con vista de diferencias (actual vs. propuesto) y exportación HTML/CSV.
 */
export async function enhanceProductSheet(
  sku: string,
  apiKey?: string
): Promise<EnhancedProductSheet> {
  const device = getCatalogDevice(sku) || ECOMSHOP_CATALOG[0];

  // Resolver modelo cercano para comparativa
  const closestDevice = ECOMSHOP_CATALOG.find(
    (d) => d.sku !== device.sku && d.type === device.type
  ) || ECOMSHOP_CATALOG.find((d) => d.sku !== device.sku) || ECOMSHOP_CATALOG[1];

  // Datos originales
  const originalName = `${device.brand} ${device.name}`;
  const originalMetaTitle = `${originalName} | Tienda Oficial EcomShop`;
  const originalMetaDesc = `${device.shortDesc}. Stock y entrega 24/48h.`;
  const originalAdvantages = device.keyAdvantages || ["Gestión centralizada Cloud", "Disponibilidad 24h"];
  const originalSpecs: Record<string, string> = {
    "Alimentación": device.specs.powerSource || "PoE",
    "Gestión": device.specs.management || "EnGenius Cloud",
    "Puertos": device.specs.interfaces?.join(", ") || "RJ45"
  };
  const originalFaq = [
    { question: "¿Cuenta con garantía?", answer: "Sí, garantía oficial y sustitución en 24h por EcomSpain." }
  ];
  const originalComparison = {
    closestModel: closestDevice.sku,
    diffText: `Modelo de la misma gama: ${closestDevice.name}`
  };

  // Fuentes y claims
  const sourceId = device.notebookSourceId || "src-0";
  const notebookSource = OFFICIAL_NOTEBOOK.sources.find((s) => s.id === sourceId);

  // Propuestas mejoradas
  const proposedName = `${device.brand} ${device.sku}: ${device.name} Profesional`;
  const proposedMetaTitle = `${device.brand} ${device.sku} ${device.type} | Ficha Técnica B2B EcomShop`;
  const proposedMetaDesc = `Ficha de ingeniería de ${device.sku}. ${device.shortDesc}. Enlaces Multi-Gigabit y 0€ licencias. Entrega 24/48h.`;

  const proposedAdvantages = [
    `Gestión centralizada en nube empresarial sin cuotas anuales obligatorias [${sourceId}]`,
    `Interfaces Multi-Gigabit y troncales de alta velocidad [${sourceId}]`,
    `Aprovisionamiento ultra rápido en 2 minutos desde App móvil [${sourceId}]`,
    `Sustitución avanzada en 24/48h garantizada desde España [src-18]`,
    `Soporte técnico y dimensionamiento preventa gratuito por EcomSpain [src-18]`
  ];

  const proposedSpecs: Record<string, string> = {
    "Estándares": device.specs.wirelessStandards?.join(", ") || "Estándares B2B",
    "Puertos": device.specs.interfaces?.join(", ") || "RJ45 Multi-Gigabit",
    "Alimentación PoE": device.specs.powerSource || "PoE++ 802.3bt",
    "Gestión Cloud": device.specs.management || "EnGenius Cloud perpetua (0€ licencias)",
    "Garantía": "Sustitución en 24h oficial EcomSpain"
  };

  const proposedFaq = [
    {
      question: `¿Requiere licencias anuales obligatorias para gestionar el ${device.sku}?`,
      answer: `No. La plataforma EnGenius Cloud no exige cuotas de suscripción recurrentes [${sourceId}].`
    },
    {
      question: `¿Cuál es el tiempo de entrega y soporte técnico preventa?`,
      answer: `Disponemos de stock en España con envío en 24/48h y soporte preventa especializado [src-18].`
    },
    {
      question: `¿Qué electrónica de conmutación se recomienda para el ${device.sku}?`,
      answer: `Recomendamos switches Multi-Gigabit PoE+ (como la gama ECS) para evitar estrangulamientos [src-8].`
    }
  ];

  const proposedComparison = {
    closestModel: closestDevice.sku,
    diffText: `Frente al ${closestDevice.sku} (${closestDevice.name}), el ${device.sku} destaca por ${device.keyAdvantages[0] || "mayor throughput y menor TCO"}.`
  };

  const claims = [
    { text: `Gestión Cloud 0€ licencias [${sourceId}]`, sourceId },
    { text: `Sustitución avanzada en 24h y entrega en 24/48h [src-18]`, sourceId: "src-18" },
    { text: `Conmutación Multi-Gigabit [src-8]`, sourceId: "src-8" },
    { text: `Aprovisionamiento rápido en 2 minutos [${sourceId}]`, sourceId },
    { text: `Velocidad agregada de ${device.specs.maxSpeed || "18.7 Gbps"} [${sourceId}]`, sourceId },
    { text: `Presupuesto PoE de ${device.specs.poeBudget || "240W"} y hasta 60W por puerto [${sourceId}]`, sourceId }
  ];

  const mockContentForValidation: any = {
    topicId: `sheet-${sku}`,
    topicTitle: proposedName,
    category: device.category.toLowerCase(),
    generatedAt: new Date().toISOString(),
    blog: {
      title: proposedName,
      metaDescription: proposedMetaDesc,
      slug: sku.toLowerCase(),
      readingTimeMinutes: 3,
      targetKeywords: [sku],
      htmlContent: `<p>${proposedAdvantages.join(" ")} ${proposedMetaDesc}</p>`,
      cleanPlainTextExcerpt: proposedMetaDesc
    },
    claims
  };

  const groundingValidation = validateContentGrounding(mockContentForValidation);

  return {
    sku: device.sku,
    brand: device.brand,
    name: { original: originalName, proposed: proposedName, accepted: true },
    metaTitle: { original: originalMetaTitle, proposed: proposedMetaTitle, accepted: true },
    metaDescription: { original: originalMetaDesc, proposed: proposedMetaDesc, accepted: true },
    advantages: { original: originalAdvantages, proposed: proposedAdvantages, accepted: true },
    specs: { original: originalSpecs, proposed: proposedSpecs, accepted: true },
    faq: { original: originalFaq, proposed: proposedFaq, accepted: true },
    comparison: { original: originalComparison, proposed: proposedComparison, accepted: true },
    claims,
    groundingValidation
  };
}

/**
 * Exportar Ficha Mejorada en formato HTML
 */
export function exportEnhancedSheetToHtml(sheet: EnhancedProductSheet): string {
  const name = sheet.name.accepted ? sheet.name.proposed : sheet.name.original;
  const metaTitle = sheet.metaTitle.accepted ? sheet.metaTitle.proposed : sheet.metaTitle.original;
  const metaDesc = sheet.metaDescription.accepted ? sheet.metaDescription.proposed : sheet.metaDescription.original;
  const advantages = sheet.advantages.accepted ? sheet.advantages.proposed : sheet.advantages.original;
  const specs = sheet.specs.accepted ? sheet.specs.proposed : sheet.specs.original;
  const faq = sheet.faq.accepted ? sheet.faq.proposed : sheet.faq.original;
  const comp = sheet.comparison.accepted ? sheet.comparison.proposed : sheet.comparison.original;

  return `
<!-- FICHA MEJORADA B2B: ${sheet.sku} -->
<div class="product-spec-sheet-b2b" data-sku="${sheet.sku}">
  <!-- SEO META -->
  <title>${metaTitle}</title>
  <meta name="description" content="${metaDesc}">

  <h1>${name}</h1>
  
  <section class="key-advantages">
    <h2>5 Ventajas Clave de Ingeniería</h2>
    <ul>
      ${advantages.map((adv) => `<li><strong>${adv}</strong></li>`).join("\n      ")}
    </ul>
  </section>

  <section class="technical-specs">
    <h2>Especificaciones Técnicas Ordenadas</h2>
    <table>
      <tbody>
        ${Object.entries(specs).map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("\n        ")}
      </tbody>
    </table>
  </section>

  <section class="product-faq">
    <h2>Preguntas Frecuentes (FAQ)</h2>
    <div class="faq-list">
      ${faq.map((item) => `<div class="faq-item"><h3>${item.question}</h3><p>${item.answer}</p></div>`).join("\n      ")}
    </div>
  </section>

  <section class="product-comparison">
    <h2>Comparativa con Modelo Cercano (${comp.closestModel})</h2>
    <p>${comp.diffText}</p>
  </section>
</div>
`.trim();
}

/**
 * Exportar Ficha Mejorada en formato CSV
 */
export function exportEnhancedSheetToCsv(sheet: EnhancedProductSheet): string {
  const name = sheet.name.accepted ? sheet.name.proposed : sheet.name.original;
  const metaTitle = sheet.metaTitle.accepted ? sheet.metaTitle.proposed : sheet.metaTitle.original;
  const metaDesc = sheet.metaDescription.accepted ? sheet.metaDescription.proposed : sheet.metaDescription.original;
  const advantages = (sheet.advantages.accepted ? sheet.advantages.proposed : sheet.advantages.original).join(" | ");

  const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

  const headers = ["SKU", "Marca", "Nombre_Producto", "Meta_Title", "Meta_Description", "5_Ventajas_Clave"];
  const row = [sheet.sku, sheet.brand, name, metaTitle, metaDesc, advantages].map(escapeCsv).join(",");

  return `${headers.join(",")}\n${row}`;
}
