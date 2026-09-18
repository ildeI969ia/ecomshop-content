import { NextRequest, NextResponse } from "next/server";
import { isEcomSpainCorporateEmail } from "@/server/security/rbac";
import { getAdminFirestore } from "@/server/config/firebase";
import { UserProfile } from "@/server/domain/types";
import { createSessionToken } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !isEcomSpainCorporateEmail(email)) {
      return NextResponse.json(
        { error: "Acceso restringido. Utilice su cuenta corporativa @ecomspain.com" },
        { status: 403 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Debe ingresar la contraseña de acceso corporativo" },
        { status: 400 }
      );
    }

    // Identificar rol corporativo asignado
    let role: "ADMIN" | "MARKETING_MANAGER" | "CONTENT_MANAGER" = "CONTENT_MANAGER";
    if (email === "carlos@ecomspain.com" || email.startsWith("admin")) {
      role = "ADMIN";
    } else if (email.startsWith("marketing") || email.startsWith("director")) {
      role = "MARKETING_MANAGER";
    }

    // Validar contraseña corporativa (Master Passcode)
    const corporatePassword = process.env.CORPORATE_ACCESS_PASSWORD || "EcomSpain2026!";
    const adminPassword = process.env.ADMIN_ACCESS_PASSWORD || "AdminEcom2026!";

    const isValidPassword =
      role === "ADMIN"
        ? password === adminPassword || password === corporatePassword
        : password === corporatePassword;

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Contraseña de acceso corporativo incorrecta", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
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

    // Generar token de sesión firmado mediante HMAC-SHA256
    const sessionToken = await createSessionToken({
      uid,
      email,
      role,
      workspaceId: "default-ecomspain"
    });

    const response = NextResponse.json({
      success: true,
      user: {
        uid,
        email,
        role,
        workspaceId: "default-ecomspain"
      }
    });

    response.cookies.set("__session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 7 días
    });

    return response;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error en el inicio de sesión";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
