import { UserRole } from "../domain/types";
import { getAdminFirestore } from "../config/firebase";

export type Permission =
  | "campaign:create"
  | "campaign:edit"
  | "campaign:delete"
  | "campaign:view"
  | "content:create"
  | "content:edit"
  | "content:approve"
  | "content:publish"
  | "content:delete"
  | "content:view"
  | "ai:execute"
  | "finops:view"
  | "finops:manage"
  | "users:manage"
  | "audit:view"
  | "admin";

export const VALID_ROLES: UserRole[] = [
  "ADMIN",
  "EDITOR",
  "CONTENT_MANAGER",
  "MARKETING_MANAGER",
  "PRODUCT_MANAGER",
  "DESIGNER",
  "SALES",
  "VIEWER"
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "campaign:create", "campaign:edit", "campaign:delete", "campaign:view",
    "content:create", "content:edit", "content:approve", "content:publish", "content:delete", "content:view",
    "ai:execute", "finops:view", "finops:manage", "users:manage", "audit:view", "admin"
  ],
  EDITOR: [
    "campaign:view",
    "content:create", "content:edit", "content:approve", "content:view",
    "ai:execute", "finops:view"
  ],
  MARKETING_MANAGER: [
    "campaign:create", "campaign:edit", "campaign:delete", "campaign:view",
    "content:create", "content:edit", "content:approve", "content:publish", "content:view",
    "ai:execute", "finops:view", "audit:view"
  ],
  CONTENT_MANAGER: [
    "campaign:view",
    "content:create", "content:edit", "content:approve", "content:view",
    "ai:execute", "finops:view"
  ],
  PRODUCT_MANAGER: [
    "campaign:view",
    "content:create", "content:edit", "content:view",
    "ai:execute"
  ],
  DESIGNER: [
    "campaign:view",
    "content:create", "content:edit", "content:view",
    "ai:execute"
  ],
  SALES: [
    "campaign:view",
    "content:view"
  ],
  VIEWER: [
    "campaign:view",
    "content:view"
  ]
};

/**
 * Lee el rol de un usuario exclusivamente desde la colección Firestore `user_roles/{uid}`.
 * Si el documento no existe o no tiene un rol válido, devuelve por defecto "VIEWER".
 */
export async function getUserRole(uid: string): Promise<UserRole> {
  if (!uid || typeof uid !== "string") {
    return "VIEWER";
  }

  try {
    const db = getAdminFirestore();
    const docRef = await db.collection("user_roles").doc(uid).get();

    if (docRef.exists) {
      const data = docRef.data();
      const role = data?.role;
      if (typeof role === "string" && VALID_ROLES.includes(role as UserRole)) {
        return role as UserRole;
      }
    }
  } catch (err) {
    console.warn(`[RBAC] No se pudo leer el rol para user_roles/${uid} desde Firestore:`, err);
  }

  return "VIEWER";
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isEcomSpainCorporateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return email.toLowerCase().endsWith("@ecomspain.com");
}

export const WHITELISTED_ROUTES = [
  "/api/health",
  "/api/health/persistence",
  "/api/auth/login"
];

export const ROUTE_PERMISSIONS: Record<string, Record<string, Permission>> = {
  "/api/advisor/scenarios": { GET: "ai:execute", POST: "ai:execute" },
  "/api/assets": { GET: "content:view", POST: "content:create", DELETE: "content:delete" },
  "/api/auth/logout": { POST: "content:view" },
  "/api/auth/me": { GET: "content:view" },
  "/api/campaigns": { GET: "campaign:view", POST: "campaign:create" },
  "/api/campaigns/[campaignId]": { GET: "campaign:view", PATCH: "campaign:edit" },
  "/api/catalog/discover": { POST: "ai:execute" },
  "/api/catalog/resolve": { POST: "ai:execute" },
  "/api/contents": { GET: "content:view", POST: "content:create", PATCH: "content:edit", DELETE: "content:delete" },
  "/api/editorial/outline": { POST: "ai:execute" },
  "/api/editorial/section-write": { POST: "ai:execute" },
  "/api/editorial/topics": { GET: "content:view", POST: "ai:execute" },
  "/api/finops": { GET: "finops:view" },
  "/api/finops/cloud-costs": { GET: "finops:view" },
  "/api/images/interview": { POST: "ai:execute" },
  "/api/images/refine-prompt": { POST: "ai:execute" },
  "/api/images/templates": { POST: "ai:execute" },
  "/api/intelligence": { POST: "ai:execute" },
  "/api/notebooklm/ask": { POST: "ai:execute" },
  "/api/notebooklm/intelligence": { GET: "content:view", POST: "ai:execute" },
  "/api/notebooklm/status": { GET: "content:view", POST: "ai:execute" },
  "/api/orchestration/runs": { GET: "finops:view", POST: "admin" },
  "/api/strategy/angles": { POST: "ai:execute" },
  "/api/sync": { POST: "admin" },
  "/api/validate-key": { POST: "admin" }
};
