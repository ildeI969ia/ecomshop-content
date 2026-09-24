import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import {
  buildDiscoveryPrompt,
  parseDiscoveryResponse,
  compareWithCatalog,
} from "@/lib/services/notebook-product-discovery";

export const POST = withAuthAndPermission("ai:execute", async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const notebookApiUrl = body.notebookApiUrl || "/api/notebooklm/ask";

    const prompt = buildDiscoveryPrompt();

    const origin = new URL(request.url).origin;
    const authHeader = request.headers.get("authorization");
    const cookieHeader = request.headers.get("cookie");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) headers["authorization"] = authHeader;
    if (cookieHeader) headers["cookie"] = cookieHeader;

    const notebookResponse = await fetch(`${origin}${notebookApiUrl}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ question: prompt }),
    });

    if (!notebookResponse.ok) {
      return NextResponse.json(
        {
          error: {
            code: "NOTEBOOK_ERROR",
            message: `NotebookLM respondió con status ${notebookResponse.status}`,
            retryable: true,
          },
        },
        { status: 502 }
      );
    }

    const notebookData = await notebookResponse.json();
    const responseText = notebookData.answer || notebookData.response || JSON.stringify(notebookData);

    const discovered = parseDiscoveryResponse(responseText);

    const report = compareWithCatalog(discovered);

    return NextResponse.json({
      success: true,
      report,
      rawResponse: responseText.slice(0, 2000),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      {
        error: {
          code: "DISCOVERY_FAILED",
          message,
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
});
