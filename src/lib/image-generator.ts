export interface GeneratedImage {
  id: string;
  prompt: string;
  aspectRatio: "16:9" | "1:1" | "4:3";
  imageUrl: string;
  createdAt: string;
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

export async function generateImageWithImagen(params: {
  prompt: string;
  aspectRatio: "16:9" | "1:1" | "4:3";
  apiKey?: string;
}): Promise<string> {
  const key = params.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (key) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: key });

      // Llamada al modelo Imagen 3 vía Google GenAI SDK
      const response = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: params.prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: params.aspectRatio === "16:9" ? "16:9" : params.aspectRatio === "4:3" ? "4:3" : "1:1",
          outputMimeType: "image/jpeg"
        }
      });

      const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (base64ImageBytes) {
        return `data:image/jpeg;base64,${base64ImageBytes}`;
      }
    } catch (err) {
      console.warn("Error llamando a Google Imagen 3 API, usando imagen de stock técnica de alta resolución:", err);
    }
  }

  // Fallback curado de alta resolución especializado en telecomunicaciones / networking
  if (params.prompt.toLowerCase().includes("rack") || params.prompt.toLowerCase().includes("switch")) {
    return "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80";
  }
  if (params.prompt.toLowerCase().includes("wifi") || params.prompt.toLowerCase().includes("ap")) {
    return "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80";
  }
  if (params.prompt.toLowerCase().includes("fibra") || params.prompt.toLowerCase().includes("fiber")) {
    return "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80";
  }

  return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80";
}
