import { NextResponse } from "next/server";
import {
  buildDiscoveryPrompt,
  parseDiscoveryResponse,
  compareWithCatalog,
} from "@/lib/services/notebook-product-discovery";

/**
 * POST /api/catalog/discover
 * Interroga NotebookLM para descubrir productos y compara con el catálogo canónico.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const notebookApiUrl = body.notebookApiUrl || "/api/notebooklm/ask";

    // Construir el prompt de interrogación
    const prompt = buildDiscoveryPrompt();

    // Llamar a NotebookLM internamente
    const origin = new URL(request.url).origin;
    const notebookResponse = await fetch(`${origin}${notebookApiUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    // Parsear productos descubiertos
    const discovered = parseDiscoveryResponse(responseText);

    // Comparar con catálogo canónico
    const report = compareWithCatalog(discovered);

    return NextResponse.json({
      success: true,
      report,
      rawResponse: responseText.slice(0, 2000), // Truncar para debug
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
}
