export interface UsageRecord {
  id: string;
  timestamp: string;
  action: "gemini_generation" | "gemini_angles" | "imagen_image" | "firestore_read" | "firestore_write" | "cloud_run_req";
  details: string;
  tokensInput?: number;
  tokensOutput?: number;
  imageCount?: number;
  estimatedCostEur: number;
}

// Precios de referencia oficiales (Google Cloud & Firebase)
export const PRICING = {
  // Gemini 2.5 Flash: $0.075 / 1M input, $0.30 / 1M output (~0.07€ y 0.28€)
  geminiInputPerMillionEur: 0.07,
  geminiOutputPerMillionEur: 0.28,
  
  // Google Imagen 3: ~$0.03 por imagen (~0.028€)
  imagen3PerImageEur: 0.028,

  // Firebase Firestore: Primeras 50k lecturas y 20k escrituras/día son gratuitas en plan Spark.
  // Superado el tier gratis: ~$0.06 por 100k lecturas, ~$0.18 por 100k escrituras (~0.0000006€/lectura)
  firestoreReadEur: 0.0000006,
  firestoreWriteEur: 0.0000018,

  // Cloud Run: 2M peticiones/mes gratis en Free Tier. Luego ~$0.40 por millón (~0.00000038€/req)
  cloudRunPerReqEur: 0.00000038
};

export function calculateUsageCost(params: {
  action: UsageRecord["action"];
  tokensInput?: number;
  tokensOutput?: number;
  imageCount?: number;
}): number {
  let cost = 0;

  switch (params.action) {
    case "gemini_generation":
    case "gemini_angles": {
      const inCost = ((params.tokensInput || 800) / 1_000_000) * PRICING.geminiInputPerMillionEur;
      const outCost = ((params.tokensOutput || 1500) / 1_000_000) * PRICING.geminiOutputPerMillionEur;
      cost = inCost + outCost;
      break;
    }
    case "imagen_image": {
      cost = (params.imageCount || 1) * PRICING.imagen3PerImageEur;
      break;
    }
    case "firestore_read":
      cost = PRICING.firestoreReadEur;
      break;
    case "firestore_write":
      cost = PRICING.firestoreWriteEur;
      break;
    case "cloud_run_req":
      cost = PRICING.cloudRunPerReqEur;
      break;
  }

  return Math.round(cost * 1_000_000) / 1_000_000;
}
