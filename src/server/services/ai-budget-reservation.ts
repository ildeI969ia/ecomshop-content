import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/server/config/firebase";
import { calculateUsageCost } from "@/lib/finops";

export interface BudgetReservation {
  reservationId: string;
  uid: string;
  yearMonth: string;
  amountEur: number;
  limitEur: number;
  currentCommittedEur: number;
  pct: number;
  bypassed: boolean;
}

export interface BudgetReservationResult {
  allowed: boolean;
  reservation?: BudgetReservation;
  currentSpentEur: number;
  currentReservedEur: number;
  limitEur: number;
  pct: number;
  code?: "AI_BUDGET_EXCEEDED" | "BUDGET_VERIFICATION_UNAVAILABLE";
  error?: string;
}

interface BudgetConfig {
  defaultMonthlyLimitEur: number;
  roleLimitsEur: Record<string, number>;
  userOverrides: Record<string, number>;
  enforcementMode: "block" | "warn_only" | "admin_bypass";
}

const DEFAULT_CONFIG: BudgetConfig = {
  defaultMonthlyLimitEur: 10,
  roleLimitsEur: { admin: 100, editor: 25, viewer: 2 },
  userOverrides: {},
  enforcementMode: "block"
};

function getMadridYearMonth(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(date);
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}`;
}

async function resolveLimit(uid: string, role: string, db: Firestore): Promise<{ config: BudgetConfig; limitEur: number }> {
  try {
    const snap = await db.collection("ai_budget_config").doc("default").get();
    const config = snap.exists
      ? { ...DEFAULT_CONFIG, ...(snap.data() as Partial<BudgetConfig>) }
      : DEFAULT_CONFIG;
    const normalizedRole = role.toLowerCase();
    const roleLimits = config.roleLimitsEur || {};
    const limitEur =
      typeof config.userOverrides?.[uid] === "number"
        ? config.userOverrides[uid]
        : typeof roleLimits[normalizedRole] === "number"
          ? roleLimits[normalizedRole]
          : config.defaultMonthlyLimitEur;
    return { config, limitEur };
  } catch (error) {
    throw new Error(`BUDGET_CONFIG_UNAVAILABLE: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Reserva presupuesto de forma atómica antes de iniciar una operación de IA.
 * La decisión usa committed + reserved, por lo que dos peticiones concurrentes
 * no pueden observar el mismo saldo disponible y consumirlo dos veces.
 */
