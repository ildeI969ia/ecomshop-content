import { NextRequest, NextResponse } from "next/server";
import { getGenAIClient, getActiveGeminiModel } from "@/lib/genai-client";

export interface ImageTemplate {
  id: string;
  title: string;
  prompt: string;
  aspectRatio: "16:9" | "4:3" | "1:1";
}

export interface TemplatesRequestBody {
  mode?: "full_set" | "single_variation";
  currentTemplate?: {
    id?: string;
    title?: string;
    prompt?: string;
    aspectRatio?: string;
  };
  apiKey?: string;
}

const SYSTEM_INSTRUCTION = `You are a Senior Creative Director and Commercial Photographer specialized in B2B telecommunications and network engineering photography.
Your role is to craft photorealistic, highly qualified prompts featuring actual EcomShop / EnGenius hardware:
- Enterprise multi-gigabit PoE+ / PoE++ switches (2.5G and 10G ports, dark anodized metal chassis, subtle LED link/activity indicators, gold-plated RJ45 ports)
- Enterprise Wi-Fi 7 ceiling-mounted and wall-mounted access points (clean circular form factor, subtle cyan status LED ring, modern corporate acoustic ceiling tiles)
- Optical fiber cabling and patch infrastructure (single-mode and multimode LC duplex patch cords, yellow/aqua jackets, neat velcro-dressed cable management, overhead fiber trays, fusion splicers)
- 42U datacenter server racks (clean cable comb dressing, high-density patch panels, rack-mounted UPS and cooling management)
- SFP+ 10G / QSFP 40G optical transceivers (metallic finish, pull tabs, duplex LC interfaces)
- Datacenter edge infrastructure and enterprise telecom distribution closets.

Photographic standards:
1. Prompts must be written in English with rich camera specifications (e.g., 50mm f/2.8 lens, 85mm f/1.8 macro, 35mm architectural wide angle, soft 5500K balanced studio key light, subtle cyan/green LED accent glow, 8k resolution, photorealistic, pristine industrial textures).
2. Prohibit sci-fi tropes, neon laser grids, holograms, distorted ports, or plastic AI appearance. Focus on genuine, high-end commercial IT photography.
3. Titles must be short, punchy Spanish titles (e.g. "Switch 2.5G PoE++ en Rack", "AP Wi-Fi 7 en Techo Corporativo", "Técnico Certificando Fibra Óptica", "Transceptores SFP+ 10G y Enlace Óptico").
4. Aspect ratios must strictly be one of: "16:9", "4:3", or "1:1".
`;

