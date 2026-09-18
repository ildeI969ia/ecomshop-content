import { NextRequest } from "next/server";
import { getAdminAuth, getAdminFirestore } from "../config/firebase";
import { UserProfile, UserRole } from "../domain/types";
import { Permission, hasPermission, isEcomSpainCorporateEmail } from "./rbac";
import { verifySessionToken } from "@/lib/auth/session";

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: UserRole;
  workspaceId: string;
  profile?: UserProfile;
}

export async function authenticateServerRequest(req: NextRequest): Promise<AuthenticatedUser | null> {
  // 1. Obtener token de cabecera Authorization o cookie __session
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    const sessionCookie = req.cookies.get("__session")?.value;
    if (sessionCookie) token = sessionCookie;
  }

  if (!token) {
    return null;
  }

  // 2. Verificar token de sesión firmado criptográficamente
  const sessionData = await verifySessionToken(token);
  if (sessionData && isEcomSpainCorporateEmail(sessionData.email)) {
    return {
      uid: sessionData.uid,
      email: sessionData.email,
      role: (sessionData.role as UserRole) || "CONTENT_MANAGER",
      workspaceId: sessionData.workspaceId || "default-ecomspain"
    };
  }

  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken.email || !isEcomSpainCorporateEmail(decodedToken.email)) {
      console.warn(`Unauthorized login attempt from non-corporate email: ${decodedToken.email}`);
      return null;
    }

    // Consultar rol en Firestore
    const db = getAdminFirestore();
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();

    let role: UserRole = "VIEWER";
    let workspaceId = "default-ecomspain";

    if (userDoc.exists) {
      const data = userDoc.data() as UserProfile;
      role = data.role || "VIEWER";
      workspaceId = data.workspaceId || "default-ecomspain";
    } else {
      // Auto-registro inicial del usuario corporativo con rol VIEWER por defecto
      const newUser: UserProfile = {
        id: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email.split("@")[0],
        avatarUrl: decodedToken.picture,
        role: decodedToken.email === "carlos@ecomspain.com" || decodedToken.email.startsWith("admin") ? "ADMIN" : "CONTENT_MANAGER",
        workspaceId: "default-ecomspain",
        organizationId: "org-ecomspain",
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.collection("users").doc(decodedToken.uid).set(newUser);
      role = newUser.role;
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
      workspaceId
    };
  } catch (err) {
    console.error("Token verification failed:", err);
    return null;
  }
}

export function authorizePermission(user: AuthenticatedUser | null, permission: Permission): boolean {
  if (!user) return false;
  return hasPermission(user.role, permission);
}
