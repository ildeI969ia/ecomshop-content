import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App;
let db: Firestore | null = null;
let auth: Auth | null = null;

export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // 1. Si existe Service Account en Base64 o JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY.startsWith("{")
          ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY
          : Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf-8")
      );
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ecomshop-marketing-prod"
      });
    } catch (e) {
      console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, attempting ADC:", e);
    }
  }

  // 2. Google Application Default Credentials (Cloud Run nativo)
  return initializeApp({
    projectId: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "ecomshop-marketing-prod"
  });
}

export function getAdminFirestore(): Firestore {
  if (!db) {
    const adminApp = getFirebaseAdminApp();
    db = getFirestore(adminApp);
  }
  return db;
}

export function getAdminAuth(): Auth {
  if (!auth) {
    const adminApp = getFirebaseAdminApp();
    auth = getAuth(adminApp);
  }
  return auth;
}
