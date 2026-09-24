import { NextRequest, NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/auth/rbac-guard";
import { isAllowedEcomshopUrl, fetchWithRedirects, extractProductFromHtml, mapStringToDeviceType } from "@/lib/catalog/resolve";
import { getCatalogDevice } from "@/lib/catalog";
import type { CatalogDevice } from "@/lib/catalog";

interface CatalogResolveError {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface ResolvedProduct {
  sku?: string;
  name?: string;
  model?: string;
  brand?: string;
  type?: string;
  category?: string;
  description?: string;
  url: string;
  imageUrl?: string;
  specs?: Record<string, string>;
  sourceMetadata: {
    sourceType: "ecomshop_url";
    sourceUrl: string;
    resolvedAt: string;
    extractionStatus: "SUCCESS" | "PARTIAL" | "FAILED";
    extractionWarnings: string[];
    confidenceScore: number;
    notebookGrounded: false;
  };
}

function errorResponse(status: number, code: string, message: string, retryable = false): NextResponse {
  const payload: CatalogResolveError = {
    error: { code, message, retryable },
  };
  return NextResponse.json(payload, { status });
}

export const POST = withAuthAndPermission("ai:execute", async (request: NextRequest) => {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "MALFORMED_JSON", "Request body must be valid JSON.");
  }

  const rawUrl = body?.url?.trim();
  if (!rawUrl) {
    return errorResponse(400, "MISSING_URL", "`url` field is required.");
  }
  if (!isAllowedEcomshopUrl(rawUrl)) {
    return errorResponse(403, "DISALLOWED_URL", "URL is not permitted by SSRF policy.");
  }

  let response: Response;
  try {
    response = await fetchWithRedirects(rawUrl);
  } catch (e: any) {
    const msg = e?.message ?? "Unknown fetch error";
    if (msg.includes("Redirect") || msg.includes("Disallowed")) {
      return errorResponse(403, "DISALLOWED_REDIRECT", msg);
    }
    if (msg.includes("size exceeds")) {
      return errorResponse(413, "PAYLOAD_TOO_LARGE", msg);
    }
    if (msg.includes("Unsupported Content-Type")) {
      return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", msg);
    }
    if (msg.includes("abort")) {
      return errorResponse(504, "GATEWAY_TIMEOUT", "Request timed out.");
    }
    return errorResponse(502, "FETCH_FAILURE", msg);
  }

  const html = await response.text();
  const extracted = extractProductFromHtml(html);

  const warnings = extracted.warnings ?? [];
  const extractionStatus = warnings.length > 0 ? "PARTIAL" : "SUCCESS";
  const fieldsFound = [
    extracted.sku,
    extracted.name,
    extracted.brand,
    extracted.model,
    extracted.type,
    extracted.category,
    extracted.description,
    extracted.imageUrl,
    extracted.specs,
  ].filter(Boolean).length;
  const totalFields = 9;
  const confidenceScore = fieldsFound / totalFields;

  const resolved: ResolvedProduct = {
    sku: extracted.sku,
    name: extracted.name,
    model: extracted.model,
    brand: extracted.brand,
    type: extracted.type,
    category: extracted.category,
    description: extracted.description,
    url: rawUrl,
    imageUrl: extracted.imageUrl,
    specs: extracted.specs,
    sourceMetadata: {
      sourceType: "ecomshop_url",
      sourceUrl: rawUrl,
      resolvedAt: new Date().toISOString(),
      extractionStatus,
      extractionWarnings: warnings,
      confidenceScore,
      notebookGrounded: false,
    },
  };

  return NextResponse.json(resolved, { status: 200 });
});
