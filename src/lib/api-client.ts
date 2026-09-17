export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Cliente HTTP unificado para peticiones autenticadas al backend.
 * Incluye credenciales (cookies de sesión __session), headers por defecto
 * y parseo estructurado de errores (401/403).
 */
export async function apiFetch<T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = 120000, headers, ...restOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...restOptions,
      credentials: "include", // Enviar cookies de sesion (__session)
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errPayload: any = {};
      try {
        errPayload = await res.json();
      } catch {
        errPayload = { error: res.statusText };
      }

      const errorMessage =
        errPayload.error ||
        errPayload.message ||
        `Error HTTP ${res.status}: ${res.statusText}`;

      throw new ApiError(
        errorMessage,
        res.status,
        errPayload.code,
        errPayload.details
      );
    }

    return (await res.json()) as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.name === "AbortError") {
      throw new ApiError("La peticion ha superado el tiempo maximo de espera (timeout)", 408);
    }
    throw new ApiError(error.message || "Error de red inesperado", 0);
  }
}
