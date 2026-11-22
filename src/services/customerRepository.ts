import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseAuthInstance, getFirestoreInstance } from './firebaseConfig';

export interface CustomerProfile {
  uid: string;
  fullName: string;
  phone: string;
  address: string;
  email: string;
}

export interface CustomerRegistration extends Omit<CustomerProfile, 'uid'> {
  password: string;
}

class CustomerProfileMissingError extends Error {}

function requireFirebaseServices() {
  const auth = getFirebaseAuthInstance();
  const db = getFirestoreInstance();
  if (!auth || !db) {
    throw new Error('Tài khoản khách hàng cần được cấu hình Firebase trước khi sử dụng.');
  }
  return { auth, db };
}

async function loadCustomerProfile(user: User): Promise<CustomerProfile> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Không thể kết nối Firestore để tải hồ sơ khách hàng.');
  }

  const profileSnapshot = await getDoc(doc(db, 'customers', user.uid));
  if (!profileSnapshot.exists()) {
    throw new CustomerProfileMissingError(
      'Tài khoản đăng nhập chưa có hồ sơ Firestore. Nếu đăng ký trước đó bị lỗi quyền, hãy chọn đăng ký lại bằng đúng email và mật khẩu cũ sau khi cập nhật Firestore Rules.'
    );
  }

  return { uid: user.uid, ...profileSnapshot.data() } as CustomerProfile;
}

export async function registerCustomer(
  registration: CustomerRegistration
): Promise<CustomerProfile> {
  const { auth, db } = requireFirebaseServices();
  const email = registration.email.trim();
  let user = auth.currentUser;

  if (!user || user.email?.toLowerCase() !== email.toLowerCase()) {
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        registration.password
      );
      user = credential.user;
    } catch (error) {
      if (
        !(error instanceof FirebaseError) ||
        error.code !== 'auth/email-already-in-use'
      ) {
        throw error;
      }

      user = (
        await signInWithEmailAndPassword(auth, email, registration.password)
      ).user;
    }
  }

  const profile: CustomerProfile = {
    uid: user.uid,
    fullName: registration.fullName.trim(),
    phone: registration.phone.trim(),
    address: registration.address.trim(),
    email,
  };
  await setDoc(doc(db, 'customers', profile.uid), profile);
  return profile;
}

export async function signInCustomer(
  email: string,
  password: string
): Promise<CustomerProfile> {
  const { auth } = requireFirebaseServices();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return loadCustomerProfile(credential.user);
}

export async function signOutCustomer(): Promise<void> {
  const auth = getFirebaseAuthInstance();
  if (auth) await signOut(auth);
}

export function observeCustomerSession(
  onProfile: (profile: CustomerProfile | null) => void,
  onError: (error: Error) => void
): () => void {
  const auth = getFirebaseAuthInstance();
  if (!auth) return () => {};

  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      onProfile(null);
      return;
    }
    void loadCustomerProfile(user)
      .then(onProfile)
      .catch((error: unknown) => {
        if (error instanceof CustomerProfileMissingError) {
          onProfile(null);
          return;
        }
        onError(error instanceof Error ? error : new Error(String(error)));
      });
  }, onError);
}
