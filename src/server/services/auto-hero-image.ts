import { generateImageWithImagen } from "@/lib/image-generator";
import { prepareImageBinary } from "@/server/services/image-binary";
import { GoogleCloudStorageProvider } from "@/server/services/storage-provider";
import { AssetRepository } from "@/server/repositories";
import { Asset } from "@/server/domain/types";
import { checkAiBudget, recordAiUsage } from "@/server/services/ai-budget";

export interface AutoHeroImageInput {
  workspaceId: string;
  userId: string;
  userRole?: string;
  sku: string;
  topicTitle: string;
  brand?: string;
  model?: string;
  category?: string;
  deviceType?: string;
  technicalQuestion?: string;
  centralArgument?: string;
  officialImageUrl?: string;
}

export interface AutoHeroImageResult {
  imageUrl: string;
  assetId: string;
  altText: string;
  caption: string;
  sourceType: string;
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

/**
 * Devuelve el entorno de instalación y contexto físico auténtico según la familia de dispositivo.
 */
function getHardwareEnvironmentPrompt(
  deviceType: string | undefined,
  brand: string,
  model: string,
  sku: string,
  technicalQuestion?: string
): { contextPrompt: string; defaultCaption: string; defaultAlt: string } {
  const cleanType = (deviceType || "").toUpperCase();
  const upperSku = sku.toUpperCase();

  // 1. Puntos de acceso WiFi (techo corporativo, pared o mástil exterior)
  if (cleanType === "ACCESS_POINT" || upperSku.startsWith("ECW")) {
    const isOutdoor = upperSku.includes("546") || upperSku.includes("OUTDOOR");
    if (isOutdoor) {
      return {
        contextPrompt: `Ruggedized IP67 outdoor telecommunications installation of ${brand} ${model} (${sku}) securely pole-mounted on an exterior telecom mast. Weatherproof cabling with sealed glands, subtle status LEDs, photorealistic architectural outdoor depth of field.`,
        defaultCaption: `Despliegue exterior de alta densidad con ${brand} ${model} (${sku}).`,
        defaultAlt: `${brand} ${model} (${sku}) - Punto de acceso Wi-Fi exterior montado en mástil`
      };
    }
    return {
      contextPrompt: `Sleek enterprise ceiling-mounted installation of ${brand} ${model} (${sku}) Wi-Fi access point in a modern architectural office ceiling with recessed lighting. Clean matte white chassis, discrete blue/green LED indicator, zero visible messy cables, photorealistic interior corporate lighting.`,
      defaultCaption: `Instalación en techo de ${brand} ${model} (${sku}) en entorno empresarial.`,
      defaultAlt: `${brand} ${model} (${sku}) - Punto de acceso Wi-Fi profesional montado en techo`
    };
  }

  // 2. Gateways, Routers celulares y Edge Controllers (ECC500, ESG series, RUT series)
  if (
    cleanType === "GATEWAY" ||
    cleanType === "ROUTER_CELLULAR" ||
    upperSku.startsWith("ESG") ||
    upperSku.startsWith("ECC") ||
    upperSku.startsWith("RUT") ||
    upperSku.startsWith("TRB")
  ) {
    const isCellularOrIndustrial = upperSku.startsWith("ECC") || upperSku.startsWith("RUT") || upperSku.startsWith("TRB");
    if (isCellularOrIndustrial) {
      return {
        contextPrompt: `Industrial telecommunications edge deployment of ${brand} ${model} (${sku}) gateway with external SMA antennas and rugged DIN-rail or wall enclosure. Dual Ethernet connections, active SIM status LEDs, clean telecom demarcation cabinet, photorealistic industrial finish.`,
        defaultCaption: `Controlador y gateway de borde ${brand} ${model} (${sku}) en gabinete de telecomunicaciones.`,
        defaultAlt: `${brand} ${model} (${sku}) - Gateway y controlador industrial montado en carril DIN`
      };
    }
    return {
      contextPrompt: `Enterprise security gateway and SD-WAN appliance ${brand} ${model} (${sku}) installed in a modern network aggregation facility. High-speed multi-gigabit WAN/LAN patch cabling, active link status indicators, clean matte front panel aesthetics.`,
      defaultCaption: `Gateway de seguridad y SD-WAN ${brand} ${model} (${sku}) en entorno de red corporativo.`,
      defaultAlt: `${brand} ${model} (${sku}) - Gateway de seguridad de red empresarial`
    };
  }

  // 3. Cámaras CCTV / Seguridad física
  if (cleanType === "CCTV_CAMERA") {
    return {
      contextPrompt: `Professional security camera ${brand} ${model} (${sku}) surveillance mount installed on a modern facility wall with weather-sealed bracket, subtle infrared lens array, crisp depth of field.`,
      defaultCaption: `Cámara de videovigilancia IP ${brand} ${model} (${sku}) en despliegue de seguridad.`,
      defaultAlt: `${brand} ${model} (${sku}) - Cámara IP de seguridad y videovigilancia`
    };
  }

  // 4. Switches y Conmutación (ECS series)
  if (cleanType === "SWITCH" || upperSku.startsWith("ECS")) {
    return {
      contextPrompt: `High-end enterprise switch ${brand} ${model} (${sku}) with high-density RJ45 PoE ports and 10G SFP+ uplinks in an organized professional patch rack with neatly dressed slim Cat6A patch cables and glowing link LEDs.`,
      defaultCaption: `Conmutador gestionable ${brand} ${model} (${sku}) con cableado estructurado de alta densidad.`,
      defaultAlt: `${brand} ${model} (${sku}) - Switch gestionable en rack de distribución`
    };
  }

  // 5. Fallback general contextual
  return {
    contextPrompt: technicalQuestion
      ? `Technical deployment and architectural setup of ${brand} ${model} (${sku}) resolving: "${technicalQuestion}".`
      : `Professional deployment of ${brand} ${model} (${sku}) in a modern corporate telecommunications environment.`,
    defaultCaption: `Instalación y arquitectura técnica de ${brand} ${model} (${sku}) para redes profesionales.`,
    defaultAlt: `${brand} ${model} (${sku}) - Despliegue de infraestructura de red profesional`
  };
}

/**
 * Genera automáticamente una imagen Hero de alta relevancia técnica para el post,
 * optimizada para la indexación visual en Google (SEO / AEO), con persistencia
 * verificada en Google Cloud Storage y registro en Firestore.
 */
export async function generateAutoHeroImage(
  input: AutoHeroImageInput
): Promise<AutoHeroImageResult | null> {
  const {
    workspaceId,
    userId,
    userRole = "EDITOR",
    sku,
    topicTitle,
    brand = "EcomSpain",
    model = sku,
    category = "Tecnología de Redes B2B",
    deviceType,
    technicalQuestion,
    centralArgument,
    officialImageUrl
  } = input;

  try {
    // 1. Control FinOps preventivo
    const budget = await checkAiBudget(userId, userRole as any, 0.0038);
    if (!budget.allowed) {
      console.warn(`[AutoHeroImage] Presupuesto de IA alcanzado para ${userId}. Usando modo catálogo/curado.`);
    }

    // 2. Construcción de prompt altamente relevante según el tipo de hardware
    const cleanBrand = brand || "EcomSpain";
    const hwEnv = getHardwareEnvironmentPrompt(deviceType, cleanBrand, model, sku, technicalQuestion);

    const fullPrompt = `Professional photorealistic B2B photograph of ${cleanBrand} ${model} (${sku}). ${hwEnv.contextPrompt} Realistic depth of field, sharp hardware details, authentic status LEDs, clean industrial aesthetics, 8k resolution.`;

    const altText = hwEnv.defaultAlt;
    const caption = hwEnv.defaultCaption;

    // 3. Generación con Imagen / Gemini Image (con grounding en officialImageUrl si está disponible)
    const genResult = await generateImageWithImagen({
      prompt: fullPrompt,
      aspectRatio: "16:9",
      baseImage: officialImageUrl || undefined,
      mode: budget.allowed ? "ai" : "curated",
      preservePrompt: true
    });

    const parsed = parseDataUrl(genResult.imageUrl);
    const assetId = `asset-hero-${sku.toLowerCase()}-${Date.now()}`;
    const nowIso = new Date().toISOString();

    let publicUrl = genResult.imageUrl;

    if (parsed) {
      // Data URL: optimizar binario, subir a Cloud Storage y obtener URL pública permanente
      const prepared = await prepareImageBinary(parsed.buffer, parsed.mimeType);
      const destinationPath = `workspaces/${workspaceId}/assets/${assetId}_hero.${prepared.extension}`;

      const uploadRes = await new GoogleCloudStorageProvider().uploadFile({
        buffer: prepared.buffer,
        destinationPath,
        mimeType: prepared.mimeType,
      });

      if (uploadRes.publicUrl) {
        publicUrl = uploadRes.publicUrl;

        const assetItem: Asset = {
          id: assetId,
          workspaceId,
          filename: `hero-${sku}.jpg`,
          mimeType: prepared.mimeType,
          sizeBytes: prepared.buffer.length,
          storagePath: uploadRes.storagePath,
          publicUrl: uploadRes.publicUrl,
          type: "image",
          aiGenerated: true,
          productId: sku,
          ownerId: userId,
          storageStatus: "VERIFIED",
          sha256: prepared.sha256,
          originalSizeBytes: parsed.buffer.length,
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: userId,
          updatedBy: userId
        };

        const assetRepo = new AssetRepository();
        await assetRepo.save(assetItem);
      }
    }

    if (budget.allowed && parsed) {
      await recordAiUsage(userId, "imagen_generation", 1, 1, 0.0038).catch((err) =>
        console.warn("[AutoHeroImage] FinOps record error:", err)
      );
    }

    return {
      imageUrl: publicUrl,
      assetId,
      altText,
      caption,
      sourceType: genResult.sourceType
    };
  } catch (err) {
    console.error(`[AutoHeroImage] Error generando imagen automática para ${sku}:`, err);
    return null;
  }
}
