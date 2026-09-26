import { getAdminFirestore } from "@/server/config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { calculateUsageCost } from "@/lib/finops";
import { AI_TEXT_MODEL } from "@/lib/ai-config";

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
  code?: "AI_BUDGET_EXCEEDED" | "BUDGET_VERIFICATION_UNAVAILABLE";
  error?: string;
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
 * Acumula el uso de IA en Firestore: ai_usage/{uid}/months/{AAAA-MM} (hora de Madrid)
 * y actualiza en ai_usage_summary/{AAAA-MM} el acumulador mensual global.
 * Actualización transaccional con FieldValue.increment para totalEur y requests.
 */
export async function recordAiUsage(
  uid: string,
  action: string,
  tokensIn: number,
  tokensOut: number,
  imageCount = 0,
  userInfo?: { email?: string; displayName?: string },
  modelName = AI_TEXT_MODEL
): Promise<void> {
  const db = getAdminFirestore();
  const yearMonth = getMadridYearMonth();
  const docRef = db.collection("ai_usage").doc(uid).collection("months").doc(yearMonth);
  const globalSummaryRef = db.collection("ai_usage_summary").doc(yearMonth);

  const estimatedCostEur = calculateUsageCost({
    action: action as any,
    tokensInput: tokensIn,
    tokensOutput: tokensOut,
    imageCount,
  });

  const email = userInfo?.email || `${uid}@ecomspain.com`;
  const displayName = userInfo?.displayName || userInfo?.email?.split("@")[0] || uid;
  const sanitizedModelKey = modelName.replace(/[^a-zA-Z0-9_-]/g, "_");

  await db.runTransaction(async (transaction) => {
    // 1. Actualización por usuario
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

    // 2. Actualización global mensual en ai_usage_summary/{YYYY-MM}
    const globalDoc = await transaction.get(globalSummaryRef);
    if (!globalDoc.exists) {
      transaction.set(globalSummaryRef, {
        month: yearMonth,
        totalCostEur: estimatedCostEur,
        totalInputTokens: tokensIn,
        totalOutputTokens: tokensOut,
        totalImageGenerations: imageCount,
        byUser: {
          [uid]: {
            email,
            displayName,
            costEur: estimatedCostEur,
            operationsCount: 1,
          },
        },
        byModel: {
          [sanitizedModelKey]: {
            costEur: estimatedCostEur,
            calls: 1,
          },
        },
        lastUpdated: new Date().toISOString(),
      });
    } else {
      transaction.update(globalSummaryRef, {
        totalCostEur: FieldValue.increment(estimatedCostEur),
        totalInputTokens: FieldValue.increment(tokensIn),
        totalOutputTokens: FieldValue.increment(tokensOut),
        totalImageGenerations: FieldValue.increment(imageCount),
        [`byUser.${uid}.email`]: email,
        [`byUser.${uid}.displayName`]: displayName,
        [`byUser.${uid}.costEur`]: FieldValue.increment(estimatedCostEur),
        [`byUser.${uid}.operationsCount`]: FieldValue.increment(1),
        [`byModel.${sanitizedModelKey}.costEur`]: FieldValue.increment(estimatedCostEur),
        [`byModel.${sanitizedModelKey}.calls`]: FieldValue.increment(1),
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

  // 1. Leer configuración desde ai_budget_config/default con fail-closed
  let config = DEFAULT_CONFIG;
  try {
    const configSnap = await db.collection("ai_budget_config").doc("default").get();
    if (configSnap.exists) {
      config = { ...DEFAULT_CONFIG, ...configSnap.data() };
    }
  } catch (err: any) {
    console.error("[checkAiBudget] Error leyendo ai_budget_config/default desde Firestore. Aplicando Fail-Closed:", err);
    return {
      allowed: false,
      currentSpentEur: 0,
      limitEur: DEFAULT_CONFIG.defaultMonthlyLimitEur,
      pct: 0,
      code: "BUDGET_VERIFICATION_UNAVAILABLE",
      error: `Imposible verificar la configuración del presupuesto de IA: ${err?.message || err}`
    };
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

  // 3. Leer consumo actual del mes (Madrid) con comportamiento fail-closed
  const yearMonth = getMadridYearMonth();
  let currentSpentEur = 0;
  try {
    const usageSnap = await db.collection("ai_usage").doc(uid).collection("months").doc(yearMonth).get();
    if (usageSnap.exists) {
      currentSpentEur = usageSnap.data()?.totalEur || 0;
    }
  } catch (err: any) {
    console.error("[checkAiBudget] Error en la verificación de Firestore. Aplicando política Fail-Closed:", err);
    return {
      allowed: false,
      currentSpentEur: 0,
      limitEur,
      pct: 0,
      code: "BUDGET_VERIFICATION_UNAVAILABLE",
      error: `Imposible verificar el presupuesto acumulado de IA: ${err?.message || err}`
    };
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
