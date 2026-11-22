import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuthInstance, getFirestoreInstance } from './firebaseConfig';

export async function signInAdmin(email: string, password: string): Promise<void> {
  const auth = getFirebaseAuthInstance();
  const db = getFirestoreInstance();
  if (!auth || !db) {
    throw new Error('Tài khoản quản trị cần được cấu hình Firebase trước khi sử dụng.');
  }

  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  try {
    const adminRecord = await getDoc(doc(db, 'admins', credential.user.uid));
    if (!adminRecord.exists() || adminRecord.data().role !== 'admin') {
      throw new Error('Tài khoản Firebase này chưa được cấp quyền quản trị.');
    }
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}
