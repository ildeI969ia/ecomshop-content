import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest, AuthenticatedUser } from "@/server/security/auth";
import { Permission, hasPermission, isEcomSpainCorporateEmail } from "@/server/security/rbac";

export type AuthenticatedRouteHandler = (
  req: NextRequest,
  user: AuthenticatedUser
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-Order Guard para proteger endpoints API en Next.js.
 * 1. Verifica autenticacion (Bearer token o cookie __session).
 * 2. Valida dominio corporativo estricto (@ecomspain.com).
 * 3. Valida permiso RBAC requerido (o rol ADMIN).
 */
export function withAuthAndPermission(
  requiredPermission: Permission,
  handler: AuthenticatedRouteHandler
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Validar autenticacion
      const user = await authenticateServerRequest(req);
      if (!user) {
        return NextResponse.json(
          {
            error: "No autorizado. Requiere sesion corporativa @ecomspain.com",
            code: "UNAUTHENTICATED"
          },
          { status: 401 }
        );
      }

      // 2. Comprobar dominio corporativo estricto
      if (!isEcomSpainCorporateEmail(user.email)) {
        return NextResponse.json(
          {
            error: "Acceso denegado. Solo se permiten cuentas corporativas @ecomspain.com",
            code: "FORBIDDEN_DOMAIN"
          },
          { status: 403 }
        );
      }

      // 3. RBAC granular: validar permiso o rol ADMIN
      const isAllowed = user.role === "ADMIN" || hasPermission(user.role, requiredPermission);
      if (!isAllowed) {
        return NextResponse.json(
          {
            error: `Su rol (${user.role}) no tiene el permiso requerido '${requiredPermission}' para ejecutar esta accion`,
            code: "FORBIDDEN_PERMISSION"
          },
          { status: 403 }
        );
      }

      // 4. Ejecutar el handler con el usuario autenticado
      return await handler(req, user);
    } catch (error: unknown) {
      console.error("[RBAC_GUARD_ERROR]", error);
      const errorMessage = error instanceof Error ? error.message : "Error interno de seguridad";
      return NextResponse.json(
        {
          error: "Error interno al verificar permisos de seguridad",
          details: errorMessage
        },
        { status: 500 }
      );
    }
  };
}
