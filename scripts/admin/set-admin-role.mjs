import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const email = process.argv[2];
if (!email) {
  console.error('Uso: node scripts/admin/set-admin-role.mjs <email> [ROLE]');
  process.exit(1);
}
const role = process.argv[3] || 'ADMIN';

const app = initializeApp({ projectId: 'ecomshop-marketing-prod' });
const auth = getAuth(app);
const db = getFirestore(app);

async function elevateToAdmin() {
  try {
    const user = await auth.getUserByEmail(email);
    console.log('Usuario Auth encontrado:', user.email, 'con UID:', user.uid);

    // 1. Asignar en user_roles
    await db.collection('user_roles').doc(user.uid).set({
      role: role,
      email: user.email,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Asignar en users
    await db.collection('users').doc(user.uid).set({
      role: role,
      email: user.email,
      active: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`✓ Rol ${role} asignado correctamente en user_roles y users para ${email} (UID: ${user.uid})`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

elevateToAdmin();
