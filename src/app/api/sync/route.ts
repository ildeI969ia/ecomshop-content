import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { PersistenceService } from "@/server/services/persistence-service";

export const POST = withAuthAndPermission("admin", async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const service = new PersistenceService();

    const result = await service.syncFromLocalStorage({
      historyItems: body.historyItems,
      finopsRecords: body.finopsRecords,
      generatedImages: body.generatedImages,
      workspaceId: user.workspaceId,
      userId: user.uid,
      userEmail: user.email
    });

    return NextResponse.json({
      success: true,
      message: "Datos sincronizados correctamente con Firestore",
      ...result
    });
  } catch (error: any) {
    console.error("Error en endpoint /api/sync:", error);
    return NextResponse.json(
      { error: "Error al sincronizar con Firestore", details: error?.message || String(error) },
      { status: 500 }
    );
  }
});
