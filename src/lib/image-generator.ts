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

export async function generateImageWithImagen(params: {
  prompt: string;
  aspectRatio: "16:9" | "1:1" | "4:3";
  apiKey?: string;
  baseImage?: string;
}): Promise<GenerateImageResult> {
  const key = params.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  let refinedPrompt = params.prompt;

  if (key) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: key });

      // Si se provee una imagen base, enriquecer el prompt con visión multimodal de Gemini 2.5 Flash
      if (params.baseImage) {
        try {
          const match = params.baseImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
          const mimeType = match ? match[1] : "image/jpeg";
          const data = match ? match[2] : params.baseImage;

          const visionAnalysis = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data
                    }
                  },
                  {
                    text: `You are an expert photographic director. Analyze this reference image and the user's intent: "${params.prompt}". Generate a highly detailed, professional photorealistic visual prompt for an image generator. Maintain the core subject, hardware type, color palette and architectural context of the reference image, but adapt it to the user's instructions. Respond ONLY with the photographic prompt in English (no markdown, no intro).`
                  }
                ]
              }
            ]
          });

          const suggestedPrompt = visionAnalysis.text?.trim();
          if (suggestedPrompt && suggestedPrompt.length > 20) {
            refinedPrompt = suggestedPrompt;
          }
        } catch (visionErr) {
          console.warn("No se pudo analizar la imagen base con visión multimodal:", visionErr);
        }
      }

      // Llamada al modelo Imagen 3 vía Google GenAI SDK
      const response = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: refinedPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: params.aspectRatio === "16:9" ? "16:9" : params.aspectRatio === "4:3" ? "4:3" : "1:1",
          outputMimeType: "image/jpeg"
        }
      });

      const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (base64ImageBytes) {
        return {
          imageUrl: `data:image/jpeg;base64,${base64ImageBytes}`,
          sourceType: params.baseImage ? "gemini_multimodal" : "imagen3",
          refinedPrompt
        };
      }
    } catch (err: any) {
      console.warn("Error llamando a Google Imagen 3 API:", err?.message || err);
    }
  }

  // Fallback variado si la API de Imagen 3 no está disponible o la key no tiene permisos
  const lower = params.prompt.toLowerCase();
  let pool = DIVERSE_STOCK_CATALOG.tech;
  if (lower.includes("rack") || lower.includes("switch") || lower.includes("server")) {
    pool = DIVERSE_STOCK_CATALOG.rack;
  } else if (lower.includes("wifi") || lower.includes("ap") || lower.includes("access point")) {
    pool = DIVERSE_STOCK_CATALOG.wifi;
  } else if (lower.includes("fibra") || lower.includes("fiber") || lower.includes("fusion") || lower.includes("cable")) {
    pool = DIVERSE_STOCK_CATALOG.fiber;
  }

  // Selección aleatoria para evitar que siempre devuelva la misma imagen
  const randomIndex = Math.floor(Math.random() * pool.length);
  const selectedUrl = pool[randomIndex];
  const variedUrl = `${selectedUrl}&sig=${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  return {
    imageUrl: variedUrl,
    sourceType: "curated_varied",
    warning: key
      ? "Nota: Tu API Key no tiene permisos para Imagen 3 (o superó la cuota). Se ha generado una variación fotográfica curada con temática coincidente."
      : "Nota: No se detectó API Key con soporte de Imagen 3. Se ha seleccionado una imagen fotográfica curada de alta resolución.",
    refinedPrompt
  };
}
