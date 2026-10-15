import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import defaultFirebaseConfig from '../firebase-applet-config.json';

export interface FirebaseProjectConfigShape {
  projectId: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

// Clean up any legacy API keys previously saved in localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('cinecore_firebase_config');
  } catch {}
}

// Read credentials safely from environment with fallback to applet config
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as Record<string, string | undefined>);

const resolvedConfig: FirebaseProjectConfigShape = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId || 'cinecore-a2ceb',
  appId: env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || (defaultFirebaseConfig as any).firestoreDatabaseId || '(default)',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
};

// Initialize Firebase App
let app: any;
try {
  app = getApps().length === 0 ? initializeApp(resolvedConfig) : getApp();
} catch (initErr) {
  console.warn('Firebase App initialization note:', initErr);
  app = getApps().length > 0 ? getApp() : initializeApp(defaultFirebaseConfig);
}

// Initialize Firestore per SKILL.md
let firestoreInstance: any;
try {
  firestoreInstance = getFirestore(app, resolvedConfig.firestoreDatabaseId || '(default)');
} catch (fsErr) {
  console.warn('Firestore initialization fallback:', fsErr);
  try {
    firestoreInstance = getFirestore(app);
  } catch {
    firestoreInstance = {} as any;
  }
}

// Validate Firestore connectivity on startup per SKILL.md
if (typeof window !== 'undefined' && firestoreInstance) {
  try {
    getDocFromServer(doc(firestoreInstance, 'test', 'connection')).catch((error) => {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('Firestore offline notice: please verify network or Firebase project configuration.');
      }
    });
  } catch {}
}

export const db = firestoreInstance;

let authInstance: any;
try {
  authInstance = getAuth(app);
} catch (authErr) {
  console.warn('Firebase Auth fallback notice:', authErr);
  authInstance = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
  } as any;
}

export const auth = authInstance;

/**
 * Recursively strips undefined keys and nested undefined values from an object
 * to prevent Firestore "Function setDoc() called with invalid data. Unsupported field value: undefined" errors.
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) {
      continue;
    }
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = cleanForFirestore(val);
    } else if (Array.isArray(val)) {
      result[key] = val
        .filter((item) => item !== undefined)
        .map((item) => (item !== null && typeof item === 'object' ? cleanForFirestore(item) : item));
    } else {
      result[key] = val;
    }
  }
  return result;
}

// Designated Admin constants provided by dealership
export const ADMIN_CONFIG = {
  primaryUid: 'zu4znCRWYfZ0DauQEJw6DRg0LH62',
  allowedEmails: [
    'carsnganga@gmail.com'
  ],
  adminRoute: '/ngashkrd2012',
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

/**
 * Safely sanitizes error messages so no API keys, tokens, or credential strings are printed to logs
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg) return '';
  return msg
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/(?:apiKey|key)=[^&\s]+/gi, 'key=[REDACTED]');
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: sanitizeErrorMessage(rawMsg),
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
    },
  };
  console.warn('Firestore Notice:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
