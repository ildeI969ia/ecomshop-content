import { ContentOutput } from "@/lib/schema";
import { FullArticleResult } from "./deep-section-writer";
import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";

/**
 * Derivación Omnicanal Automática (The Junia Engine - Fase 09)
 * Transforma el artículo técnico canónico y extenso en activos listos para:
 * - Newsletter (Mailchimp B2B)
 * - LinkedIn Post (Formato gancho de ingeniería + takeaways)
 * - WhatsApp Broadcast (Mensaje con formato directo para grupos de instaladores)
 */
export async function deriveOmnichannelAssets(
  article: FullArticleResult,
  topicId = `topic-${Date.now()}`,
  category = "wifi",
  apiKeyOverride?: string
): Promise<ContentOutput> {
  const client = getGenAIClient(apiKeyOverride);
  const model = getActiveGeminiModel(apiKeyOverride);

  // Extraer texto plano y keywords clave
  const plainTextExcerpt = article.combinedHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);

  const readingTimeMinutes = Math.max(3, Math.ceil(article.totalWords / 220));

  const prompt = `
Eres el Director de Marketing B2B y Omnicanalidad de EcomShop.
A partir del siguiente artículo técnico canonizado de ${article.totalWords} palabras, debes sintetizar los activos de difusión profesional multicanal:

TÍTULO DEL ARTÍCULO: "${article.title}"
RESUMEN TÉCNICO: "${article.metaDescription}"
CONTENIDO PRINCIPAL (Extracto representativo):
${plainTextExcerpt}

GENERA ÚNICAMENTE UN JSON CON ESTA ESTRUCTURA EXACTA:
{
  "mailchimp": {
    "subjectA": "Asunto técnico directo con gancho para instaladores (ej: Wi-Fi 7 sin cuellos de botella: el error del puerto 1G)",
    "subjectB": "Asunto alternativo orientado a costes y rentabilidad (ej: Ahorra el 42% en TCO frente a Meraki sin licencias)",
    "previewText": "Texto de preencabezado de 90 caracteres máximo...",
    "ctaButtonText": "Ver Especificación Completa",
    "ctaUrl": "https://www.ecomshop.es/${article.slug}",
    "newsletterHtml": "<p>Estructura HTML limpia para email B2B...</p>",
    "plainText": "Versión texto plano..."
  },
  "whatsapp": {
    "headline": "🚨 *Actualización Técnica EcomShop:* ${article.title.slice(0, 50)}",
    "formattedMessage": "Mensaje estructurado con negritas, emojis técnicos y bullets de 3 líneas clave...",
    "callToAction": "Consulta la guía técnica completa aquí:",
    "targetUrl": "https://www.ecomshop.es/${article.slug}"
  },
  "linkedin": {
    "hook": "¿Por qué conectar un AP Wi-Fi 7 a un switch 1 GbE es como ponerle un motor de Fórmula 1 a un tractor?",
    "body": "Desarrollo técnico de 3 párrafos explicando el desafío de ingeniería...",
    "takeaways": [
      "Punto clave 1: Ancho de banda y 4096-QAM",
      "Punto clave 2: Presupuesto PoE 802.3bt",
      "Punto clave 3: TCO sin cuotas de licencias cloud"
    ],
    "callToAction": "¿Cómo estás dimensionando tus despliegues de Wi-Fi 7 en 2026? Abrimos debate en comentarios.",
    "hashtags": ["#WiFi7", "#Networking", "#Telecomunicaciones", "#EcomShop", "#EnGeniusCloud"],
    "fullPostText": "Texto completo listo para copiar y pegar en LinkedIn..."
  }
}
`;

  try {
    const generatePromise = client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("[OmnichannelDeriver] Timeout superado (10s)")), 10000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const cleanJson = (response.text || "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanJson);

    return {
      topicId,
      topicTitle: article.title,
      category,
      generatedAt: new Date().toISOString(),
      blog: {
        title: article.title,
        metaDescription: article.metaDescription,
        slug: article.slug,
        readingTimeMinutes,
        targetKeywords: ["Wi-Fi 7", "Switches PoE", "EnGenius Cloud", "Telecomunicaciones B2B"],
        htmlContent: article.combinedHtml,
        cleanPlainTextExcerpt: plainTextExcerpt,
        editorialLayout: {
          targetProfiles: [
            {
              profile: "Instalador",
              keyTakeaway: "Instalación simplificada con aprovisionamiento QR y stock garantizado en 24h."
            },
            {
              profile: "Director TIC",
              keyTakeaway: "Gestión centralizada en nube empresarial sin cuotas anuales obligatorias."
            }
          ],
          photoPlacements: [
            {
              id: "photo-1",
              placementAfterHeading: "2. El Cuello de Botella Oculto",
              photoType: "Diagrama de Arquitectura",
              description: "Topología de cableado y switches multi-gigabit.",
              imagen3Prompt: "Professional networking rack with PoE switches and fiber patch panel, clean cable management, photorealistic, 8k."
            }
          ],
          ctaPlacements: [
            {
              id: "cta-1",
              placement: "Final del artículo",
              ctaType: "Tarifa B2B",
              buttonText: "Solicitar Tarifa de Distribuidor",
              targetUrl: `https://www.ecomshop.es/${article.slug}`
            }
          ]
        }
      },
      mailchimp: parsed.mailchimp || generateFallbackMailchimp(article),
      whatsapp: parsed.whatsapp || generateFallbackWhatsApp(article),
      linkedin: parsed.linkedin || generateFallbackLinkedIn(article)
    };
  } catch (err) {
    console.warn("[OmnichannelDeriver] Fallback determinista activado tras error:", err);
  }

  return {
    topicId,
    topicTitle: article.title,
    category,
    generatedAt: new Date().toISOString(),
    blog: {
      title: article.title,
      metaDescription: article.metaDescription,
      slug: article.slug,
      readingTimeMinutes,
      targetKeywords: ["Wi-Fi 7", "Switches PoE", "EnGenius Cloud", "EcomShop B2B"],
      htmlContent: article.combinedHtml,
      cleanPlainTextExcerpt: plainTextExcerpt,
      editorialLayout: {
        targetProfiles: [
          {
            profile: "Instalador",
            keyTakeaway: "Despliegue rápido sin cuotas de mantenimiento recurrentes."
          },
          {
            profile: "Director TIC",
            keyTakeaway: "Máxima estabilidad con enlaces 10G y Wi-Fi 7 empresarial."
          }
        ]
      }
    },
    mailchimp: generateFallbackMailchimp(article),
    whatsapp: generateFallbackWhatsApp(article),
    linkedin: generateFallbackLinkedIn(article)
  };
}

