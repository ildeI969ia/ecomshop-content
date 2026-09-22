// src/lib/catalog/resolve.ts

/**
 * Helper utilities for the /api/catalog/resolve endpoint.
 * Includes URL validation (SSRF protection), safe fetching with timeout,
 * response size limiting, redirect handling, and HTML extraction.
 */

// src/lib/catalog/resolve.ts

import * as cheerio from "cheerio";

/** Allowed hostnames for ecomshop URLs */
const ALLOWED_HOSTNAMES = new Set(["ecomshop.es", "www.ecomshop.es"]);

/** Max allowed URL length */
const MAX_URL_LENGTH = 512;
/** Max redirects to follow */
const MAX_REDIRECTS = 3;
/** Max response size (bytes) */
const MAX_RESPONSE_SIZE = 2 * 1024 * 1024; // 2 MB
/** Request timeout in ms */
const REQUEST_TIMEOUT_MS = 6000;

/**
 * Determines whether a URL is allowed according to SSRF rules.
 */
export function isAllowedEcomshopUrl(urlString: string): boolean {
  if (!urlString || urlString.length > MAX_URL_LENGTH) return false;
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }
  // Must be HTTPS
  if (url.protocol !== "https:") return false;
  // No username/password (credentials)
  if (url.username || url.password) return false;
  // Hostname must be in the whitelist
  const hostname = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTNAMES.has(hostname)) return false;
  // Disallow IP literals (including IPv4/IPv6 and private ranges)
  const ipPattern = /^(?:\d{1,3}\.){3}\d{1,3}$|^\[.*\]$/;
  if (ipPattern.test(hostname)) return false;
  return true;
}

/**
 * Fetches a URL safely, respecting redirects, timeout, and size limits.
 * Returns the final response object (already checked for Content-Type).
 */
export async function fetchWithRedirects(initialUrl: string): Promise<Response> {
  let url = initialUrl;
  let redirects = 0;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  while (redirects <= MAX_REDIRECTS) {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
    });

    // If response is a redirect, validate the location and loop
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        clearTimeout(timeoutId);
        throw new Error("Redirect without Location header");
      }
      const nextUrl = new URL(location, url).toString();
      if (!isAllowedEcomshopUrl(nextUrl)) {
        clearTimeout(timeoutId);
        throw new Error("Redirect to disallowed URL");
      }
      url = nextUrl;
      redirects++;
      continue;
    }

    // Non‑redirect response – validate content type and size
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      clearTimeout(timeoutId);
      throw new Error("Unsupported Content-Type: " + contentType);
    }

    // Size guard – stream and count bytes up to the limit
    const reader = response.body?.getReader();
    if (!reader) {
      clearTimeout(timeoutId);
      throw new Error("No response body");
    }
    let total = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_SIZE) {
        clearTimeout(timeoutId);
        throw new Error("Response size exceeds 2 MB limit");
      }
      chunks.push(value);
    }
    clearTimeout(timeoutId);
      // Concatenate chunks into a single Uint8Array and decode as UTF-8 text
      const combined = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      const text = new TextDecoder().decode(combined);
      return new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
  }

  clearTimeout(timeoutId);
  throw new Error("Too many redirects");
}

/** Simple extraction of product‑related metadata from HTML using node‑html‑parser. */
export interface ExtractedProductData {
  sku?: string;
  name?: string;
  model?: string;
  brand?: string;
  type?: string; // will be mapped to DeviceType later if possible
  category?: string;
  description?: string;
  imageUrl?: string;
  specs?: Record<string, string>;
  warnings?: string[];
}

export function extractProductFromHtml(html: string): ExtractedProductData {
  const $ = cheerio.load(html);
  const data: ExtractedProductData = { warnings: [] };

  const ogTitle = $('meta[property="og:title"]').attr("content");
  if (ogTitle) data.name = ogTitle;

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) data.imageUrl = ogImage;

  const ogDesc = $('meta[property="og:description"]').attr("content");
  if (ogDesc) data.description = ogDesc;

  const jsonLdScript = $('script[type="application/ld+json"]').first().html();
  if (jsonLdScript) {
    try {
      const json = JSON.parse(jsonLdScript);
      if (json && typeof json === "object") {
        if (json.sku) data.sku = String(json.sku);
        if (json.brand?.name) data.brand = String(json.brand.name);
        if (json.name) data.name = String(json.name);
        if (json.description) data.description = String(json.description);
        if (json.image) data.imageUrl = Array.isArray(json.image) ? json.image[0] : String(json.image);
        if (json.model) data.model = String(json.model);
        if (json.productID) data.sku = String(json.productID);
      }
    } catch {
      data.warnings?.push("Failed to parse JSON‑LD");
    }
  }

  const skuElem = $("#sku, .sku, [data-sku]").first();
  if (skuElem.length && !data.sku) data.sku = skuElem.text().trim();

  const brandElem = $(".brand, [data-brand]").first();
  if (brandElem.length && !data.brand) data.brand = brandElem.text().trim();

  const specs: Record<string, string> = {};
  $("table.specs tr, .specs-table tr").each((_, row) => {
    const cells = $(row).find("td, th");
    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim();
      const val = $(cells[1]).text().trim();
      if (key && val) specs[key] = val;
    }
  });
  if (Object.keys(specs).length) data.specs = specs;

  if (!data.sku) data.warnings?.push("SKU not found");
  if (!data.name) data.warnings?.push("Product name not found");

  return data;
}

/** Map raw string to DeviceType enum (if possible). */
export function mapStringToDeviceType(str?: string): string | undefined {
  if (!str) return undefined;
  const norm = str.toUpperCase();
  const map: Record<string, string> = {
    ACCESS_POINT: "ACCESS_POINT",
    SWITCH: "SWITCH",
    GATEWAY: "GATEWAY",
    ACCESSORY: "ACCESSORY",
    ROUTER_CELLULAR: "ROUTER_CELLULAR",
    TESTER: "TESTER",
  };
  return map[norm];
}
