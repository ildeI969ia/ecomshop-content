import { GoogleGenAI } from "@google/genai";
import { getVertexImageClient, IMAGEN_SUPPORTED_LOCATIONS } from "./genai-client";

export interface GeneratedImage {
  id: string;
  prompt: string;
  aspectRatio: "16:9" | "1:1" | "4:3";
  imageUrl: string;
  createdAt: string;
  sourceType?: "imagen3" | "gemini_multimodal" | "curated_varied";
  warning?: string;
}

export const PRESET_IMAGE_PROMPTS = [
  {
    id: "rack-datacenter",
    title: "Rack 42U con Switches EnGenius & Fibra",
    prompt: "Clean modern corporate server room, 42U rack cabinet filled with EnGenius PoE+ enterprise switches, patch panels with neatly managed blue and cyan fiber optic patch cords, glowing LED activity indicators, high-end professional IT infrastructure, photorealistic 8k.",
    aspectRatio: "16:9" as const
  },
  {
    id: "wifi7-ceiling",
    title: "Access Point WiFi 7 en Techo Corporativo",
    prompt: "Modern minimalist corporate office ceiling, sleek circular enterprise WiFi 7 access point mounted cleanly on acoustic ceiling tiles, subtle status LED ring, soft daylight pouring through glass walls, architect-designed workspace, photorealistic.",
    aspectRatio: "16:9" as const
  },
  {
    id: "fiber-fusion",
    title: "Técnico Certificando Fibra Óptica",
    prompt: "Close up of an IT telecom engineer using a modern optical fiber fusion splicer and optical power meter inside a communication closet, clean tools, glowing fiber core, high detail, industrial professional photography.",
    aspectRatio: "4:3" as const
  },
  {
    id: "network-topology",
    title: "Topología de Red & Cloud Management",
    prompt: "Isometric 3D technological visualization of enterprise hybrid networking topology: cloud controller connecting to PoE switches, WiFi 7 APs and multi-gigabit gateways, clean glowing cybernetic lines, deep slate blue background, futuristic UI overlay.",
    aspectRatio: "1:1" as const
  }
];

const DIVERSE_STOCK_CATALOG: Record<string, string[]> = {
  rack: [
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551808525-51a94da548ce?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1520869562399-e772f342b00a?auto=format&fit=crop&w=1200&q=80"
  ],
  wifi: [
    "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1606770347238-8c117b88ec7b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
  ],
  fiber: [
    "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80"
  ],
  tech: [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80"
  ]
};

export interface GenerateImageResult {
  imageUrl: string;
  sourceType: "imagen3" | "gemini_multimodal" | "curated_varied";
  warning?: string;
  refinedPrompt?: string;
}

/** Aspect ratio normalizer — Imagen 3 / Gemini accepts "16:9", "4:3", "1:1" */
function normalizeAspectRatio(ar: string): "16:9" | "4:3" | "1:1" {
  if (ar === "4:3") return "4:3";
  if (ar === "16:9") return "16:9";
  return "1:1";
}

/**
 * Generación moderna de imágenes con modelos Gemini Flash Image (gemini-2.5-flash-image / gemini-3.1-flash-image)
 * utilizando el método oficial generateContent con responseModalities: ["TEXT", "IMAGE"].
 * Este es el estándar actual de Google para generación de imágenes tras la transición de Imagen 3.
 */
/**
 * Resuelve una imagen de referencia (ya sea un Data URL base64 o una URL HTTP/HTTPS externa)
 * a un objeto limpio con MIME type y base64 seguro para las APIs de Google GenAI.
 */
export async function resolveBaseImageToData(
  rawImage?: string | null
): Promise<{ mimeType: string; data: string } | null> {
  if (!rawImage || typeof rawImage !== "string") return null;
  const trimmed = rawImage.trim();

  // Caso 1: Data URL en base64
  const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }

  // Caso 2: URL HTTP / HTTPS externa
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(trimmed, {
        signal: controller.signal,
        headers: { "User-Agent": "EcomShop-ImageStudio/1.0" },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "image/jpeg";
        const mimeType = contentType.split(";")[0].trim();
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        return {
          mimeType,
          data: buffer.toString("base64"),
        };
      }
    } catch (err) {
      console.warn("[resolveBaseImageToData] No se pudo descargar la imagen externa:", err);
    }
  }

  return null;
}

/**
 * Generación moderna de imágenes con modelos Gemini Flash Image (gemini-2.5-flash-image / gemini-3.1-flash-image)
 * utilizando el método oficial generateContent con responseModalities: ["IMAGE"].
 * Soporta tanto generación pura desde texto como variación fotográfica guiada por imagen de referencia.
 */
