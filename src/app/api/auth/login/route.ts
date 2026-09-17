import { NextRequest, NextResponse } from "next/server";
import { isEcomSpainCorporateEmail } from "@/server/security/rbac";
import { getAdminFirestore } from "@/server/config/firebase";
import { UserProfile } from "@/server/domain/types";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !isEcomSpainCorporateEmail(email)) {
      return NextResponse.json(
        { error: "Acceso restringido. Utilice su cuenta corporativa @ecomspain.com" },
        { status: 403 }
      );
    }

    // Identificar rol corporativo asignado
    let role: "ADMIN" | "MARKETING_MANAGER" | "CONTENT_MANAGER" = "CONTENT_MANAGER";
    if (email === "carlos@ecomspain.com" || email.startsWith("admin")) {
      role = "ADMIN";
    } else if (email.startsWith("marketing") || email.startsWith("director")) {
      role = "MARKETING_MANAGER";
    }

    const uid = `user-${Buffer.from(email).toString("hex").substring(0, 12)}`;

    // Guardar o actualizar en Firestore si la conexión está disponible
    try {
      const db = getAdminFirestore();
      const userRef = db.collection("users").doc(uid);
      const profile: UserProfile = {
        id: uid,
        email,
        displayName: email.split("@")[0].toUpperCase(),
        role,
        workspaceId: "default-ecomspain",
        organizationId: "org-ecomspain",
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      await userRef.set(profile, { merge: true });
    } catch (dbErr) {
      console.warn("Firestore not available for login persistence, continuing with session cookie:", dbErr);
    }

    // Generar cookie de sesión HTTP-only simulada (en prod con Firebase Auth se usa createSessionCookie)
    const response = NextResponse.json({
      success: true,
      user: {
        uid,
        email,
        role,
        workspaceId: "default-ecomspain"
      }
    });

    response.cookies.set("__session", `demo-token-${uid}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 7 días
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error en el inicio de sesión" }, { status: 500 });
  }
}
