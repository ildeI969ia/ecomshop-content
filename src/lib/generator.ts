import { ContentOutput, GenerateRequest } from "./schema";
import { ECOM_BRAND, PRESET_TOPICS, STAR_PRODUCTS } from "./knowledge";
import { STRATEGIC_AGENT_SYSTEM_PROMPT } from "./gemini-agent";

export async function generateB2BContent(req: GenerateRequest & { apiKey?: string }): Promise<ContentOutput> {
  const apiKey = req.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    try {
      return await generateWithGeminiAPI(req, apiKey);
    } catch (err) {
      console.warn("Error calling Gemini API, falling back to deterministic high-quality B2B generator:", err);
    }
  }

  // Fallback de alta fidelidad técnica (modo offline o sin API key inmediata)
  return generateDeterministicFallback(req);
}

async function generateWithGeminiAPI(req: GenerateRequest, apiKey: string): Promise<ContentOutput> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
Eres el Director de Estrategia de Contenidos y Jefe de Ingeniería Preventa de ${ECOM_BRAND.name} (${ECOM_BRAND.description}).
Tu misión es redactar artículos técnicos de blog y campañas multicanal con altísimo rigor técnico, novedad y relevancia para 4 perfiles clave de clientes:
1. INSTALADORES DE TELECOMUNICACIONES: Preocupados por tiempos de despliegue, aprovisionamiento cloud con QR, presupuesto PoE 802.3bt, certificación de cableado y evitar visitas recurrentes de soporte.
2. DIRECTORES DE TIC / RESPONSABLES DE SISTEMAS: Preocupados por seguridad WPA3 Enterprise, latencia, VLANs, control centralizado y CERO LICENCIAS recurrentes obligatorias (ventaja competitiva de EnGenius Cloud).
3. JEFES DE COMPRAS: Preocupados por márgenes comerciales netos, TCO a 3-5 años frente a marcas con suscripciones abusivas (Cisco Meraki, etc.), stock permanente en España y entregas en 24h.
4. DISTRIBUIDORES / MAYORISTAS: Preocupados por condiciones profesionales de distribución, rotación de producto y escalabilidad de gama.

DIRECTRICES EDITORIALES PARA EL BLOG (DURABLE CMS):
1. El HTML del blog debe ser semántico, limpio y visualmente atractivo.
2. Debe contener marcadores gráficos recomendando EXACTAMENTE DÓNDE COLOCAR FOTOS y CTAs:
   - Bloque de foto recomendada:
     <div class="photo-recommendation-box" style="background:#f1f5f9;border:2px dashed #94a3b8;border-radius:10px;padding:16px;margin:24px 0;text-align:center;">
       <span style="background:#0f172a;color:#fff;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:4px;text-transform:uppercase;display:inline-block;margin-bottom:8px;">📷 FOTO RECOMENDADA #1 (Ubicación: Tras H2 de Arquitectura)</span>
       <p style="margin:4px 0;font-size:13px;font-weight:600;color:#1e293b;">Tipo de plano: [Detalle del tipo de foto/diagrama]</p>
       <p style="margin:0;font-size:12px;color:#64748b;font-style:italic;">Motivo editorial: [Por qué ilustra el valor técnico]</p>
     </div>
   - Bloque de CTA destacada en el punto de máxima atención:
     <div class="cta-placement-box" style="background:#f8fafc;border:1px solid #bae6fd;border-left:5px solid #0284c7;border-radius:8px;padding:18px;margin:28px 0;">
       <h4 style="margin:0 0 6px 0;color:#0369a1;font-size:15px;">🎯 LLAMADA A LA ACCIÓN RECOMENDADA:</h4>
       <p style="margin:0 0 12px 0;color:#334155;font-size:13px;">[Explicación de valor para el instalador o jefe de compras]</p>
       <a href="[URL]" target="_blank" style="display:inline-block;background:#0284c7;color:#fff;font-size:13px;font-weight:bold;padding:10px 20px;border-radius:6px;text-decoration:none;">[TEXTO CTA] &rarr;</a>
     </div>
