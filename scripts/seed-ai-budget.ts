import { getAdminFirestore } from "../src/server/config/firebase";

async function seedAiBudgetConfig() {
  console.log("🌱 Poblando configuración inicial de AI Budget en Firestore (ai_budget_config/default)...");

  try {
    const db = getAdminFirestore();
    const docRef = db.collection("ai_budget_config").doc("default");

    const defaultConfig = {
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
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(defaultConfig, { merge: true });
    console.log("✅ Configuración inicial de AI Budget guardada exitosamente con umbrales 0.8 y 0.95 en ai_budget_config/default.");
  } catch (error) {
    console.error("❌ Error al poblar ai_budget_config/default:", error);
    process.exit(1);
  }
}

seedAiBudgetConfig();
