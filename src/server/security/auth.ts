import { NextRequest } from "next/server";
import { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "../config/firebase";
import { UserProfile, UserRole } from "../domain/types";
import { Permission, hasPermission, isEcomSpainCorporateEmail, getUserRole } from "./rbac";

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
    if (process.env.NODE_ENV !== "production") {
      return {
        uid: "dev-local-user",
        email: "admin@ecomspain.com",
        role: "ADMIN",
        workspaceId: "ws-ecomspain"
      };
    }
    return null;
  }

  // 2. Verificar Firebase Session Cookie o Firebase ID Token
  try {
    const adminAuth = getAdminAuth();
    let decodedToken: DecodedIdToken | null = null;

    try {
      decodedToken = await adminAuth.verifySessionCookie(token, true);
    } catch {
      try {
        decodedToken = await adminAuth.verifyIdToken(token);
      } catch {
        return null;
      }
    }

    if (!decodedToken || !decodedToken.email) {
      return null;
    }

    // 3. Verificación estricta de Google Workspace (@ecomspain.com y email_verified === true)
    if (!isEcomSpainCorporateEmail(decodedToken.email) || decodedToken.email_verified !== true) {
      console.warn(`[AUTH] Intento de acceso denegado para email no corporativo o no verificado: ${decodedToken.email}`);
      return null;
    }

    // 4. Leer rol exclusivamente desde la colección Firestore user_roles/{uid}
    const role: UserRole = await getUserRole(decodedToken.uid);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
      workspaceId: "default-ecomspain"
    };
  } catch (err) {
    console.error("[AUTH] Fallo en la verificación de autenticación:", err);
    return null;
  }
}

export function authorizePermission(user: AuthenticatedUser | null, permission: Permission): boolean {
  if (!user) return false;
  return hasPermission(user.role, permission);
}
