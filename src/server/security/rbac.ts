import { UserRole } from "../domain/types";

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

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "campaign:create", "campaign:edit", "campaign:delete", "campaign:view",
    "content:create", "content:edit", "content:approve", "content:publish", "content:delete", "content:view",
    "ai:execute", "finops:view", "finops:manage", "users:manage", "audit:view"
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

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isEcomSpainCorporateEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@ecomspain.com");
}
