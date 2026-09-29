import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/server/config/firebase";
import { isEcomSpainCorporateEmail, getUserRole } from "@/server/security/rbac";

const FIREBASE_IDENTITY_TOOLKIT_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Correo y contraseña son obligatorios.", code: "MISSING_CREDENTIALS" }, { status: 400 });
    }
    if (!isEcomSpainCorporateEmail(email)) {
      return NextResponse.json({ error: "Acceso restringido. Solo se permiten cuentas @ecomspain.com.", code: "FORBIDDEN_DOMAIN" }, { status: 403 });
    }

    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      console.error("[api/auth/login] FIREBASE_API_KEY no está configurada.");
      return NextResponse.json({ error: "La autenticación de producción no está configurada.", code: "AUTH_NOT_CONFIGURED" }, { status: 503 });
    }

    const firebaseResponse = await fetch(
      `${FIREBASE_IDENTITY_TOOLKIT_URL}?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
        cache: "no-store"
      }
    );
    const firebaseData = await firebaseResponse.json().catch(() => ({}));

    if (!firebaseResponse.ok || typeof firebaseData.idToken !== "string") {
      const code = firebaseData?.error?.message;
      const message =
        code === "EMAIL_NOT_FOUND" || code === "INVALID_PASSWORD" || code === "INVALID_LOGIN_CREDENTIALS"
          ? "Credenciales incorrectas o usuario no encontrado."
          : code === "USER_DISABLED"
            ? "El usuario está deshabilitado."
            : "No se pudo validar el acceso corporativo.";
      return NextResponse.json({ error: message, code: code || "INVALID_CREDENTIALS" }, { status: 401 });
    }

    const idToken = firebaseData.idToken as string;
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (!decodedToken.email || !isEcomSpainCorporateEmail(decodedToken.email) || decodedToken.email_verified !== true) {
      return NextResponse.json(
        { error: "La cuenta debe ser corporativa @ecomspain.com y tener el correo verificado.", code: "FORBIDDEN_ACCOUNT" },
        { status: 403 }
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: 60 * 60 * 24 * 7 * 1000 });
    const role = await getUserRole(decodedToken.uid);

    const response = NextResponse.json({
      success: true,
      user: { uid: decodedToken.uid, email: decodedToken.email, role, workspaceId: "default-ecomspain" }
    });
    response.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return response;
  } catch (error: unknown) {
    console.error("[api/auth/login] Error:", error);
    return NextResponse.json({ error: "Error interno al iniciar sesión.", code: "LOGIN_FAILED" }, { status: 500 });
  }
}
