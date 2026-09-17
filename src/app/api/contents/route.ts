import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest, authorizePermission } from "@/server/security/auth";
import { ContentRepository } from "@/server/repositories";

export async function GET(req: NextRequest) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const repo = new ContentRepository();
  try {
    const list = await repo.listRecent(50);
    return NextResponse.json({ contents: list });
  } catch (err: any) {
    return NextResponse.json({ contents: [], error: err?.message }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const user = await authenticateServerRequest(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!authorizePermission(user, "content:create")) {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const repo = new ContentRepository();
    const content = {
      id: `content-${Date.now()}`,
      workspaceId: user.workspaceId,
      campaignId: body.campaignId || "",
      title: body.title || "Sin título",
      body: body.body || "",
      type: body.type || "blog_post",
      status: body.status || "DRAFT",
      version: 1,
      authorId: user.uid,
      tags: body.tags || [],
      metadata: body.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await repo.save(content as any);
    return NextResponse.json({ success: true, content });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

