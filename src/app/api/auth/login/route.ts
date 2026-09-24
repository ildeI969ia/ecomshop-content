import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/server/config/firebase";
import { isEcomSpainCorporateEmail, getUserRole } from "@/server/security/rbac";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idToken = typeof body.idToken === "string" ? body.idToken : typeof body.token === "string" ? body.token : "";

    if (!idToken) {
      return NextResponse.json(
        { error: "Se requiere ID Token de Firebase emitido por Google OAuth", code: "MISSING_ID_TOKEN" },
        { status: 400 }
      );
    }

    // 1. Validar ID Token usando Firebase Admin SDK
    const adminAuth = getAdminAuth();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ID Token inválido o expirado";
      return NextResponse.json(
        { error: `ID Token no válido: ${msg}`, code: "INVALID_TOKEN" },
        { status: 401 }
      );
    }

    const { uid, email, email_verified } = decodedToken;

    // 2. Verificar email corporativo @ecomspain.com y email_verified === true
    if (!email || !isEcomSpainCorporateEmail(email) || email_verified !== true) {
      return NextResponse.json(
        {
          error: "Acceso restringido. Solo se permiten cuentas corporativas @ecomspain.com con email verificado.",
          code: "FORBIDDEN_DOMAIN"
        },
        { status: 403 }
      );
    }

    // 3. Crear cookie de sesión oficial mediante Firebase Admin SDK
    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 días en milisegundos
    let sessionCookie: string;
    try {
      sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    } catch (err: unknown) {
      console.error("[api/auth/login] Error al crear la cookie de sesión:", err);
      return NextResponse.json(
        { error: "Error al generar la sesión de usuario corporativo", code: "SESSION_CREATION_FAILED" },
        { status: 500 }
      );
    }

    // 4. Leer rol desde la colección Firestore user_roles/{uid}
    const role = await getUserRole(uid);

    const response = NextResponse.json({
      success: true,
      user: {
        uid,
        email,
        role,
        workspaceId: "default-ecomspain"
      }
    });

    response.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 7 días en segundos
    });

    return response;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error en el inicio de sesión";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
