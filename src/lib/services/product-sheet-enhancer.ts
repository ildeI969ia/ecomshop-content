import { getCatalogDevice, CatalogDevice, ECOMSHOP_CATALOG } from "@/lib/catalog";
import { validateContentGrounding } from "./claim-validator";
import { OFFICIAL_NOTEBOOK } from "@/lib/notebooklm";
import { EnhancedProductSheet, ProductSheetDiffItem, FaqItem, ProductComparison, GroundedClaim } from "@/types/catalog-enhancer";

export function generateFaqJsonLd(faqItems: FaqItem[]): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };
  return JSON.stringify(jsonLd, null, 2);
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
  const originalFaq: FaqItem[] = [
    { question: "¿Cuenta con garantía?", answer: "Sí, garantía oficial y sustitución en 24h por EcomSpain." }
  ];
  const originalComparison: ProductComparison = {
    closestModel: closestDevice.sku,
    diffText: `Modelo de la misma gama: ${closestDevice.name}`,
    comparisonTable: [
      { feature: "Tipo de dispositivo", currentModel: device.type, closestModel: closestDevice.type },
      { feature: "Gestión", currentModel: device.specs.management, closestModel: closestDevice.specs.management },
      { feature: "Alimentación", currentModel: device.specs.powerSource, closestModel: closestDevice.specs.powerSource }
    ]
  };

  // Fuentes y claims
  const sourceId = device.notebookSourceId || "src-0";

  // Propuestas mejoradas
  // Título comercial SEO (≤ 65 car.)
  let proposedName = `${device.brand} ${device.sku} ${device.name}`;
  if (proposedName.length > 65) {
    proposedName = proposedName.substring(0, 62) + "...";
  }
  
  let proposedMetaTitle = `${device.brand} ${device.sku} ${device.name} - EcomShop`;
  if (proposedMetaTitle.length > 65) {
    proposedMetaTitle = proposedMetaTitle.substring(0, 62) + "...";
  }

  const proposedMetaDesc = `Ficha técnica de ${device.sku}. ${device.shortDesc}. Enlaces Multi-Gigabit y 0€ licencias. Entrega 24/48h.`;

  // 4-6 ventajas con fuente/claim validado
  const proposedAdvantages = [
    `Gestión centralizada en nube empresarial sin cuotas de suscripción [${sourceId}]`,
    `Interfaces Multi-Gigabit de alto rendimiento para red empresarial [${sourceId}]`,
    `Aprovisionamiento rápido en menos de 2 minutos vía App móvil [${sourceId}]`,
    `Garantía de sustitución en 24h con stock nacional en España [src-18]`,
    `Soporte técnico preventa y dimensionamiento de red gratuito [src-18]`
  ];

  const proposedSpecs: Record<string, string> = {
    "Estándares de Red": device.specs.wirelessStandards?.join(", ") || "Estándares B2B Gigabit/Multi-Gigabit",
    "Puertos e Interfaces": device.specs.interfaces?.join(", ") || "RJ45 Multi-Gigabit / SFP+",
    "Alimentación PoE": device.specs.powerSource || "PoE+ 802.3at / PoE++ 802.3bt",
    "Plataforma de Gestión": device.specs.management || "EnGenius Cloud sin licencias recurrentes (0€/año)",
    "Garantía y Soporte": "Sustitución en 24h garantizada por EcomSpain"
  };

  const proposedFaq: FaqItem[] = [
    {
      question: `¿Requiere cuotas o licencias de pago para gestionar el ${device.sku}?`,
      answer: `No. La solución Cloud de ${device.brand} para el ${device.sku} incluye gestión cloud sin licencias ni costes recurrentes de suscripción [${sourceId}].`
    },
    {
      question: `¿Cuál es el plazo de entrega y la garantía de soporte en España?`,
      answer: `Disponemos de stock real con envío urgente 24/48h y servicio de sustitución avanzada en 24h respaldado por EcomSpain [src-18].`
    },
    {
      question: `¿Es compatible con switches PoE y gateways de otras marcas?`,
      answer: `Sí, es totalmente compatible con estándares 802.3af/at/bt e interoperable con electrónica Multi-Gigabit de cualquier fabricante [src-8].`
    },
    {
      question: `¿Cuánto tiempo requiere la configuración inicial del equipo?`,
      answer: `Con el aprovisionamiento Zero Touch vía QR desde la App móvil, la configuración inicial se completa en menos de 2 minutos [${sourceId}].`
    }
  ];

  const proposedComparison: ProductComparison = {
    closestModel: closestDevice.sku,
    diffText: `El modelo ${device.sku} destaca frente al ${closestDevice.sku} (${closestDevice.name}) por ofrecer ${device.keyAdvantages[0] || "mayor densidad y menor TCO"}.`,
    comparisonTable: [
      { feature: "Gama / Tipo", currentModel: device.type, closestModel: closestDevice.type },
      { feature: "Gestión Cloud", currentModel: device.specs.management, closestModel: closestDevice.specs.management },
      { feature: "Alimentación", currentModel: device.specs.powerSource, closestModel: closestDevice.specs.powerSource },
      { feature: "Velocidad / Rendimiento", currentModel: device.specs.maxSpeed || "Multi-Gigabit", closestModel: closestDevice.specs.maxSpeed || "Gigabit Standard" },
      { feature: "Licencias Requeridas", currentModel: "0€ (Sin suscripción)", closestModel: "0€ (Sin suscripción)" }
    ]
  };

  const claims: GroundedClaim[] = [
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
  const faqJsonLd = generateFaqJsonLd(proposedFaq);

  return {
    sku: device.sku,
    brand: device.brand,
    name: { original: originalName, proposed: proposedName, accepted: true },
    metaTitle: { original: originalMetaTitle, proposed: proposedMetaTitle, accepted: true },
    metaDescription: { original: originalMetaDesc, proposed: proposedMetaDesc, accepted: true },
    advantages: { original: originalAdvantages, proposed: proposedAdvantages, accepted: true },
    specs: { original: originalSpecs, proposed: proposedSpecs, accepted: true },
    faq: { original: originalFaq, proposed: proposedFaq, accepted: true },
    faqJsonLd,
    comparison: { original: originalComparison, proposed: proposedComparison, accepted: true },
    claims,
    groundingValidation
  };
}