function generateFallbackMailchimp(article: FullArticleResult) {
  return {
    subjectA: `[Ingeniería] ${article.title}`,
    subjectB: `Guía Técnica de Despliegue B2B: ${article.title.slice(0, 40)}`,
    previewText: article.metaDescription.slice(0, 90),
    ctaButtonText: "Leer Guía Completa en EcomShop",
    ctaUrl: `https://www.ecomshop.es/${article.slug}`,
    newsletterHtml: `<p>Hola compañero instalador,</p><p>${article.metaDescription}</p><p><a href="https://www.ecomshop.es/${article.slug}">Descubre el artículo completo de ingeniería</a></p>`,
    plainText: `Hola compañero instalador,\n\n${article.metaDescription}\n\nLee más en: https://www.ecomshop.es/${article.slug}`
  };
}

function generateFallbackWhatsApp(article: FullArticleResult) {
  return {
    headline: `🚨 *Novedad de Ingeniería EcomShop:* ${article.title}`,
    formattedMessage: `*${article.title}*\n\n📌 ${article.metaDescription}\n\n✅ Enlaces Multi-Gigabit y PoE 802.3bt\n✅ Cero licencias recurrentes\n✅ Soporte preventa y stock inmediato en España`,
    callToAction: "Ver detalles y especificaciones:",
    targetUrl: `https://www.ecomshop.es/${article.slug}`
  };
}

function generateFallbackLinkedIn(article: FullArticleResult) {
  return {
    hook: `¿Estamos dimensionando correctamente las redes para los nuevos estándares de telecomunicaciones?`,
    body: `${article.metaDescription}\n\nEn este análisis de ingeniería desglosamos los factores críticos que diferencian un proyecto rentable de una instalación con incidencias recurrentes.`,
    takeaways: [
      "Evitar cuellos de botella 1GbE migrando a conmutación Multi-Gigabit.",
      "Cálculo estricto de PoE Budget y gestión térmica en racks.",
      "Ahorro de hasta el 42% en TCO eliminando cuotas de suscripción en cloud."
    ],
    callToAction: "Comparte tus experiencias de instalación en los comentarios.",
    hashtags: ["#Networking", "#Telecomunicaciones", "#WiFi7", "#EcomShop", "#B2B"],
    fullPostText: `¿Estamos dimensionando correctamente las redes para los nuevos estándares?\n\n${article.metaDescription}\n\nPuntos clave:\n- Conmutación Multi-Gigabit sin estrangulamientos.\n- Presupuesto PoE 802.3bt riguroso.\n- Plataforma EnGenius Cloud sin suscripciones obligatorias.\n\nLeer guía completa: https://www.ecomshop.es/${article.slug}\n\n#Networking #WiFi7 #EcomShop`
  };
}