3. Debes proveer además el objeto "editorialLayout" con los 4 perfiles B2B, las recomendaciones de fotos con sus prompts en inglés listos para Google Imagen 3 y los puntos de inserción de CTAs.

Debes responder ÚNICAMENTE con un JSON válido cumpliendo estrictamente la estructura solicitada.
`;

  const prompt = `
Genera el paquete de contenido multicanal con guía editorial para:
- Título/Tema: ${req.topicTitle}
- Categoría: ${req.category}
- Público objetivo: Instaladores, Directores TIC, Jefes de Compras y Distribuidores
- Notas adicionales / Productos destacados: ${req.customNotes || "Enfocarse en ventajas operativas, disponibilidad inmediata, cero licencias EnGenius y soporte preventa de EcomShop"}
- URL de producto / enlace de referencia: ${req.productUrl || ECOM_BRAND.storeUrl}
- CTA Propuesto: ${req.ctaButtonText || "Solicitar Condiciones Especiales B2B"} (${req.ctaUrl || ECOM_BRAND.storeUrl})

JSON Schema requerido:
{
  "topicId": "slug-identificador",
  "topicTitle": "${req.topicTitle}",
  "category": "${req.category}",
  "generatedAt": "${new Date().toISOString()}",
  "blog": {
    "title": "string",
    "metaDescription": "string",
    "slug": "string",
    "readingTimeMinutes": 5,
    "targetKeywords": ["keyword1", "keyword2"],
    "htmlContent": "HTML completo para Durable con h2, h3, p, ul, photo-recommendation-box y cta-placement-box",
    "cleanPlainTextExcerpt": "string",
    "editorialLayout": {
      "targetProfiles": [
        { "profile": "Instaladores", "keyTakeaway": "Qué gana el instalador en tiempo y soporte" },
        { "profile": "Directores TIC", "keyTakeaway": "Qué gana el director TIC en estabilidad y 0€ licencias" },
        { "profile": "Jefes de Compras", "keyTakeaway": "Qué gana compras en márgenes, TCO y stock 24h" },
        { "profile": "Distribuidores", "keyTakeaway": "Qué gana el distribuidor en condiciones comerciales" }
      ],
      "photoPlacements": [
        {
          "id": "photo-1",
          "placementAfterHeading": "Nombre del H2 donde se inserta",
          "photoType": "Fotografía macro de switch PoE / Diagrama topología WiFi 7",
          "description": "Descripción en español del contenido de la foto",
          "imagen3Prompt": "Professional tech photography of an enterprise server rack with EnGenius network switch glowing LED ports, clean blue patch cables, 8k, cinematic lighting"
        },
        {
          "id": "photo-2",
          "placementAfterHeading": "Nombre del segundo H2",
          "photoType": "Plano de instalación o interfaz Cloud",
          "description": "Descripción en español",
          "imagen3Prompt": "Modern office interior ceiling mounted white WiFi 7 access point with subtle green status LED, clean minimalist architecture, shallow depth of field"
        }
      ],
      "ctaPlacements": [
        {
          "id": "cta-1",
          "placement": "Tras la comparativa técnica",
          "ctaType": "Solicitud de Tarifa Profesional",
          "buttonText": "Solicitar Tarifa de Distribuidor B2B",
          "targetUrl": "${req.ctaUrl || ECOM_BRAND.storeUrl}"
        },
        {
          "id": "cta-2",
          "placement": "Al final del artículo",
          "ctaType": "Asesoría Preventa Gratuita",
          "buttonText": "Hablar con Ingeniero Preventa",
          "targetUrl": "mailto:comercial@ecomspain.com"
        }
      ]
    }
  },
  "mailchimp": {
    "subjectA": "string",
    "subjectB": "string",
    "previewText": "string",
    "ctaButtonText": "string",
    "ctaUrl": "string",
    "newsletterHtml": "HTML responsive para email",
    "plainText": "string"
  },
  "whatsapp": {
    "headline": "string",
    "formattedMessage": "Mensaje para WhatsApp con *negritas*, viñetas y emojis",
    "callToAction": "string",
    "targetUrl": "string"
  },
  "linkedin": {
    "hook": "string",
    "body": "string",
    "takeaways": ["punto 1", "punto 2", "punto 3"],
    "callToAction": "string",
    "hashtags": ["#WiFi", "#Networking", "#EnGenius"],
    "fullPostText": "Texto completo del post para copiar y pegar"
  }
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  const rawText = response.text || "{}";
  const cleanedText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleanedText);
    if (parsed.blog && parsed.mailchimp) {
      return parsed as ContentOutput;
    }
  } catch (parseError) {
    console.warn("Error parsing Gemini JSON output, falling back to deterministic generator:", parseError);
  }

  return generateDeterministicFallback(req);
}