async function tryGeminiGenerateContentImage(
  client: GoogleGenAI,
  prompt: string,
  aspectRatio: string,
  label: string,
  baseImageData?: { mimeType: string; data: string } | null
): Promise<{ bytes: string; mimeType: string } | null> {
  const models = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image",
    "gemini-2.0-flash-exp",
  ];

  const enrichedPrompt = `Professional ${aspectRatio} web photograph for enterprise B2B telecommunications: ${prompt}. Sharp focus, clean studio lighting.`;

  for (const model of models) {
    // Intento 1: Si hay imagen base, intentar variación multimodal con imagen + prompt
    if (baseImageData?.data) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: baseImageData.mimeType,
                    data: baseImageData.data,
                  },
                },
                {
                  text: `${enrichedPrompt}. Maintain the physical design and authenticity of the reference hardware, seamlessly placing it in the specified environment.`,
                },
              ],
            },
          ],
          config: {
            responseModalities: ["IMAGE"],
          } as any,
        });

        const candidates = response.candidates || [];
        for (const cand of candidates) {
          const parts = cand.content?.parts || [];
          for (const part of parts) {
            const inlineData = (part as any).inlineData;
            if (inlineData?.data) {
              console.log(`[ImageGen][${label}] Imagen multimodal generada exitosamente con modelo ${model}`);
              return {
                bytes: inlineData.data,
                mimeType: inlineData.mimeType || "image/jpeg",
              };
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[ImageGen][${label}][${model} Multimodal] Aviso:`, msg);
      }
    }

    // Intento 2 (o fallback si no hay imagen base o si multimodal falló): Generación por texto enriquecido
    try {
      const response = await client.models.generateContent({
        model,
        contents: enrichedPrompt,
        config: {
          responseModalities: ["IMAGE"],
        } as any,
      });

      const candidates = response.candidates || [];
      for (const cand of candidates) {
        const parts = cand.content?.parts || [];
        for (const part of parts) {
          const inlineData = (part as any).inlineData;
          if (inlineData?.data) {
            console.log(`[ImageGen][${label}] Imagen generada exitosamente con modelo ${model}`);
            return {
              bytes: inlineData.data,
              mimeType: inlineData.mimeType || "image/jpeg",
            };
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ImageGen][${label}][${model}] Aviso:`, msg);
    }
  }
  return null;
}

/**
 * Fallback: Intento tradicional mediante el método generateImages de Vertex AI
 */
