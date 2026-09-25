import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({ projectId: 'ecomshop-marketing-prod' });
const auth = getAuth(app);
const db = getFirestore(app);

async function elevateToAdmin() {
  try {
    const user = await auth.getUserByEmail('admin@ecomspain.com');
    console.log('Usuario Auth encontrado:', user.email, 'con UID:', user.uid);

    // 1. Asignar en user_roles
    await db.collection('user_roles').doc(user.uid).set({
      role: 'ADMIN',
      email: user.email,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Asignar en users
    await db.collection('users').doc(user.uid).set({
      role: 'ADMIN',
      email: user.email,
      active: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('? Rol ADMIN asignado correctamente en user_roles y users para el UID:', user.uid);
  } catch (error) {
    console.error('Error:', error);
  }
}

elevateToAdmin();
