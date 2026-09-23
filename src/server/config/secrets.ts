/**
 * Gestor Centralizado de Secretos y Configuración Segura de Servidor (Fase F6).
 *
 * REGLAS DE SEGURIDAD ESTRICTAS:
 * 1. Prohibido el uso de secretos o contraseñas por defecto hardcodeadas en código fuente.
 * 2. Si un secreto obligatorio no se encuentra definido en el entorno (o Secret Manager),
 *    el sistema debe fallar de forma explícita y segura con error tipado.
 * 3. Nunca registrar ni exponer en logs ni mensajes de error los valores reales de los secretos.
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
 * Obtiene la contraseña corporativa de acceso (CORPORATE_ACCESS_PASSWORD).
 * Lanza MissingConfigurationError si no está configurada o si es una cadena vacía.
 */
export function getRequiredCorporatePassword(): string {
  const password = process.env.CORPORATE_ACCESS_PASSWORD?.trim();
  if (!password) {
    throw new MissingConfigurationError("CORPORATE_ACCESS_PASSWORD");
  }
  return password;
}

/**
 * Obtiene la contraseña de acceso de administrador (ADMIN_ACCESS_PASSWORD).
 * Lanza MissingConfigurationError si no está configurada o si es una cadena vacía.
 */
export function getRequiredAdminPassword(): string {
  const password = process.env.ADMIN_ACCESS_PASSWORD?.trim();
  if (!password) {
    throw new MissingConfigurationError("ADMIN_ACCESS_PASSWORD");
  }
  return password;
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
    "CORPORATE_ACCESS_PASSWORD",
    "ADMIN_ACCESS_PASSWORD",
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
