/**
 * Script de Inicialización de Seguridad RBAC (Fase 1b)
 *
 * Asigna de forma limpia, determinista y documentada el rol 'ADMIN' a un UID inicial
 * en la colección de Firestore `user_roles/{uid}`.
 *
 * Instrucciones de Uso:
 * 1. Tras realizar el primer inicio de sesión con Google Workspace (@ecomspain.com) en la aplicación,
 *    obtén el UID de Firebase Authentication asignado al usuario.
 * 2. Ejecuta este script pasando el UID y el email como parámetros o mediante variables de entorno:
 *
 * Uso por argumentos CLI:
 *   npx tsx scripts/seed-admin.ts <UID> <EMAIL>
 *   Ejemplo: npx tsx scripts/seed-admin.ts 8x9kL2mN4pQ6rS8tU0vW usuario@ecomspain.com
 *
 * Uso por variables de entorno:
 *   INITIAL_ADMIN_UID="8x9kL2mN4pQ6rS8tU0vW" INITIAL_ADMIN_EMAIL="usuario@ecomspain.com" npx tsx scripts/seed-admin.ts
 *
 * Directivas de Seguridad:
 * - Los roles se leen y persisten exclusivamente en Firestore `user_roles/{uid}`.
 * - Prohibida la inferencia de rol por cadenas de email o contraseñas hardcodeadas.
 */

import { getAdminFirestore } from "../src/server/config/firebase.ts";
import { UserRole } from "../src/server/domain/types.ts";

async function seedAdminRole() {
  const targetUid = process.argv[2] || process.env.INITIAL_ADMIN_UID;
  const targetEmail = process.argv[3] || process.env.INITIAL_ADMIN_EMAIL;

  if (!targetUid || !targetEmail) {
    console.error("❌ Error: Debe proporcionar el UID y EMAIL del usuario admin.");
    console.error("");
    console.error("Uso:");
    console.error("  npx tsx scripts/seed-admin.ts <UID> <EMAIL>");
    console.error("O mediante variables de entorno:");
    console.error("  INITIAL_ADMIN_UID=<UID> INITIAL_ADMIN_EMAIL=<EMAIL> npx tsx scripts/seed-admin.ts");
    console.error("");
    console.error("💡 Nota: Obtén el UID de Firebase Authentication tras el primer login con Google Workspace (@ecomspain.com).");
    process.exit(1);
  }

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

  // Registro en la colección `users` para metadata de perfil
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
