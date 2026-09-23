/**
 * Capa de Aislamiento de Seguridad y Sanitización de Entorno para Agentes.
 *
 * REGLAS:
 * 1. El worker nunca debe heredar credenciales sensibles (SESSION_SECRET, passwords,
 *    API keys, GCP service account credentials, tokens de auth).
 * 2. Solo se propagan variables que figuren en la allowlist estricta de entorno.
 * 3. En los logs se registran únicamente los nombres de variables, nunca sus valores.
 */

export const SAFE_ENV_ALLOWLIST = new Set([
  "NODE_ENV",
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "HOMEPATH",
  "HOMEDRIVE",
  "USERPROFILE",
  "LANG",
  "LC_ALL",
  "CI"
]);

export function sanitizeEnvironmentForAgent(
  parentEnv: Record<string, string | undefined> = process.env,
  additionalAllowed: Record<string, string> = {}
): Record<string, string> {
  const cleanEnv: Record<string, string> = {};

  for (const [key, value] of Object.entries(parentEnv)) {
    if (value !== undefined && SAFE_ENV_ALLOWLIST.has(key.toUpperCase())) {
      cleanEnv[key] = value;
    }
  }

  // Integrar variables adicionales explícitas y seguras (e.g. RUN_ID, TASK_ID)
  for (const [key, value] of Object.entries(additionalAllowed)) {
    cleanEnv[key] = value;
  }

  return cleanEnv;
}

export function auditSanitizedEnvironment(env: Record<string, string>): string[] {
  return Object.keys(env);
}