// Conjuntos técnicos de respaldo con hardware real EnGenius / EcomShop
const FALLBACK_SETS: ImageTemplate[][] = [
  [
    {
      id: "switch-25g-poe-rack",
      title: "Switch 2.5G PoE++ en Rack",
      prompt: "Industrial macro photograph of an EnGenius 24-port Multi-Gigabit 2.5G PoE++ enterprise switch installed in a 19-inch IT rack, Cat6A shielded patch cables with golden RJ45 connectors, subtle cyan and green link LEDs, anodized matte dark chassis, 50mm f/2.4 lens, crystal clear focus, 8k.",
      aspectRatio: "16:9"
    },
    {
      id: "wifi7-ceiling-ap",
      title: "AP Wi-Fi 7 en Techo Corporativo",
      prompt: "Modern minimalist corporate office ceiling, sleek circular enterprise Wi-Fi 7 access point mounted cleanly on acoustic ceiling tiles, subtle cyan status LED ring, soft daylight pouring through architectural glass walls, architect-designed workspace, 85mm f/2.0 lens, shallow depth of field, authentic commercial interior photography, 8k.",
      aspectRatio: "16:9"
    },
    {
      id: "fiber-fusion-splicer",
      title: "Técnico Certificando Fibra Óptica",
      prompt: "Commercial close-up photograph of an IT telecom engineer using a high-precision optical fiber fusion splicer and optical power meter inside a communication closet, clean tools, glowing fiber core, high detail, industrial professional photography, 35mm macro f/2.8, warm subtle halogen accent lighting, 8k.",
      aspectRatio: "4:3"
    },
    {
      id: "datacenter-rack-42u",
      title: "Rack 42U Datacenter & SFP+ 10G",
      prompt: "Clean modern corporate server room, 42U rack cabinet filled with EnGenius PoE+ enterprise switches and SFP+ 10G optical transceivers, patch panels with neatly managed blue and cyan fiber optic patch cords with velcro ties, glowing LED activity indicators, high-end professional IT infrastructure, photorealistic 8k, 50mm f/2.8 lens, soft balanced 5500K studio key light.",
      aspectRatio: "16:9"
    }
  ],
  [
    {
      id: "datacenter-edge-switches",
      title: "Centro de Datos Edge & Switches Multi-Gig",
      prompt: "Tier-3 edge datacenter facility, row of black matte 42U server racks featuring EnGenius 10G Multi-Gigabit SFP+ switches, yellow single-mode optical jumper routing trays, cold-aisle containment lighting, cinematic 8k architectural shot, 24mm f/4 lens.",
      aspectRatio: "16:9"
    },
    {
      id: "wifi7-industrial-campus",
      title: "AP Wi-Fi 7 en Campus Industrial",
      prompt: "High-density enterprise wireless deployment: heavy-duty enterprise Wi-Fi 7 access point installed on structural steel beam in an open-plan innovation hub, green status beacon, clean industrial aesthetic, diffused natural daylight, 50mm f/1.8.",
      aspectRatio: "16:9"
    },
    {
      id: "fiber-otdr-backbone",
      title: "Auditoría OTDR de Troncal de Fibra",
      prompt: "Macro close-up shot of fiber optic distribution panel with SC/APC and LC duplex connectors, technician hand connecting an optical fiber launch cable, glowing laser warning indicators, razor-sharp focus on polished ceramic ferrules, 85mm macro f/3.2.",
      aspectRatio: "4:3"
    },
    {
      id: "sfp-10g-transceiver-macro",
      title: "Transceptores SFP+ 10G y Enlace Óptico",
      prompt: "Extreme macro studio close-up of dual 10G SFP+ optical transceivers slotted into an enterprise core switch, vibrant aqua duplex LC fiber cables attached, precision metallic engineering, subtle cyan reflections on metal casing, f/4.0 macro focus, 8k resolution.",
      aspectRatio: "1:1"
    }
  ]
];

function normalizeAspectRatio(ar?: string): "16:9" | "4:3" | "1:1" {
  if (ar === "4:3") return "4:3";
  if (ar === "1:1") return "1:1";
  return "16:9";
}

function generateFallbackVariation(current?: TemplatesRequestBody["currentTemplate"]): ImageTemplate {
  const title = current?.title || "";
  const prompt = current?.prompt || "";
  const lower = `${title} ${prompt}`.toLowerCase();
  const ar = normalizeAspectRatio(current?.aspectRatio);
  const baseId = (current?.id || "template").replace(/[^a-z0-9-]/g, "");

  if (lower.includes("wifi") || lower.includes("ap") || lower.includes("acceso") || lower.includes("techo") || lower.includes("inalambric")) {
    return {
      id: `${baseId}-var-${Date.now().toString(36)}`,
      title: "AP Wi-Fi 7 en Muro Arquitectónico",
      prompt: "Architectural commercial photograph of an enterprise EnGenius Wi-Fi 7 access point mounted vertically on an exposed concrete wall in an open-plan corporate tech campus, natural directional daylight from high windows, subtle status indicator, 50mm f/2.0 lens, elegant industrial aesthetic, 8k.",
      aspectRatio: ar
    };
  }

  if (lower.includes("fibra") || lower.includes("fiber") || lower.includes("splicer") || lower.includes("fusion") || lower.includes("otdr")) {
    return {
      id: `${baseId}-var-${Date.now().toString(36)}`,
      title: "Transceptores SFP+ 10G y Fibra Dúplex LC",
      prompt: "Macro studio photograph of dual 10G SFP+ optical transceivers slotted into an enterprise core switch cage, vibrant aqua duplex LC fiber cables attached, precision engineering, subtle cyan reflections on metallic casing, f/4.0 macro focus, 8k resolution.",
      aspectRatio: ar === "16:9" ? "1:1" : ar
    };
  }

  if (lower.includes("switch") || lower.includes("poe") || lower.includes("puerto") || lower.includes("gigabit")) {
    return {
      id: `${baseId}-var-${Date.now().toString(36)}`,
      title: "Detalle Frontal Switch Multi-Gigabit 2.5G",
      prompt: "Close-up front angle photograph of an EnGenius enterprise switch with 2.5G PoE++ ports, heavy-duty Cat6A blue shielded cables plugged in, soft ambient lighting highlighting brushed dark aluminum chassis texture, blinking green status LEDs, 85mm f/2.8 macro lens, photorealistic.",
      aspectRatio: ar
    };
  }

  // Datacenter / rack / infraestructura general
  return {
    id: `${baseId}-var-${Date.now().toString(36)}`,
    title: "Perspectiva Angular 45° de Rack 42U",
    prompt: "Dynamic low-angle 45-degree architectural shot of a 42U enterprise server rack populated with EnGenius Cloud PoE switches and SFP+ optical fiber uplinks, dramatic moody datacenter lighting with cool blue LED accents, clean raised-floor server room, 24mm wide angle lens f/4, crisp industrial photorealism, 8k.",
    aspectRatio: ar
  };
}

