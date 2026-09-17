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

/** Aspect ratio normalizer — Imagen 3 accepts "16:9", "4:3", "1:1" */
function normalizeAspectRatio(ar: string): "16:9" | "4:3" | "1:1" {
  if (ar === "4:3") return "4:3";
  if (ar === "16:9") return "16:9";
  return "1:1";
}

/**
 * Attempts to generate an image via Vertex AI Imagen 3 in a given region.
 * Returns base64 image bytes on success, null on failure.
 */
async function tryVertexImagen(
  client: GoogleGenAI,
  prompt: string,
  aspectRatio: string,
  label: string
): Promise<string | null> {
  try {
    const response = await client.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: normalizeAspectRatio(aspectRatio),
        outputMimeType: "image/jpeg",
      },
    });
    const bytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (bytes) return bytes;
    console.warn(`[Imagen3][${label}] Respuesta vacía de Vertex AI`);
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Imagen3][${label}] Error:`, msg);
    return null;
  }
}

/**
 * Attempts to generate an image via the Google AI Studio REST predict endpoint.
 * Works with both user-provided keys and the server-side GEMINI_API_KEY env var.
 * Returns base64 image bytes on success, null on failure.
 */
async function tryAiStudioREST(
  apiKey: string,
  prompt: string,
  aspectRatio: string
): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: normalizeAspectRatio(aspectRatio),
          outputOptions: { mimeType: "image/jpeg" },
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const b64 =
        data.predictions?.[0]?.bytesBase64Encoded ||
        data.predictions?.[0]?.image?.imageBytes;
      if (b64) return b64;
      console.warn("[Imagen3][AI Studio REST] Respuesta vacía");
    } else {
      const errBody = await res.text();
      console.warn(`[Imagen3][AI Studio REST] HTTP ${res.status}:`, errBody);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Imagen3][AI Studio REST] Excepción:", msg);
  }
  return null;
}

/**
 * Attempts to generate an image via the Google AI Studio SDK.
 * Returns base64 image bytes on success, null on failure.
 */
async function tryAiStudioSDK(
  apiKey: string,
  prompt: string,
  aspectRatio: string
): Promise<string | null> {
  try {
    const client = new GoogleGenAI({ vertexai: false, apiKey });
    const response = await client.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: normalizeAspectRatio(aspectRatio),
        outputMimeType: "image/jpeg",
      },
    });
    const bytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (bytes) return bytes;
    console.warn("[Imagen3][AI Studio SDK] Respuesta vacía");
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Imagen3][AI Studio SDK] Error:", msg);
    return null;
  }
}

export async function generateImageWithImagen(params: {
  prompt: string;
  aspectRatio: "16:9" | "1:1" | "4:3";
  apiKey?: string;
  baseImage?: string;
}): Promise<GenerateImageResult> {
  const serverApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const userApiKey = params.apiKey?.trim();
  const hasGcpProject = Boolean(process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT);

  let refinedPrompt = params.prompt;

  // ─── Multimodal vision enrichment (if base image provided) ────────────────
  if (params.baseImage) {
    try {
      const { getGenAIClient, getActiveGeminiModel } = await import("./genai-client");
      const ai = getGenAIClient(userApiKey);
      const activeModel = getActiveGeminiModel(userApiKey);
      const match = params.baseImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      const mimeType = match ? match[1] : "image/jpeg";
      const data = match ? match[2] : params.baseImage;

      const visionAnalysis = await ai.models.generateContent({
        model: activeModel,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType, data } },
              {
                text: `You are an expert photographic director. Analyze this reference image and the user's intent: "${params.prompt}". Generate a highly detailed, professional photorealistic visual prompt for an image generator. Maintain the core subject, hardware type, color palette and architectural context of the reference image, but adapt it to the user's instructions. Respond ONLY with the photographic prompt in English (no markdown, no intro).`,
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

  // ─── PASO 1: Vertex AI — us-central1 (región primaria para Imagen 3) ───────
  if (hasGcpProject) {
    const usClient = getVertexImageClient("us-central1");
    const bytes = await tryVertexImagen(usClient, refinedPrompt, params.aspectRatio, "Vertex us-central1");
    if (bytes) {
      return { imageUrl: `data:image/jpeg;base64,${bytes}`, sourceType, refinedPrompt };
    }
  }

  // ─── PASO 2: Vertex AI — europe-west4 (región secundaria para Imagen 3) ────
  if (hasGcpProject) {
    const euClient = getVertexImageClient("europe-west4");
    const bytes = await tryVertexImagen(euClient, refinedPrompt, params.aspectRatio, "Vertex europe-west4");
    if (bytes) {
      return { imageUrl: `data:image/jpeg;base64,${bytes}`, sourceType, refinedPrompt };
    }
  }

  // ─── PASO 3: AI Studio REST — user key first, then server key ───────────────
  const restKey = userApiKey || serverApiKey;
  if (restKey) {
    const bytes = await tryAiStudioREST(restKey, refinedPrompt, params.aspectRatio);
    if (bytes) {
      return { imageUrl: `data:image/jpeg;base64,${bytes}`, sourceType, refinedPrompt };
    }
  }

  // ─── PASO 4: AI Studio SDK — user key first, then server key ────────────────
  const sdkKey = userApiKey || serverApiKey;
  if (sdkKey) {
    const bytes = await tryAiStudioSDK(sdkKey, refinedPrompt, params.aspectRatio);
    if (bytes) {
      return { imageUrl: `data:image/jpeg;base64,${bytes}`, sourceType, refinedPrompt };
    }
  }

  // ─── PASO 5: Curated stock fallback ─────────────────────────────────────────
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

  const hasAnyKey = Boolean(hasGcpProject || userApiKey || serverApiKey);
  return {
    imageUrl: variedUrl,
    sourceType: "curated_varied",
    warning: hasAnyKey
      ? `Nota: Imagen 3 no respondió en ninguna región disponible (${IMAGEN_SUPPORTED_LOCATIONS.join(", ")}) ni en AI Studio. Se ha seleccionado una imagen fotográfica curada de alta resolución.`
      : "Nota: No se detectó credencial válida para Imagen 3. Se ha seleccionado una imagen fotográfica curada de alta resolución.",
    refinedPrompt,
  };
}