async function tryVertexLegacyImagen(
  client: GoogleGenAI,
  prompt: string,
  aspectRatio: string,
  label: string
): Promise<string | null> {
  const models = ["imagen-3.0-generate-002", "imagen-3.0-fast-generate-001"];
  for (const model of models) {
    try {
      const response = await client.models.generateImages({
        model,
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: normalizeAspectRatio(aspectRatio),
          outputMimeType: "image/jpeg",
        },
      });
      const bytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (bytes) {
        console.log(`[Imagen3Legacy][${label}] Generada exitosamente con modelo ${model}`);
        return bytes;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Imagen3Legacy][${label}][${model}] Aviso:`, msg);
    }
  }
  return null;
}

export async function generateImageWithImagen(params: {
  prompt: string;
  aspectRatio: "16:9" | "1:1" | "4:3";
  baseImage?: string;
  mode?: "ai" | "curated";
}): Promise<GenerateImageResult> {
  // Si se solicita expresamente modo curado / stock gratuito (Coste 0€)
  if (params.mode === "curated") {
    const lower = params.prompt.toLowerCase();
    let pool = DIVERSE_STOCK_CATALOG.tech;
    if (lower.includes("rack") || lower.includes("switch") || lower.includes("server")) {
      pool = DIVERSE_STOCK_CATALOG.rack;
    } else if (lower.includes("wifi") || lower.includes("ap") || lower.includes("access point")) {
      pool = DIVERSE_STOCK_CATALOG.wifi;
    } else if (lower.includes("fibra") || lower.includes("fiber") || lower.includes("fusion") || lower.includes("cable")) {
      pool = DIVERSE_STOCK_CATALOG.fiber;
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selectedUrl = pool[randomIndex];
    const variedUrl = `${selectedUrl}&sig=${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return {
      imageUrl: variedUrl,
      sourceType: "curated_varied",
      warning: "Imagen de banco curado Unsplash seleccionada (Coste: 0,00 €).",
      refinedPrompt: params.prompt,
    };
  }
  const serverApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const gcpProject =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    (process.env.NODE_ENV === "production" || process.env.K_SERVICE ? "ecomshop-marketing-prod" : "ecomshop-marketing-prod");
  const hasGcpProject = Boolean(gcpProject);

  let refinedPrompt = params.prompt;

  // ─── Multimodal vision enrichment & base image resolution ────────────────
  const baseImageData = await resolveBaseImageToData(params.baseImage);

  if (baseImageData) {
    try {
      const { getGenAIClient, getActiveGeminiModel } = await import("./genai-client");
      const ai = getGenAIClient();
      const activeModel = getActiveGeminiModel();

      const visionAnalysis = await ai.models.generateContent({
        model: activeModel,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: baseImageData.mimeType,
                  data: baseImageData.data,
                },
              },
              {
                text: `You are an expert photographic director and telecom engineer. Analyze this reference hardware image and the user's intent: "${params.prompt}". Generate a highly detailed, professional photorealistic visual prompt for an image generator. Maintain the exact physical subject (chassis, ports, logo, LEDs), color palette and hardware characteristics of the reference image, placing it naturally in the requested setting. Respond ONLY with the photographic prompt in English (no markdown, no intro).`,
              },
            ],
          },
        ],
      });

      const suggestedPrompt = visionAnalysis.text?.trim();
      if (suggestedPrompt && suggestedPrompt.length > 20) {
        refinedPrompt = suggestedPrompt;
      }
    } catch (visionErr: unknown) {
      const msg = visionErr instanceof Error ? visionErr.message : String(visionErr);
      console.warn("[Imagen3] No se pudo analizar la imagen base con visión multimodal:", msg);
    }
  }

  const sourceType = params.baseImage ? "gemini_multimodal" : "imagen3";

  // ─── PASO 1: Vertex AI us-central1 con Gemini Flash Image (gemini-2.5-flash-image) ───
  if (hasGcpProject) {
    const usClient = getVertexImageClient("us-central1");
    const result = await tryGeminiGenerateContentImage(
      usClient,
      refinedPrompt,
      params.aspectRatio,
      "Vertex us-central1 (Gemini Image)",
      baseImageData
    );
    if (result) {
      return {
        imageUrl: `data:${result.mimeType};base64,${result.bytes}`,
        sourceType,
        refinedPrompt,
      };
    }
  }

  // ─── PASO 2: Vertex AI europe-west4 con Gemini Flash Image ────────────────────
  if (hasGcpProject) {
    const euClient = getVertexImageClient("europe-west4");
    const result = await tryGeminiGenerateContentImage(
      euClient,
      refinedPrompt,
      params.aspectRatio,
      "Vertex europe-west4 (Gemini Image)",
      baseImageData
    );
    if (result) {
      return {
        imageUrl: `data:${result.mimeType};base64,${result.bytes}`,
        sourceType,
        refinedPrompt,
      };
    }
  }

  // ─── PASO 3: Google AI Studio con Gemini Flash Image (server key) ───
  if (serverApiKey) {
    const aiStudioClient = new GoogleGenAI({ vertexai: false, apiKey: serverApiKey });
    const result = await tryGeminiGenerateContentImage(
      aiStudioClient,
      refinedPrompt,
      params.aspectRatio,
      "AI Studio (Gemini Image)",
      baseImageData
    );
    if (result) {
      return {
        imageUrl: `data:${result.mimeType};base64,${result.bytes}`,
        sourceType,
        refinedPrompt,
      };
    }
  }

  // ─── PASO 4: Fallback tradicional a Vertex Legacy Imagen 3 (us-central1) ───────
  if (hasGcpProject) {
    const usClient = getVertexImageClient("us-central1");
    const legacyBytes = await tryVertexLegacyImagen(usClient, refinedPrompt, params.aspectRatio, "Vertex us-central1 (Legacy)");
    if (legacyBytes) {
      return {
        imageUrl: `data:image/jpeg;base64,${legacyBytes}`,
        sourceType,
        refinedPrompt,
      };
    }
  }

  // ─── PASO 5: Curated stock catalog fallback (último recurso) ─────────────────
  const lower = params.prompt.toLowerCase();
  let pool = DIVERSE_STOCK_CATALOG.tech;
  if (lower.includes("rack") || lower.includes("switch") || lower.includes("server")) {
    pool = DIVERSE_STOCK_CATALOG.rack;
  } else if (lower.includes("wifi") || lower.includes("ap") || lower.includes("access point")) {
    pool = DIVERSE_STOCK_CATALOG.wifi;
  } else if (lower.includes("fibra") || lower.includes("fiber") || lower.includes("fusion") || lower.includes("cable")) {
    pool = DIVERSE_STOCK_CATALOG.fiber;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  const selectedUrl = pool[randomIndex];
  const variedUrl = `${selectedUrl}&sig=${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const hasAnyKey = Boolean(hasGcpProject || serverApiKey);
  return {
    imageUrl: variedUrl,
    sourceType: "curated_varied",
    warning: hasAnyKey
      ? `Nota: No se pudo generar la imagen mediante los motores de Google Cloud (${IMAGEN_SUPPORTED_LOCATIONS.join(", ")}). Se ha seleccionado una imagen curada de alta resolución.`
      : "Nota: No se detectó credencial válida para generación de imágenes. Se ha seleccionado una imagen curada de alta resolución.",
    refinedPrompt,
  };
}