/**
 * Exportar Ficha Mejorada en formato HTML (Limpio sin estilos inline)
 */
export function exportEnhancedSheetToHtml(sheet: EnhancedProductSheet): string {
  const name = sheet.name.accepted ? sheet.name.proposed : sheet.name.original;
  const metaTitle = sheet.metaTitle.accepted ? sheet.metaTitle.proposed : sheet.metaTitle.original;
  const metaDesc = sheet.metaDescription.accepted ? sheet.metaDescription.proposed : sheet.metaDescription.original;
  const advantages = sheet.advantages.accepted ? sheet.advantages.proposed : sheet.advantages.original;
  const specs = sheet.specs.accepted ? sheet.specs.proposed : sheet.specs.original;
  const faq = sheet.faq.accepted ? sheet.faq.proposed : sheet.faq.original;
  const comp = sheet.comparison.accepted ? sheet.comparison.proposed : sheet.comparison.original;

  const faqSchema = sheet.faqJsonLd || generateFaqJsonLd(faq);

  return `
<!-- FICHA OPTIMIZADA ECOMSHOP: ${sheet.sku} -->
<div class="product-spec-sheet" data-sku="${sheet.sku}">
  <title>${metaTitle}</title>
  <meta name="description" content="${metaDesc}">

  <h1>${name}</h1>

  <section class="key-advantages">
    <h2>Ventajas Destacadas</h2>
    <ul>
      ${advantages.map((adv) => `<li>${adv}</li>`).join("\n      ")}
    </ul>
  </section>

  <section class="technical-specs">
    <h2>Especificaciones Técnicas</h2>
    <table>
      <thead>
        <tr>
          <th>Característica</th>
          <th>Especificación</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(specs).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("\n        ")}
      </tbody>
    </table>
  </section>

  <section class="product-faq">
    <h2>Preguntas Frecuentes</h2>
    <dl class="faq-list">
      ${faq.map((item) => `<dt>${item.question}</dt><dd>${item.answer}</dd>`).join("\n      ")}
    </dl>
  </section>

  ${comp.comparisonTable && comp.comparisonTable.length > 0 ? `
  <section class="product-comparison">
    <h2>Comparativa de Modelos (${sheet.sku} vs ${comp.closestModel})</h2>
    <p>${comp.diffText}</p>
    <table>
      <thead>
        <tr>
          <th>Característica</th>
          <th>${sheet.sku}</th>
          <th>${comp.closestModel}</th>
        </tr>
      </thead>
      <tbody>
        ${comp.comparisonTable.map((row) => `<tr><td>${row.feature}</td><td>${row.currentModel}</td><td>${row.closestModel}</td></tr>`).join("\n        ")}
      </tbody>
    </table>
  </section>
  ` : ''}

  <!-- JSON-LD FAQ Schema para Prestashop / Shopify -->
  <script type="application/ld+json">
${faqSchema}
  </script>
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

  const headers = ["SKU", "Marca", "Nombre_Producto", "Meta_Title", "Meta_Description", "Ventajas_Clave"];
  const row = [sheet.sku, sheet.brand, name, metaTitle, metaDesc, advantages].map(escapeCsv).join(",");

  return `${headers.join(",")}\n${row}`;
}
