/**
 * Gestor Centralizado de Secretos y Configuración Segura de Servidor (Fase 1b).
 *
 * REGLAS DE SEGURIDAD ESTRICTAS:
 * 1. Prohibido el uso de contraseñas compartidas o por defecto hardcodeadas en código fuente.
 * 2. Autenticación gestionada exclusivamente vía Google Workspace OAuth2 y Firebase Session Cookies.
 * 3. Si un secreto obligatorio no se encuentra definido en el entorno (o Secret Manager),
 *    el sistema debe fallar de forma explícita y segura con error tipado.
 * 4. Nunca registrar ni exponer en logs ni mensajes de error los valores reales de los secretos.
 */

export class MissingConfigurationError extends Error {
  public readonly configKey: string;

  constructor(configKey: string) {
    super(`[SecurityConfig] Variable de entorno requerida ausente: ${configKey}. Configure el valor en Google Cloud Secret Manager o .env.`);
    this.name = "MissingConfigurationError";
    this.configKey = configKey;
  }
}

/**
 * Obtiene el secreto de sesión criptográfico (SESSION_SECRET).
 * Lanza MissingConfigurationError si no está configurado o si es una cadena vacía.
 */
export function getRequiredSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new MissingConfigurationError("SESSION_SECRET");
  }
  return secret;
}

/**
 * Comprueba el estado de configuración de los secretos sin exponer sus valores.
 */
export function checkSecretsHealth(): {
  ok: boolean;
  configured: Record<string, boolean>;
  missing: string[];
} {
  const keys = [
    "SESSION_SECRET",
    "GCS_BUCKET_NAME"
  ];

  const configured: Record<string, boolean> = {};
  const missing: string[] = [];

  for (const k of keys) {
    const isSet = Boolean(process.env[k]?.trim());
    configured[k] = isSet;
    if (!isSet) {
      missing.push(k);
    }
  }

  return {
    ok: missing.length === 0,
    configured,
    missing
  };
}
