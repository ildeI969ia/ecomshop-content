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
Eres el Ingeniero Jefe de Preventa y Consultor de Marketing B2B de ${ECOM_BRAND.name} (${ECOM_BRAND.description}).
Tu misión es generar contenido técnico de alta calidad, orientado a profesionales IT, instaladores de telecomunicaciones, integradores y distribuidores.
El tono debe ser: riguroso técnicamente, profesional, directo, sin relleno ni frases vacías de IA, enfocado en solucionar problemas de despliegue, costes, rendimiento y soporte preventa.

IMPORTANTE:
1. El HTML para el Blog debe ser semántico, limpio y listo para copiar en Durable CMS (incluye <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <div class="highlight-box">, botones de llamada a la acción).
2. Para Mailchimp genera 2 opciones de Asunto para A/B testing, texto de previsualización y el HTML de newsletter responsive.
3. Para WhatsApp usa negritas con asteriscos (*texto*), viñetas con emojis profesionales y enlace corto con UTM.
4. Para LinkedIn crea un hook de alto impacto en las primeras 2 líneas, 3-4 aprendizajes técnicos y hashtags relevantes.

Debes responder ÚNICAMENTE con un JSON válido que cumpla estrictamente con la estructura solicitada.
`;

  const prompt = `
Genera el paquete de contenido multicanal para:
- Título/Tema: ${req.topicTitle}
- Categoría: ${req.category}
- Público objetivo: ${req.targetAudience || "Integradores e instaladores de redes IT"}
- Notas adicionales / Productos destacados: ${req.customNotes || "Enfocarse en ventajas operativas, disponibilidad inmediata y soporte preventa de EcomShop"}
- URL de producto / enlace de referencia: ${req.productUrl || ECOM_BRAND.storeUrl}

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
    "htmlContent": "HTML limpio sin etiquetas <html> ni <body>, usando h2, h3, p, ul, callouts",
    "cleanPlainTextExcerpt": "string"
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
  // Limpiar posibles bloques markdown ```json ... ```
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
  
  // Equipos promocionados
  const selectedStarProducts = STAR_PRODUCTS.filter((p: any) => req.promotedProductIds?.includes(p.id));
  const customProdText = req.customEquipmentName ? `${req.customEquipmentName}` : "";
  
  const featuredProductNames = [
    ...selectedStarProducts.map((p: any) => p.name),
    ...(customProdText ? [customProdText] : [])
  ];

  const ctaBtnText = req.ctaButtonText || "Solicitar Condiciones Especiales B2B";
  const ctaDestination = req.ctaUrl || req.customEquipmentUrl || selectedStarProducts[0]?.url || req.productUrl || (matchedPreset.suggestedProducts[0]?.url ?? ECOM_BRAND.storeUrl);

  const blogHtml = `
<article class="ecom-blog-article">
  <div class="intro-box" style="background:#f0f9ff;border-left:4px solid #0284c7;padding:16px 20px;border-radius:6px;margin-bottom:24px;">
    <p style="font-size:1.1rem;font-weight:600;color:#0369a1;margin:0 0 8px 0;">Resumen para Integradores e Instaladores IT:</p>
    <p style="margin:0;color:#334155;line-height:1.6;">${matchedPreset.keyPoints[0]}. Conoce las claves de despliegue, consideraciones de ingeniería y cómo optimizar costes sin comprometer la estabilidad.</p>
  </div>

  <h2>1. Desafíos Reales en Entornos de Alta Demanda</h2>
  <p>En el despliegue de infraestructuras de conectividad para clientes corporativos, hoteles o industria, el cuello de botella rara vez es el acceso al proveedor de Internet; el verdadero reto reside en la <strong>gestión de interferencias, el presupuesto PoE y la estabilidad del hardware de red</strong>.</p>
  <p>${matchedPreset.keyPoints[1]}. Dimensionar correctamente estos parámetros evita costosas visitas post-instalación y garantiza SLAs de alta disponibilidad.</p>

  <h2>2. Ventajas Técnicas y Arquitectura Recomendada</h2>
  <p>Al seleccionar la solución para este escenario, destacamos los siguientes pilares clave:</p>
  <ul>
    ${matchedPreset.keyPoints.map(kp => `<li><strong>${kp}</strong></li>`).join("\n    ")}
  </ul>

  <div class="highlight-callout" style="background:#f8fafc;border:1px solid #e2e8f0;padding:20px;border-radius:8px;margin:28px 0;">
    <h3 style="margin-top:0;color:#0f172a;">🛠️ Recomendación del Equipo de Soporte EcomShop:</h3>
    <p style="color:#475569;margin-bottom:12px;">Para este tipo de proyecto recomendamos equipamiento con aprovisionamiento centralizado y sin costes ocultos por licencia recurrente.</p>
    <p style="margin:0;"><a href="${ctaDestination}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0284c7;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">${ctaBtnText} &rarr;</a></p>
  </div>

  <h2>3. Buenas Prácticas de Instalación</h2>
  <p>Recomendamos verificar siempre el balance térmico en armario rack, realizar un site survey previo con análisis de espectro y certificar cada enlace de datos o fibra óptica antes del pase a producción.</p>

  <p>En <strong>EcomShop / EcomSpain</strong> disponemos de stock inmediato y servicio de asesoría preventa para ayudarte a configurar la lista de materiales (BOM) exacta de tu próximo despliegue.</p>
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
      <span style="background:#e0f2fe;color:#0369a1;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;text-transform:uppercase;">Especial Instaladores IT</span>
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
      metaDescription: `Guía técnica para instaladores e integradores IT sobre ${req.topicTitle}. Claves de despliegue, buenas prácticas y catálogo disponible en EcomShop.`,
      slug,
      readingTimeMinutes: 5,
      targetKeywords: [req.category, "EnGenius Networks", "Networking B2B", "Switches PoE", "WiFi profesional"],
      htmlContent: blogHtml,
      cleanPlainTextExcerpt: matchedPreset.keyPoints.join(". ")
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
