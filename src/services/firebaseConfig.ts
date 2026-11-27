import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Analytics,
  getAnalytics,
  isSupported as isAnalyticsSupported,
} from 'firebase/analytics';
import {
  Auth,
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import {
  Firestore,
  connectFirestoreEmulator,
  getFirestore,
} from 'firebase/firestore';
import {
  Functions,
  connectFunctionsEmulator,
  getFunctions,
} from 'firebase/functions';

export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

const DEFAULT_FIREBASE_CONFIG: FirebaseEnvConfig = {
  apiKey: 'AIzaSyDJPcMSEa-P-TbGW3_jHSrSKIEKUDU_Lyg',
  authDomain: 'vsi2026.firebaseapp.com',
  projectId: 'vsi2026',
  storageBucket: 'vsi2026.firebasestorage.app',
  messagingSenderId: '426166123608',
  appId: '1:426166123608:web:1268e990f45b311bd95e2d',
  measurementId: 'G-KNKXW57XV5',
};

export function getFirebaseEnvConfig(): FirebaseEnvConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain:
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
      DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId:
      import.meta.env.VITE_FIREBASE_PROJECT_ID ||
      DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
      DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
      DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
    measurementId:
      import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
      DEFAULT_FIREBASE_CONFIG.measurementId,
  };
}

export function isFirebaseConfigured(): boolean {
  const cfg = getFirebaseEnvConfig();
  return Boolean(cfg.apiKey.trim() && cfg.projectId.trim() && cfg.appId.trim());
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let cachedAnalytics: Analytics | null = null;
let cachedFunctions: Functions | null = null;

function shouldUseFirebaseEmulators(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
}

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;

  try {
    if (!cachedApp) {
      cachedApp = getApps().length > 0 ? getApps()[0] : initializeApp(getFirebaseEnvConfig());
    }
    return cachedApp;
  } catch {
    return null;
  }
}

export function getFirestoreInstance(): Firestore | null {
  try {
    const app = getFirebaseApp();
    if (!app) return null;
    if (!cachedDb) {
      cachedDb = getFirestore(app);
      if (shouldUseFirebaseEmulators()) {
        connectFirestoreEmulator(cachedDb, '127.0.0.1', 8080);
      }
    }
    return cachedDb;
  } catch {
    return null;
  }
}

export function getFirebaseAuthInstance(): Auth | null {
  try {
    const app = getFirebaseApp();
    if (!app) return null;
    if (!cachedAuth) {
      cachedAuth = getAuth(app);
      void setPersistence(cachedAuth, browserLocalPersistence).catch((error) => {
        console.warn('Không thể bật duy trì phiên đăng nhập Firebase.', error);
      });
      if (shouldUseFirebaseEmulators()) {
        connectAuthEmulator(cachedAuth, 'http://127.0.0.1:9099', {
          disableWarnings: true,
        });
      }
    }
    return cachedAuth;
  } catch {
    return null;
  }
}

export function getFirebaseFunctionsInstance(): Functions | null {
  try {
    const app = getFirebaseApp();
    if (!app) return null;
    if (!cachedFunctions) {
      cachedFunctions = getFunctions(app, 'asia-southeast1');
      if (shouldUseFirebaseEmulators()) {
        connectFunctionsEmulator(cachedFunctions, '127.0.0.1', 5001);
      }
    }
    return cachedFunctions;
  } catch {
    return null;
  }
}

export async function initializeFirebaseAnalytics(): Promise<Analytics | null> {
  const app = getFirebaseApp();
  if (!app || !(await isAnalyticsSupported())) return null;
  if (!cachedAnalytics) cachedAnalytics = getAnalytics(app);
  return cachedAnalytics;
}
