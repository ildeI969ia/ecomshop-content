Set-Content -Path scripts/verify-admin.ts -Value @"
import { auth } from '../src/lib/firebaseAdmin';

async function main() {
  const email = 'admin@ecomspain.com';
  try {
    const user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { emailVerified: true });
    console.log('--------------------------------------------------');
    console.log(' Correo marcado como VERIFICADO exitosamente');
    console.log(' Email :', user.email);
    console.log(' UID   :', user.uid);
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error(' Error al verificar usuario:', error);
  }
}

main();
"@