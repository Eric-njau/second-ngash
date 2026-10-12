import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
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

// Load active Firebase configuration (prioritizes cinecore-a2ceb when configured)
export function getStoredCinecoreConfig(): FirebaseProjectConfigShape | null {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('cinecore_firebase_config');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.apiKey && (parsed.projectId === 'cinecore-a2ceb' || parsed.projectId)) {
          return parsed;
        }
      } catch (e) {}
    }
  }
  return null;
}

export const activeConfig: FirebaseProjectConfigShape = defaultFirebaseConfig;

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();

// Initialize Firestore with database ID specified in config (defaults to standard Firestore instance)
// Enabled ignoreUndefinedProperties: true to prevent "Unsupported field value: undefined" errors
const firestoreDatabaseId =
  (activeConfig as any).firestoreDatabaseId &&
  (activeConfig as any).firestoreDatabaseId !== '(default)'
    ? (activeConfig as any).firestoreDatabaseId
    : undefined;

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true
  }, firestoreDatabaseId);
} catch (e) {
  firestoreInstance = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
}

export const db = firestoreInstance;

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

export const auth = getAuth(app);

// Save cinecore-a2ceb configuration
export function saveCinecoreConfig(config: FirebaseProjectConfigShape) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cinecore_firebase_config', JSON.stringify(config));
    window.location.reload();
  }
}

// Reset to default provisioned configuration
export function resetToDefaultConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cinecore_firebase_config');
    window.location.reload();
  }
}

// Smart parser for Firebase configuration inputs (supports raw API key or full code snippet)
export function parseFirebaseConfigInput(input: string): FirebaseProjectConfigShape | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Raw API key (e.g. AIzaSy...)
  if (/^AIzaSy[a-zA-Z0-9_\-]{30,}/.test(trimmed)) {
    return {
      projectId: 'cinecore-a2ceb',
      apiKey: trimmed,
      authDomain: 'cinecore-a2ceb.firebaseapp.com',
      storageBucket: 'cinecore-a2ceb.firebasestorage.app',
      appId: ''
    };
  }

  // 2. JavaScript / JSON config snippet
  const apiKeyMatch = trimmed.match(/apiKey\s*[:=]\s*["']([^"']+)["']/);
  const projectIdMatch = trimmed.match(/projectId\s*[:=]\s*["']([^"']+)["']/);
  const appIdMatch = trimmed.match(/appId\s*[:=]\s*["']([^"']+)["']/);
  const authDomainMatch = trimmed.match(/authDomain\s*[:=]\s*["']([^"']+)["']/);
  const storageBucketMatch = trimmed.match(/storageBucket\s*[:=]\s*["']([^"']+)["']/);
  const messagingSenderIdMatch = trimmed.match(/messagingSenderId\s*[:=]\s*["']([^"']+)["']/);

  if (apiKeyMatch && apiKeyMatch[1]) {
    return {
      projectId: (projectIdMatch && projectIdMatch[1]) || 'cinecore-a2ceb',
      apiKey: apiKeyMatch[1],
      appId: (appIdMatch && appIdMatch[1]) || '',
      authDomain: (authDomainMatch && authDomainMatch[1]) || 'cinecore-a2ceb.firebaseapp.com',
      storageBucket: (storageBucketMatch && storageBucketMatch[1]) || 'cinecore-a2ceb.firebasestorage.app',
      messagingSenderId: (messagingSenderIdMatch && messagingSenderIdMatch[1]) || ''
    };
  }

  // 3. Raw JSON object
  try {
    const json = JSON.parse(trimmed);
    if (json.apiKey) {
      return {
        projectId: json.projectId || 'cinecore-a2ceb',
        apiKey: json.apiKey,
        appId: json.appId || '',
        authDomain: json.authDomain || 'cinecore-a2ceb.firebaseapp.com',
        storageBucket: json.storageBucket || 'cinecore-a2ceb.firebasestorage.app',
        messagingSenderId: json.messagingSenderId || ''
      };
    }
  } catch (e) {}

  return null;
}

// Designated Admin constants provided by dealership
export const ADMIN_CONFIG = {
  primaryUid: 'zu4znCRWYfZ0DauQEJw6DRg0LH62',
  allowedEmails: [
    'carsnganga@gmail.com',
    'kamaualex063@gmail.com',
    'ericw9836@gmail.com'
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
  };
  console.warn('Firestore Notice:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
