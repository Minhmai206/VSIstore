import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuthInstance, getFirestoreInstance } from './firebaseConfig';

export type AdminAuthorization = 'authorized' | 'unauthorized';

async function hasAdminRole(uid: string): Promise<boolean> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Tài khoản quản trị cần được cấu hình Firebase trước khi sử dụng.');
  }
  const adminRecord = await getDoc(doc(db, 'admins', uid));
  return adminRecord.exists() && adminRecord.data().role === 'admin';
}

export function observeAdminAuthorization(
  onAuthorization: (authorization: AdminAuthorization) => void,
  onError: (error: Error) => void
): () => void {
  const auth = getFirebaseAuthInstance();
  if (!auth || !getFirestoreInstance()) {
    onError(new Error('Tài khoản quản trị cần được cấu hình Firebase trước khi sử dụng.'));
    return () => {};
  }

  let active = true;
  let authRevision = 0;
  const unsubscribe = onAuthStateChanged(
    auth,
    (user) => {
      const currentRevision = ++authRevision;
      if (!user) {
        onAuthorization('unauthorized');
        return;
      }

      void hasAdminRole(user.uid)
        .then((isAdmin) => {
          if (active && currentRevision === authRevision) {
            onAuthorization(isAdmin ? 'authorized' : 'unauthorized');
          }
        })
        .catch((error: unknown) => {
          if (active && currentRevision === authRevision) {
            onError(
              error instanceof Error ? error : new Error(String(error))
            );
          }
        });
    },
    (error) => {
      if (active) onError(error);
    }
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

export async function signInAdmin(email: string, password: string): Promise<void> {
  const auth = getFirebaseAuthInstance();
  const db = getFirestoreInstance();
  if (!auth || !db) {
    throw new Error('Tài khoản quản trị cần được cấu hình Firebase trước khi sử dụng.');
  }

  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  try {
    const isAdmin = await hasAdminRole(credential.user.uid);
    if (!isAdmin) {
      throw new Error('Tài khoản Firebase này chưa được cấp quyền quản trị.');
    }
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}