function generateDeterministicFallback(req: GenerateRequest): ContentOutput {
  const matchedPreset = PRESET_TOPICS.find(t => t.title.toLowerCase().includes(req.topicTitle.toLowerCase()) || t.category === req.category) || PRESET_TOPICS[0];
  const now = new Date().toISOString();
  const slug = req.topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const selectedStarProducts = STAR_PRODUCTS.filter(p => (req.promotedProductIds || []).includes(p.id));
  const customProdText = req.customEquipmentName?.trim();
  
  const featuredProductNames = [
    ...selectedStarProducts.map((p: any) => p.name),
    ...(customProdText ? [customProdText] : [])
  ];

  const ctaBtnText = req.ctaButtonText || "Solicitar Condiciones Especiales B2B";
  const ctaDestination = req.ctaUrl || req.customEquipmentUrl || selectedStarProducts[0]?.url || req.productUrl || (matchedPreset.suggestedProducts[0]?.url ?? ECOM_BRAND.storeUrl);

  const photo1Prompt = `Professional close-up photography of ${featuredProductNames[0] || "EnGenius Cloud Switch"} installed in a clean 19-inch enterprise rack, blue patch cables, glowing status LEDs, cinematic studio lighting, photorealistic 8k`;
  const photo2Prompt = `High-tech modern corporate open-plan office with high ceiling, ceiling mounted discreet EnGenius WiFi 7 access point with green connectivity indicator, professional architectural photography, 4k`;

  const blogHtml = `
<article class="ecom-blog-article">
  <div class="intro-box" style="background:#f0f9ff;border-left:4px solid #0284c7;padding:18px 22px;border-radius:8px;margin-bottom:28px;">
    <p style="font-size:1.15rem;font-weight:700;color:#0369a1;margin:0 0 8px 0;">Resumen Ejecutivo para Profesionales IT:</p>
    <p style="margin:0;color:#334155;line-height:1.6;font-size:0.95rem;">${matchedPreset.keyPoints[0]}. Esta guía técnica analiza cómo resolver cuellos de botella en infraestructuras de red, evitar sobrecostes en licencias y rentabilizar cada hora de despliegue en campo.</p>
  </div>

  <h2>1. Desafíos Reales en Entornos de Alta Demanda</h2>
  <p>En el despliegue de infraestructuras para hoteles, centros educativos, polígonos industriales y oficinas corporativas, el cuello de botella rara vez es el ancho de banda del operador; el verdadero desafío reside en la <strong>gestión de interferencias, el balance térmico en racks y la estabilidad continua de la conmutación core y de acceso</strong>.</p>
  <p>${matchedPreset.keyPoints[1]}. Dimensionar correctamente estos parámetros evita costosas visitas post-instalación y garantiza SLAs de alta disponibilidad exigidos por la dirección técnica.</p>

  <!-- BLOQUE RECOMENDADO FOTO 1 -->
  <div class="photo-recommendation-box" style="background:#f8fafc;border:2px dashed #94a3b8;border-radius:10px;padding:18px;margin:28px 0;text-align:center;">
    <span style="background:#0f172a;color:#ffffff;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:4px;text-transform:uppercase;display:inline-block;margin-bottom:8px;">📷 FOTO RECOMENDADA #1 (Ubicación: Tras Desafíos Técnicos)</span>
    <p style="margin:4px 0;font-size:13px;font-weight:600;color:#1e293b;">Primer plano de rack de comunicaciones y switches gestionables con latiguillos de parcheo certificados</p>
    <p style="margin:0;font-size:12px;color:#64748b;font-style:italic;">Prompt sugerido para Imagen 3: "${photo1Prompt}"</p>
  </div>

  <h2>2. Ventajas Técnicas y Arquitectura Recomendada</h2>
  <p>Al seleccionar la solución para este escenario, destacamos los siguientes pilares clave:</p>
  <ul>
    ${matchedPreset.keyPoints.map(kp => `<li><strong>${kp}</strong></li>`).join("\n    ")}
  </ul>

  <!-- BLOQUE RECOMENDADO CTA 1 -->
  <div class="cta-placement-box" style="background:#f0f9ff;border:1px solid #bae6fd;border-left:5px solid #0284c7;border-radius:8px;padding:20px;margin:28px 0;">
    <h4 style="margin:0 0 6px 0;color:#0369a1;font-size:16px;">🎯 LLAMADA A LA ACCIÓN RECOMENDADA #1 (Punto de Decisión de Compras):</h4>
    <p style="margin:0 0 14px 0;color:#334155;font-size:13px;">Compara el coste total de propiedad (TCO): las soluciones EnGenius Cloud no imponen licencias anuales obligatorias, protegiendo el margen neto de tu proyecto.</p>
    <a href="${ctaDestination}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0284c7;color:#ffffff;font-size:13px;font-weight:bold;padding:10px 22px;border-radius:6px;text-decoration:none;">${ctaBtnText} &rarr;</a>
  </div>

  <!-- BLOQUE RECOMENDADO FOTO 2 -->
  <div class="photo-recommendation-box" style="background:#f8fafc;border:2px dashed #94a3b8;border-radius:10px;padding:18px;margin:28px 0;text-align:center;">
    <span style="background:#0f172a;color:#ffffff;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:4px;text-transform:uppercase;display:inline-block;margin-bottom:8px;">📷 FOTO RECOMENDADA #2 (Ubicación: Buenas Prácticas de Instalación)</span>
    <p style="margin:4px 0;font-size:13px;font-weight:600;color:#1e293b;">Punto de acceso WiFi 7 montado en techo en oficinas corporativas con diseño limpio y cobertura omnidireccional</p>
    <p style="margin:0;font-size:12px;color:#64748b;font-style:italic;">Prompt sugerido para Imagen 3: "${photo2Prompt}"</p>
  </div>

  <h2>3. Buenas Prácticas de Ingeniería y Soporte Oficial</h2>
  <p>Recomendamos verificar siempre el balance térmico en armario rack, realizar un site survey previo con análisis de espectro y certificar cada enlace de datos o fibra óptica antes del pase a producción.</p>

  <p>En <strong>EcomShop / EcomSpain</strong> disponemos de stock permanente con entrega en 24h y un departamento de ingeniería preventa que te asesora gratuitamente en el dimensionamiento de tu lista de materiales (BOM).</p>

  <!-- BLOQUE RECOMENDADO CTA 2 (FINAL) -->
  <div class="cta-placement-box" style="background:#f8fafc;border:1px solid #e2e8f0;border-left:5px solid #10b981;border-radius:8px;padding:20px;margin:28px 0;">
    <h4 style="margin:0 0 6px 0;color:#065f46;font-size:16px;">🚀 LLAMADA A LA ACCIÓN FINAL (Contacto Directo Preventa):</h4>
    <p style="margin:0 0 14px 0;color:#334155;font-size:13px;">¿Tienes una licitación o despliegue en curso? Habla directamente con nuestros ingenieros de sistemas antes de cerrar tu propuesta.</p>
    <a href="mailto:comercial@ecomspain.com" style="display:inline-block;background:#059669;color:#ffffff;font-size:13px;font-weight:bold;padding:10px 22px;border-radius:6px;text-decoration:none;">Contactar con Ingeniería Preventa &rarr;</a>
  </div>
</article>
`.trim();

  // Newsletter con bloques específicos de productos promocionados
  const productsBlockHtml = featuredProductNames.length > 0 ? `
    <div style="margin:24px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;">
      <p style="margin:0 0 10px 0;font-size:13px;font-weight:bold;color:#0f172a;text-transform:uppercase;">Equipos recomendados en esta campaña:</p>
      <ul style="margin:0;padding-left:18px;color:#334155;font-size:14px;line-height:1.6;">
        ${featuredProductNames.map(name => `<li><strong>${name}</strong></li>`).join("")}
      </ul>
    </div>
  ` : "";

  const newsletterHtml = `
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
  <tr>
    <td style="background:#0f172a;padding:24px;text-align:center;">
      <h1 style="color:#ffffff;font-size:20px;margin:0;letter-spacing:0.5px;">EcomShop | Novedades Técnicas B2B</h1>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 24px;">
      <span style="background:#e0f2fe;color:#0369a1;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;text-transform:uppercase;">Especial Instaladores & Directores IT</span>
      <h2 style="color:#0f172a;font-size:22px;margin:16px 0 12px 0;line-height:1.3;">${req.topicTitle}</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin-bottom:20px;">
        Descubre cómo resolver los principales desafíos técnicos en tus despliegues: ${matchedPreset.keyPoints[0]}.
      </p>
      ${productsBlockHtml}
      <div style="background:#f8fafc;border-left:3px solid #0284c7;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.5;"><strong>Clave técnica:</strong> ${matchedPreset.keyPoints[1]}</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${ctaDestination}" style="background:#0284c7;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;display:inline-block;">${ctaBtnText} &rarr;</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#f1f5f9;padding:20px;text-align:center;color:#64748b;font-size:12px;">
      EcomShop / EcomSpain &bull; Mayorista y distribución B2B de conectividad y redes.<br>
      <a href="${ECOM_BRAND.storeUrl}" style="color:#0284c7;text-decoration:none;">Visitar tienda profesional</a> | <a href="mailto:comercial@ecomspain.com" style="color:#0284c7;text-decoration:none;">Consultar preventa</a>
    </td>
  </tr>
</table>
`.trim();

  // WhatsApp
  let whatsappMessage = `
*📡 NOVEDAD TÉCNICA ECOMSHOP | ${req.topicTitle.toUpperCase()}*

Hola compañero/a de profesión 👋

Si estás diseñando o ejecutando despliegues de conectividad empresarial, acabamos de publicar una guía técnica clave:

🔹 *Punto clave:* ${matchedPreset.keyPoints[0]}
🔹 *Rendimiento:* ${matchedPreset.keyPoints[1]}
🔹 *Gestión:* ${matchedPreset.keyPoints[2]}
`;

  if (req.syncWhatsApp && featuredProductNames.length > 0) {
    whatsappMessage += `\n*Equipos destacados para este proyecto:*\n${featuredProductNames.map(p => `• ${p}`).join("\n")}\n`;
  }

  whatsappMessage += `
💡 _Disponible con stock permanente y soporte preventa en EcomShop._

👉 *${ctaBtnText}:*
${ctaDestination}?utm_source=whatsapp&utm_medium=broadcast

¿Necesitas presupuesto para un proyecto en marcha? Responde a este mensaje y nuestro equipo de ingeniería te asesora.
`.trim();

  // LinkedIn
  let linkedinPost = `
¿Estás sobredimensionando o quedándote corto en tus despliegues de conectividad empresarial?

${req.topicTitle} es hoy uno de los mayores focos de duda para integradores y responsables de sistemas.

En proyectos corporativos e industriales, la diferencia entre una red estable y visitas recurrentes por soporte está en los detalles de ingeniería:

📌 ${matchedPreset.keyPoints[0]}
📌 ${matchedPreset.keyPoints[1]}
📌 ${matchedPreset.keyPoints[2]}
`;

  if (req.syncLinkedIn && featuredProductNames.length > 0) {
    linkedinPost += `\nEquipos que estamos prescribiendo para este escenario:\n${featuredProductNames.map(p => `✅ ${p}`).join("\n")}\n`;
  }

  linkedinPost += `
En EcomShop / EcomSpain ayudamos a ingenierías e instaladores a elegir la solución precisa, con stock inmediato y soporte técnico de preventa sin costes ocultos.

🔗 ${ctaBtnText}:
${ctaDestination}

¿Qué reto te estás encontrando con más frecuencia en tus últimos despliegues? Te leo en comentarios 👇

#Networking #WiFi7 #Switches #EnGenius #FibraOptica #Telecomunicaciones #EcomShop #IntegradoresIT
`.trim();

  return {
    topicId: slug,
    topicTitle: req.topicTitle,
    category: req.category,
    generatedAt: now,
    blog: {
      title: req.topicTitle,
      metaDescription: `Guía técnica para instaladores, directores TIC y jefes de compras sobre ${req.topicTitle}. Buenas prácticas y catálogo oficial en EcomShop.`,
      slug,
      readingTimeMinutes: 5,
      targetKeywords: [req.category, "EnGenius Networks", "Networking B2B", "Switches PoE", "WiFi profesional", "TCO sin licencias"],
      htmlContent: blogHtml,
      cleanPlainTextExcerpt: matchedPreset.keyPoints.join(". "),
      editorialLayout: {
        targetProfiles: [
          { profile: "Instaladores", keyTakeaway: "Despliegue rápido con escaneo QR Cloud y sin visitas postventa por caídas de red." },
          { profile: "Directores TIC", keyTakeaway: "Cero costes en licencias anuales de gestión y estabilidad con WiFi 7 y enlaces 10G." },
          { profile: "Jefes de Compras", keyTakeaway: "Ahorro directo de hasta un 40% en TCO a 3 años y stock garantizado en 24/48h." },
          { profile: "Distribuidores", keyTakeaway: "Condiciones de tarifa mayorista B2B, alta rotación de catálogo y soporte preventa directo." }
        ],
        photoPlacements: [
          {
            id: "photo-1",
            placementAfterHeading: "1. Desafíos Reales en Entornos de Alta Demanda",
            photoType: "Rack de Comunicaciones & Switches Core/Acceso",
            description: "Fotografía de switch gestionable en armario rack con cableado estructurado y latiguillos organizados.",
            imagen3Prompt: photo1Prompt
          },
          {
            id: "photo-2",
            placementAfterHeading: "2. Ventajas Técnicas y Arquitectura Recomendada",
            photoType: "Instalación de Punto de Acceso WiFi 7",
            description: "Plano arquitectónico de AP de alta densidad instalado discretamente en techo de oficinas o instalaciones corporativas.",
            imagen3Prompt: photo2Prompt
          }
        ],
        ctaPlacements: [
          {
            id: "cta-1",
            placement: "Tras el desglose de arquitectura técnica",
            ctaType: "Comprobación de TCO & Tarifa B2B",
            buttonText: ctaBtnText,
            targetUrl: ctaDestination
          },
          {
            id: "cta-2",
            placement: "Cierre del artículo",
            ctaType: "Contacto con Ingeniería Preventa",
            buttonText: "Contactar con Ingeniería Preventa",
            targetUrl: "mailto:comercial@ecomspain.com"
          }
        ]
      }
    },
    mailchimp: {
      subjectA: `[Técnico B2B] ${req.topicTitle}`,
      subjectB: `Solución recomendada: ${featuredProductNames[0] || req.topicTitle}`,
      previewText: `${matchedPreset.keyPoints[0]}. Soluciones y stock en EcomShop.`,
      ctaButtonText: ctaBtnText,
      ctaUrl: ctaDestination,
      newsletterHtml,
      plainText: `Guía técnica: ${req.topicTitle}\n\n${matchedPreset.keyPoints.join("\n")}\n\n${ctaBtnText}: ${ctaDestination}`
    },
    whatsapp: {
      headline: `Novedad Técnica: ${req.topicTitle}`,
      formattedMessage: whatsappMessage,
      callToAction: ctaBtnText,
      targetUrl: `${ctaDestination}?utm_source=whatsapp`
    },
    linkedin: {
      hook: `¿Estás sobredimensionando o quedándote corto en tus despliegues de conectividad empresarial?`,
      body: `Análisis técnico sobre ${req.topicTitle} y buenas prácticas de ingeniería en redes.`,
      takeaways: matchedPreset.keyPoints,
      callToAction: ctaBtnText,
      hashtags: ["#Networking", "#WiFi7", "#Switches", "#EnGenius", "#FibraOptica", "#EcomShop"],
      fullPostText: linkedinPost
    }
  };
}
