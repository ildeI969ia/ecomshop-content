export interface SessionPayload {
  uid: string;
  email: string;
  role: string;
  workspaceId: string;
  exp: number;
}

function getSecretKey(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "[SecurityConfig] La variable de entorno SESSION_SECRET es obligatoria para firmar y verificar tokens de sesión. Configure SESSION_SECRET en Google Cloud Secret Manager o .env."
    );
  }
  return secret;
}

function strToBuffer(str: string): BufferSource {
  return new TextEncoder().encode(str) as unknown as BufferSource;
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64Url(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8").toString("base64url");
  }
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(base64url: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64url, "base64url").toString("utf-8");
  }
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return decodeURIComponent(escape(atob(base64)));
}

export async function createSessionToken(
  payload: Omit<SessionPayload, "exp">,
  expiresInSeconds: number = 60 * 60 * 24 * 7
): Promise<string> {
  const exp = Date.now() + expiresInSeconds * 1000;
  const fullPayload: SessionPayload = { ...payload, exp };
  const jsonStr = JSON.stringify(fullPayload);
  const base64Payload = toBase64Url(jsonStr);

  const secret = getSecretKey();
  const key = await crypto.subtle.importKey(
    "raw",
    strToBuffer(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, strToBuffer(base64Payload));
  const hexSig = bufToHex(signature);

  return base64Payload + "." + hexSig;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    if (!token || !token.includes(".")) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [base64Payload, signature] = parts;
    if (!base64Payload || !signature) return null;

    const secret = getSecretKey();
    const key = await crypto.subtle.importKey(
      "raw",
      strToBuffer(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expectedSigBuf = await crypto.subtle.sign("HMAC", key, strToBuffer(base64Payload));
    const expectedSigHex = bufToHex(expectedSigBuf);

    if (signature !== expectedSigHex) {
      return null;
    }

    const jsonStr = fromBase64Url(base64Payload);
    const payload = JSON.parse(jsonStr) as SessionPayload;

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
