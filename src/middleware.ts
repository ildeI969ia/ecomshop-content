import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  // 1. Excluir rutas de recursos estáticos legítimos y autenticación pública
  const isStaticFile = /\.(ico|png|jpg|jpeg|svg|css|js|txt|woff|woff2|webp)$/i.test(pathname);
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    (isStaticFile && !pathname.startsWith("/api/")) ||
    // Liveness/readiness público para Cloud Run y monitorización.
    // Sólo devuelve estado del proceso + metadatos de build: ninguna dependencia
    // ni dato de negocio (el diagnóstico profundo sigue en /api/health/persistence).
    pathname === "/health" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout"
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const sessionCookie = req.cookies.get("__session")?.value;

  // 2. Proteger endpoints de API
  if (pathname.startsWith("/api/")) {
    // Permitir /api/auth/me responder si no hay sesión (la ruta me valida internamente)
    if (pathname === "/api/auth/me") {
      return NextResponse.next();
    }

    if (!sessionCookie) {
      const response = NextResponse.json(
        {
          error: "Acceso denegado. Se requiere autenticación corporativa con Google Workspace.",
          code: "UNAUTHENTICATED",
          requestId
        },
        { status: 401 }
      );
      response.headers.set("x-request-id", requestId);
      return response;
    }
  } else {
    // 3. Rutas de páginas web protegidas: si no existe cookie __session, redirigir a login /
    if (!sessionCookie && pathname !== "/") {
      const response = NextResponse.redirect(new URL("/", req.url));
      response.headers.set("x-request-id", requestId);
      return response;
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
