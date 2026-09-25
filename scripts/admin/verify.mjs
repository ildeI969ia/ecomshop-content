import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv[2];
if (!email) {
  console.error('Uso: node scripts/admin/verify.mjs <email>');
  process.exit(1);
}

const app = initializeApp({ projectId: 'ecomshop-marketing-prod' });
const auth = getAuth(app);

async function verifyAdmin() {
  try {
    const user = await auth.getUserByEmail(email);
    console.log('Usuario encontrado. UID:', user.uid);
    
    await auth.updateUser(user.uid, {
      emailVerified: true
    });
    
    console.log('--------------------------------------------------');
    console.log(`✓ ${email} marcado como VERIFICADO`);
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    process.exit(1);
  }
}

verifyAdmin();
