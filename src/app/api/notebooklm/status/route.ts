import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { OFFICIAL_NOTEBOOK, NotebookSource } from "@/lib/notebooklm";

let currentNotebookState = { ...OFFICIAL_NOTEBOOK };

export const GET = withAuthAndPermission("content:view", async () => {
  return NextResponse.json(currentNotebookState);
});

export const POST = withAuthAndPermission("ai:execute", async (req: NextRequest) => {
  try {
    const { title, type, description, url } = await req.json();
    if (!title || !description) {
      return NextResponse.json({ error: "Faltan datos de la fuente" }, { status: 400 });
    }

    const newSource: NotebookSource = {
      id: `src-${Date.now()}`,
      title,
      type: type || "note",
      description,
      url,
      addedAt: new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
    };

    currentNotebookState = {
      ...currentNotebookState,
      lastSync: new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      sources: [newSource, ...currentNotebookState.sources]
    };

    return NextResponse.json(currentNotebookState);
  } catch (error: any) {
    return NextResponse.json({ error: "Error al registrar fuente" }, { status: 500 });
  }
});
