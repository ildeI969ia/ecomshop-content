import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  // 1. Excluir rutas de recursos estáticos legítimos
  const isStaticFile = /\.(ico|png|jpg|jpeg|svg|css|js|txt|woff|woff2|webp|xml)$/i.test(pathname);
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    (isStaticFile && !pathname.startsWith("/api/")) ||
    pathname === "/health" ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 2. Rutas públicas del Blog (indexables por Googlebot y accesibles sin login)
  const isPublicPage = pathname === "/" || pathname.startsWith("/blog");
  const isPublicApi = pathname === "/api/auth/login" || pathname === "/api/auth/logout" || pathname === "/api/auth/me" || pathname.startsWith("/api/public/");

  if (isPublicPage || isPublicApi) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const sessionCookie = req.cookies.get("__session")?.value;

  // 3. Proteger endpoints privados de API (/api/** excepto públicas)
  if (pathname.startsWith("/api/")) {
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
    // 4. Proteger panel privado (/admin/**): si no existe cookie __session, redirigir a login o a la home
    if (!sessionCookie && pathname.startsWith("/admin")) {
      const response = NextResponse.redirect(new URL("/admin?login=required", req.url));
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
