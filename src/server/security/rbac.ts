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
  | "audit:view";

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
    "ai:execute", "finops:view", "finops:manage", "users:manage", "audit:view"
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