export async function reserveAiBudget(
  uid: string,
  role: string,
  estimatedCostEur: number
): Promise<BudgetReservationResult> {
  const db = getAdminFirestore();
  const yearMonth = getMadridYearMonth();
  const usageRef = db.collection("ai_usage").doc(uid).collection("months").doc(yearMonth);
  const reservationId = `res-${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const reservationRef = db.collection("ai_budget_reservations").doc(reservationId);

  let resolved: { config: BudgetConfig; limitEur: number };
  try {
    resolved = await resolveLimit(uid, role, db);
  } catch (error) {
    return {
      allowed: false,
      currentSpentEur: 0,
      currentReservedEur: 0,
      limitEur: DEFAULT_CONFIG.defaultMonthlyLimitEur,
      pct: 0,
      code: "BUDGET_VERIFICATION_UNAVAILABLE",
      error: error instanceof Error ? error.message : String(error)
    };
  }

  const { config, limitEur } = resolved;
  const normalizedRole = role.toLowerCase();
  const bypassed = normalizedRole === "admin" && config.enforcementMode === "admin_bypass";
  const warnOnly = config.enforcementMode === "warn_only";
  const amount = Math.max(0, estimatedCostEur);

  try {
    let result: BudgetReservationResult | undefined;
    await db.runTransaction(async (transaction) => {
      const usageSnap = await transaction.get(usageRef);
      const usage = usageSnap.exists ? usageSnap.data() || {} : {};
      const spent = typeof usage.totalEur === "number" ? usage.totalEur : 0;
      const reserved = typeof usage.reservedEur === "number" ? usage.reservedEur : 0;
      const committed = spent + reserved;
      const projected = committed + amount;
      const pct = limitEur > 0 ? (projected / limitEur) * 100 : 100;

      if (!bypassed && !warnOnly && projected > limitEur) {
        result = {
          allowed: false,
          currentSpentEur: spent,
          currentReservedEur: reserved,
          limitEur,
          pct,
          code: "AI_BUDGET_EXCEEDED"
        };
        return;
      }

      const now = new Date().toISOString();
      const usageData = {
        reservedEur: FieldValue.increment(amount),
        lastBudgetReservationAt: now
      };

      if (usageSnap.exists) transaction.update(usageRef, usageData);
      else {
        transaction.set(usageRef, {
          totalEur: 0,
          estimatedCostEur: 0,
          reservedEur: amount,
          requests: 0,
          tokensIn: 0,
          tokensOut: 0,
          imageCount: 0,
          lastUpdated: now,
          lastBudgetReservationAt: now
        });
      }

      transaction.set(reservationRef, {
        uid,
        yearMonth,
        amountEur: amount,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now
      });

      result = {
        allowed: true,
        reservation: {
          reservationId,
          uid,
          yearMonth,
          amountEur: amount,
          limitEur,
          currentCommittedEur: projected,
          pct,
          bypassed: bypassed || warnOnly
        },
        currentSpentEur: spent,
        currentReservedEur: reserved + amount,
        limitEur,
        pct
      };
    });
    return result as BudgetReservationResult;
  } catch (error) {
    return {
      allowed: false,
      currentSpentEur: 0,
      currentReservedEur: 0,
      limitEur,
      pct: 0,
      code: "BUDGET_VERIFICATION_UNAVAILABLE",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Libera una reserva cuando la operación no llega a consumir IA.
 */
export async function releaseAiBudgetReservation(reservationId: string): Promise<void> {
  const db = getAdminFirestore();
  const reservationRef = db.collection("ai_budget_reservations").doc(reservationId);
  const snap = await reservationRef.get();
  if (!snap.exists) return;

  const reservation = snap.data() || {};
  if (reservation.status !== "ACTIVE") return;

  const usageRef = db.collection("ai_usage").doc(String(reservation.uid)).collection("months").doc(String(reservation.yearMonth));

  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(reservationRef);
    if (!current.exists || current.data()?.status !== "ACTIVE") return;

    const amount = Number(current.data()?.amountEur || 0);
    const usage = await transaction.get(usageRef);

    if (usage.exists) {
      transaction.update(usageRef, {
        reservedEur: FieldValue.increment(-amount),
        lastUpdated: new Date().toISOString()
      });
    }

    transaction.update(reservationRef, {
      status: "RELEASED",
      releasedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
}

/**
 * Registra el coste real y consume la reserva. El coste final puede ser inferior
 * o superior al estimado; en ambos casos la reserva deja de bloquear saldo.
 */
export async function reconcileAiBudgetReservation(
  reservationId: string,
  actualCostEur: number
): Promise<void> {
  const db = getAdminFirestore();
  const reservationRef = db.collection("ai_budget_reservations").doc(reservationId);
  const snap = await reservationRef.get();
  if (!snap.exists) return;

  const reservation = snap.data() || {};
  if (reservation.status !== "ACTIVE") return;

  const usageRef = db.collection("ai_usage").doc(String(reservation.uid)).collection("months").doc(String(reservation.yearMonth));
  const amountReserved = Number(reservation.amountEur || 0);
  const actual = Math.max(0, actualCostEur);

  await db.runTransaction(async (transaction) => {
    const currentReservation = await transaction.get(reservationRef);
    const usage = await transaction.get(usageRef);

    if (!currentReservation.exists || currentReservation.data()?.status !== "ACTIVE") return;

    if (usage.exists) {
      transaction.update(usageRef, {
        reservedEur: FieldValue.increment(-amountReserved),
        totalEur: FieldValue.increment(actual - amountReserved),
        estimatedCostEur: FieldValue.increment(actual - amountReserved),
        lastUpdated: new Date().toISOString()
      });
    }

    transaction.update(reservationRef, {
      status: "RECONCILED",
      actualCostEur: actual,
      reconciledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
}

/**
 * Calcula el coste estimado con el mismo motor que FinOps para que la reserva
 * y el registro final hablen el mismo lenguaje económico.
 */
export function estimateAiOperationCost(action: string, tokensInput: number, tokensOutput: number, imageCount = 0): number {
  return calculateUsageCost({
    action: action as never,
    tokensInput,
    tokensOutput,
    imageCount
  });
}
