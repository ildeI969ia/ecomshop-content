import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Excluir rutas de recursos estáticos legítimos y autenticación pública
  const isStaticFile = /\.(ico|png|jpg|jpeg|svg|css|js|txt|woff|woff2|webp)$/i.test(pathname);
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    (isStaticFile && !pathname.startsWith("/api/")) ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get("__session")?.value;

  // 2. Proteger endpoints de API
  if (pathname.startsWith("/api/")) {
    // Permitir /api/auth/me responder si no hay sesión (la ruta me valida internamente)
    if (pathname === "/api/auth/me") {
      return NextResponse.next();
    }

    if (!sessionCookie) {
      return NextResponse.json(
        {
          error: "Acceso denegado. Se requiere autenticación corporativa con Google Workspace.",
          code: "UNAUTHENTICATED"
        },
        { status: 401 }
      );
    }
  } else {
    // 3. Rutas de páginas web protegidas: si no existe cookie __session, redirigir a login /
    if (!sessionCookie && pathname !== "/") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