export async function POST(req: NextRequest) {
  try {
    let body: TemplatesRequestBody = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { mode = "full_set", currentTemplate, apiKey } = body;
    const isVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || (!apiKey && Boolean(process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT));
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const canUseAi = Boolean(key || isVertex);

    // ─── MODO 1: FULL SET (4 plantillas fotográficas técnicas completas) ──────
    if (mode === "full_set") {
      if (canUseAi) {
        try {
          const ai = getGenAIClient(apiKey);
          const model = getActiveGeminiModel(apiKey);

          const promptInstruction = `Generate exactly 4 distinct, highly qualified, photorealistic image templates for enterprise B2B telecommunications and networking installations.
Cover a balanced variety across these technical domains:
1. Multi-gigabit PoE++ switch in an IT server rack or cabinet (EnGenius hardware).
2. Sleek Wi-Fi 7 ceiling-mounted access point in a high-end corporate office.
3. Telecom technician or high-precision optical fiber cabling / fusion splicing / SFP+ transceivers.
4. Datacenter 42U server rack infrastructure with tidy patch panels and LED activity.

Requirements for each item:
- "id": kebab-case slug (e.g. "switch-25g-poe-rack", "wifi7-enterprise-ceiling")
- "title": Short, punchy Spanish title (e.g. "Switch 2.5G PoE++ en Rack", "AP Wi-Fi 7 en Techo Corporativo")
- "prompt": Highly descriptive photorealistic prompt in English specifying camera gear (50mm/85mm lens, f-stop), lighting (5500K studio, subtle LEDs), authentic hardware materials, and 8k detail.
- "aspectRatio": Either "16:9", "4:3", or "1:1".

Respond ONLY with a valid JSON array of 4 objects with keys "id", "title", "prompt", "aspectRatio".`;

          const res = await ai.models.generateContent({
            model,
            contents: promptInstruction,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              responseMimeType: "application/json",
              temperature: 0.7,
            },
          });

          const rawText = res.text?.trim() || "";
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const list = Array.isArray(parsed) ? parsed : parsed.templates || [];
            if (Array.isArray(list) && list.length > 0) {
              const validatedTemplates: ImageTemplate[] = list.slice(0, 4).map((item, idx) => ({
                id: typeof item.id === "string" && item.id.trim() ? item.id.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : `template-${idx + 1}-${Date.now().toString(36)}`,
                title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : `Plantilla Técnica #${idx + 1}`,
                prompt: typeof item.prompt === "string" && item.prompt.trim() ? item.prompt.trim() : FALLBACK_SETS[0][idx % FALLBACK_SETS[0].length].prompt,
                aspectRatio: normalizeAspectRatio(item.aspectRatio),
              }));

              if (validatedTemplates.length >= 2) {
                return NextResponse.json({
                  success: true,
                  templates: validatedTemplates,
                });
              }
            }
          }
        } catch (err) {
          console.warn("[TemplatesAPI] Error invocando Gemini para full_set, usando catálogo de respaldo:", err);
        }
      }

      // Fallback rico si no hay API key disponible o si falla Gemini
      const randomSetIndex = Math.floor(Math.random() * FALLBACK_SETS.length);
      return NextResponse.json({
        success: true,
        templates: FALLBACK_SETS[randomSetIndex],
      });
    }

    // ─── MODO 2: SINGLE VARIATION (Variación de perspectiva/entorno) ──────────
    if (mode === "single_variation") {
      if (canUseAi && currentTemplate && (currentTemplate.prompt || currentTemplate.title)) {
        try {
          const ai = getGenAIClient(apiKey);
          const model = getActiveGeminiModel(apiKey);

          const promptInstruction = `Given this existing enterprise networking photographic template:
Title: "${currentTemplate.title || "Equipo de Red"}"
Current Prompt: "${currentTemplate.prompt || ""}"
Current Aspect Ratio: "${currentTemplate.aspectRatio || "16:9"}"

Generate an alternative photographic variation for this SAME technical subject or hardware.
Keep the core equipment authentic (e.g. EnGenius multi-gigabit switch, Wi-Fi 7 AP, fiber optics, or server rack), but vary:
1. The camera angle or perspective (e.g., from wide-angle contextual view to extreme macro close-up, or 45-degree isometric).
2. The lighting or environment (e.g., modern corporate daylight, moody datacenter cool LED glow, industrial telecom closet).
3. The composition details (e.g., focus on gold RJ45 contacts, status LEDs, cable dressing, or ceiling mounting integration).

Requirements:
- "id": slug identifier for the variation (e.g., "${(currentTemplate.id || "var").replace(/[^a-z0-9-]/g, "")}-alt-${Date.now().toString(36)}")
- "title": Short descriptive Spanish title for this variation.
- "prompt": Highly descriptive photorealistic prompt in English specifying camera gear, lens, lighting, materials, and 8k detail.
- "aspectRatio": Either "16:9", "4:3", or "1:1".

Respond ONLY with a valid JSON object with keys "id", "title", "prompt", "aspectRatio".`;

          const res = await ai.models.generateContent({
            model,
            contents: promptInstruction,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              responseMimeType: "application/json",
              temperature: 0.7,
            },
          });

          const rawText = res.text?.trim() || "";
          if (rawText) {
            let parsed = JSON.parse(rawText);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsed = parsed[0];
            }
            if (parsed && typeof parsed === "object") {
              const validatedTemplate: ImageTemplate = {
                id: typeof parsed.id === "string" && parsed.id.trim() ? parsed.id.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : `${currentTemplate.id || "var"}-alt`,
                title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : `Variación: ${currentTemplate.title || "Técnica"}`,
                prompt: typeof parsed.prompt === "string" && parsed.prompt.trim() ? parsed.prompt.trim() : generateFallbackVariation(currentTemplate).prompt,
                aspectRatio: normalizeAspectRatio(parsed.aspectRatio || currentTemplate.aspectRatio),
              };

              return NextResponse.json({
                success: true,
                template: validatedTemplate,
              });
            }
          }
        } catch (err) {
          console.warn("[TemplatesAPI] Error invocando Gemini para single_variation, usando variación de respaldo:", err);
        }
      }

      // Fallback determinista si no hay API key o si falla Gemini
      const fallbackTemplate = generateFallbackVariation(currentTemplate);
      return NextResponse.json({
        success: true,
        template: fallbackTemplate,
      });
    }

    // Modo no reconocido
    return NextResponse.json(
      { success: false, error: `Modo '${mode}' no reconocido. Utiliza 'full_set' o 'single_variation'.` },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[TemplatesAPI] Error inesperado:", err);
    // En caso de fallo crítico, responder con el catálogo de respaldo para no bloquear al cliente
    return NextResponse.json({
      success: true,
      templates: FALLBACK_SETS[0],
      warning: err instanceof Error ? err.message : "Fallback activado por error inesperado",
    });
  }
}
