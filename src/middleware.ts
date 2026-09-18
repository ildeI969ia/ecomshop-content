import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Excluir rutas públicas o assets estáticos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".") ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get("__session")?.value;
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : sessionCookie;

  const session = token ? await verifySessionToken(token) : null;

  // 2. Proteger endpoints de API
  if (pathname.startsWith("/api/")) {
    // Permitir /api/auth/me responder { authenticated: false } si no hay sesión
    if (pathname === "/api/auth/me") {
      return NextResponse.next();
    }

    if (!session) {
      return NextResponse.json(
        {
          error: "Acceso denegado. Se requiere autenticación corporativa con contraseña.",
          code: "UNAUTHENTICATED"
        },
        { status: 401 }
      );
    }
  }

  const response = NextResponse.next();
  if (session) {
    response.headers.set("x-user-email", session.email);
    response.headers.set("x-user-role", session.role);
  } else {
    response.headers.set("x-authenticated", "false");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
