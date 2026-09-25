import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const app = initializeApp({ projectId: 'ecomshop-marketing-prod' });
const auth = getAuth(app);

async function verifyAdmin() {
  try {
    const user = await auth.getUserByEmail('admin@ecomspain.com');
    console.log('Usuario encontrado. UID:', user.uid);
    
    await auth.updateUser(user.uid, {
      emailVerified: true
    });
    
    console.log('--------------------------------------------------');
    console.log('? admin@ecomspain.com marcado como VERIFICADO');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
  }
}

verifyAdmin();
