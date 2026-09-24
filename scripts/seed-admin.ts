/**
 * Script de Inicialización de Seguridad RBAC (Fase 1)
 *
 * Asigna de forma limpia, determinista y documentada el rol 'ADMIN' a un UID inicial
 * en la colección de Firestore `user_roles/{uid}`.
 *
 * Directivas de Seguridad:
 * - Los roles se leen y persisten exclusivamente en Firestore `user_roles/{uid}`.
 * - Prohibida la inferencia de rol por cadenas de email o contraseñas hardcodeadas.
 *
 * Uso:
 *   npx tsx scripts/seed-admin.ts <UID_INICIAL> [EMAIL_OPCIONAL]
 *
 * Ejemplo:
 *   npx tsx scripts/seed-admin.ts initial-admin-uid carlos@ecomspain.com
 */

import { getAdminFirestore } from "../src/server/config/firebase.ts";
import { UserRole } from "../src/server/domain/types.ts";

async function seedAdminRole() {
  const targetUid = process.argv[2] || process.env.INITIAL_ADMIN_UID || "initial-admin-uid";
  const targetEmail = process.argv[3] || process.env.INITIAL_ADMIN_EMAIL || "admin@ecomspain.com";
  const assignedRole: UserRole = "ADMIN";

  console.log("==================================================");
  console.log("🔐 INICIALIZANDO ROL ADMINISTRADOR EN FIRESTORE");
  console.log("==================================================");
  console.log(`👤 Target UID   : ${targetUid}`);
  console.log(`📧 Target Email : ${targetEmail}`);
  console.log(`🛡️ Assigned Role : ${assignedRole}`);
  console.log(`📁 Firestore Path: user_roles/${targetUid}`);

  const db = getAdminFirestore();

  const userRoleData = {
    uid: targetUid,
    email: targetEmail,
    role: assignedRole,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedBy: "scripts/seed-admin.ts"
  };

  await db.collection("user_roles").doc(targetUid).set(userRoleData, { merge: true });

  // Opcional: También asegurar registro en la colección `users` para metadata de perfil
  await db.collection("users").doc(targetUid).set(
    {
      id: targetUid,
      email: targetEmail,
      displayName: targetEmail.split("@")[0].toUpperCase(),
      role: assignedRole,
      workspaceId: "default-ecomspain",
      organizationId: "org-ecomspain",
      active: true,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  console.log("✅ Rol 'ADMIN' asignado exitosamente en Firestore.");
  console.log("==================================================");
}

seedAdminRole().catch((err) => {
  console.error("❌ Error inicializando el rol ADMIN en Firestore:", err);
  process.exit(1);
});
