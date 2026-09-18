import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest, authorizePermission } from "@/server/security/auth";
import { PersistenceService } from "@/server/services/persistence-service";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateServerRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión con una cuenta corporativa @ecomspain.com" },
        { status: 401 }
      );
    }

    if (!authorizePermission(user, "content:create")) {
      return NextResponse.json(
        { error: "Permisos insuficientes para sincronizar datos" },
        { status: 403 }
      );
    }

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
}
