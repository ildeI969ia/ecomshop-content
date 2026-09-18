import { NextResponse } from "next/server";
import { generateImageWithImagen } from "@/lib/image-generator";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { AssetRepository, AuditRepository } from "@/server/repositories";
import { Asset } from "@/server/domain/types";

export const POST = withAuthAndPermission("ai:execute", async (req, user) => {
  try {
    const { prompt, aspectRatio, apiKey, baseImage, mode } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Falta el prompt para generar la imagen" }, { status: 400 });
    }

    const result = await generateImageWithImagen({
      prompt,
      aspectRatio: aspectRatio || "16:9",
      apiKey,
      baseImage,
      mode: mode || "ai"
    });

    // Persistir automáticamente el activo generado en Firestore
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    try {
      const assetRepo = new AssetRepository();
      const asset: Asset = {
        id: assetId,
        workspaceId: user.workspaceId,
        filename: `AI: ${prompt.substring(0, 60)}`,
        mimeType: result.imageUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg",
        sizeBytes: result.imageUrl.length,
        storagePath: `generated/${assetId}`,
        publicUrl: result.imageUrl.length > 800000 ? "" : result.imageUrl,
        type: "image",
        aiGenerated: true,
        aiProvenance: {
          provider: "google-vertex-genai",
          model: result.sourceType || "imagen3",
          requestId: assetId,
          generatedAt: new Date().toISOString(),
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          latencyMs: 0,
          estimatedCostEur: 0.03,
          sourceIdsUsed: []
        },
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.uid,
        updatedBy: user.uid
      };
      await assetRepo.save(asset);

      const auditRepo = new AuditRepository();
      await auditRepo.record({
        id: `audit-img-${Date.now()}`,
        workspaceId: user.workspaceId,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        userEmail: user.email,
        action: "GENERATE_AI",
        entity: "ASSET",
        entityId: assetId,
        diff: { prompt: prompt.substring(0, 60), model: result.sourceType },
        source: "UI"
      });
    } catch (dbErr) {
      console.warn("[api/images/generate] No se pudo persistir asset en Firestore:", dbErr);
    }

    return NextResponse.json({
      imageUrl: result.imageUrl,
      sourceType: result.sourceType,
      warning: result.warning,
      refinedPrompt: result.refinedPrompt,
      assetId
    });
  } catch (error: any) {
    console.error("Error generating image:", error);
    return NextResponse.json({ error: error.message || "Error al generar imagen" }, { status: 500 });
  }
});
