import { getAdminFirestore } from "@/server/config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { calculateUsageCost } from "@/lib/finops";

export interface AiBudgetConfig {
  defaultMonthlyLimitEur: number;
  roleLimitsEur: Record<string, number>;
  userOverrides: Record<string, number>;
  warnThresholdRatio: number;
  blockThresholdRatio: number;
  enforcementMode: "block" | "warn_only" | "admin_bypass";
}

export interface CheckBudgetResult {
  allowed: boolean;
  currentSpentEur: number;
  limitEur: number;
  pct: number;
  code?: "AI_BUDGET_EXCEEDED";
}

const DEFAULT_CONFIG: AiBudgetConfig = {
  defaultMonthlyLimitEur: 10.0,
  roleLimitsEur: {
    admin: 100.0,
    editor: 25.0,
    viewer: 2.0,
  },
  userOverrides: {},
  warnThresholdRatio: 0.8,
  blockThresholdRatio: 0.95,
  enforcementMode: "block",
};

/**
 * Obtiene la clave del mes actual en hora de Madrid (AAAA-MM).
 */
function getMadridYearMonth(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  });
  // Formato de en-CA con 'numeric' y '2-digit' es YYYY-MM
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

/**
 * Acumula el uso de IA en Firestore: ai_usage/{uid}/months/{AAAA-MM} (hora de Madrid).
 * Actualización transaccional con FieldValue.increment para totalEur y requests.
 */
export async function recordAiUsage(
  uid: string,
  action: string,
  tokensIn: number,
  tokensOut: number,
  imageCount = 0
): Promise<void> {
  const db = getAdminFirestore();
  const yearMonth = getMadridYearMonth();
  const docRef = db.collection("ai_usage").doc(uid).collection("months").doc(yearMonth);

  const estimatedCostEur = calculateUsageCost({
    action: action as any,
    tokensInput: tokensIn,
    tokensOutput: tokensOut,
    imageCount,
  });

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) {
      transaction.set(docRef, {
        totalEur: estimatedCostEur,
        requests: 1,
        tokensIn: tokensIn,
        tokensOut: tokensOut,
        imageCount: imageCount,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      transaction.update(docRef, {
        totalEur: FieldValue.increment(estimatedCostEur),
        requests: FieldValue.increment(1),
        tokensIn: FieldValue.increment(tokensIn),
        tokensOut: FieldValue.increment(tokensOut),
        imageCount: FieldValue.increment(imageCount),
        lastUpdated: new Date().toISOString(),
      });
    }
  });
}

/**
 * Evalúa los límites presupuestarios de IA para un usuario.
 */
export async function checkAiBudget(
  uid: string,
  role: string,
  estimatedCostEur: number
): Promise<CheckBudgetResult> {
  const db = getAdminFirestore();

  // 1. Leer configuración desde ai_budget_config/default
  let config = DEFAULT_CONFIG;
  try {
    const configSnap = await db.collection("ai_budget_config").doc("default").get();
    if (configSnap.exists) {
      config = { ...DEFAULT_CONFIG, ...configSnap.data() };
    }
  } catch (err) {
    console.warn("[checkAiBudget] Error leyendo ai_budget_config/default, usando valores por defecto:", err);
  }

  // 2. Determinar límite aplicable (userOverrides > monthlyLimitEurByRole / roleLimitsEur > defaultMonthlyLimit)
  const normalizedRole = (role || "").toLowerCase();
  let limitEur = config.defaultMonthlyLimitEur;

  // Buscar límites por rol admitiendo tanto roleLimitsEur como monthlyLimitEurByRole
  const roleLimits = (config as any).monthlyLimitEurByRole || config.roleLimitsEur || {};
  const normalizedRoleLimits: Record<string, number> = {};
  for (const [k, v] of Object.entries(roleLimits)) {
    if (typeof v === "number") {
      normalizedRoleLimits[k.toLowerCase()] = v;
    }
  }

  if (config.userOverrides && typeof config.userOverrides[uid] === "number") {
    limitEur = config.userOverrides[uid];
  } else if (typeof normalizedRoleLimits[normalizedRole] === "number") {
    limitEur = normalizedRoleLimits[normalizedRole];
  }

  // 3. Leer consumo actual del mes (Madrid)
  const yearMonth = getMadridYearMonth();
  let currentSpentEur = 0;
  try {
    const usageSnap = await db.collection("ai_usage").doc(uid).collection("months").doc(yearMonth).get();
    if (usageSnap.exists) {
      currentSpentEur = usageSnap.data()?.totalEur || 0;
    }
  } catch (err) {
    console.warn("[checkAiBudget] Error leyendo ai_usage del usuario, asumiendo 0:", err);
  }

  const projectedSpentEur = currentSpentEur + estimatedCostEur;
  const pct = limitEur > 0 ? (projectedSpentEur / limitEur) * 100 : 0;

  // 4. Evaluar según modo de cumplimiento
  if (normalizedRole === "admin" && config.enforcementMode === "admin_bypass") {
    return {
      allowed: true,
      currentSpentEur,
      limitEur,
      pct,
    };
  }

  if (config.enforcementMode === "warn_only") {
    return {
      allowed: true,
      currentSpentEur,
      limitEur,
      pct,
    };
  }

  // Modo 'block' (o default)
  const isExceeded = projectedSpentEur > limitEur;

  if (isExceeded) {
    return {
      allowed: false,
      currentSpentEur,
      limitEur,
      pct,
      code: "AI_BUDGET_EXCEEDED",
    };
  }

  return {
    allowed: true,
    currentSpentEur,
    limitEur,
    pct,
  };
}
