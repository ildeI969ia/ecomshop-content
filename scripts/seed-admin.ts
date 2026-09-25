import { auth, db } from '../src/server/config/firebase';

async function main() {
  const email = process.argv[3] || 'admin@ecomspain.com';
  console.log('==================================================');
  console.log('?? CONFIGURANDO ADMIN Y VERIFICACIÓN EN FIREBASE');
  console.log('==================================================');
  
  try {
    const user = await auth.getUserByEmail(email);
    console.log('?? Firebase Auth UID :', user.uid);
    console.log('?? Target Email       :', user.email);

    // 1. Marcar el correo como verificado en Firebase Authentication
    await auth.updateUser(user.uid, { emailVerified: true });
    console.log('? Email marcado como VERIFICADO en Firebase Auth.');

    // 2. Asignar rol ADMIN en Firestore user_roles
    await db.collection('user_roles').doc(user.uid).set({
      role: 'ADMIN',
      email: user.email,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('??? Rol ADMIN asignado en Firestore (user_roles/' + user.uid + ').');

    // 3. Asignar rol ADMIN en Firestore users
    await db.collection('users').doc(user.uid).set({
      role: 'ADMIN',
      email: user.email,
      active: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('?? Perfil actualizado en Firestore (users/' + user.uid + ').');

  } catch (error) {
    console.error('? Error configurando usuario:', error);
  }
  console.log('==================================================');
}

main();
