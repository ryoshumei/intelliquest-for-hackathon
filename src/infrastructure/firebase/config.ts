import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';

/**
 * Firebase Configuration
 * Initializes Firebase services for IntelliQuest
 */

// Firebase project configuration
// These values should be set in environment variables for security
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate required configuration
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

// Only log error if we're actually missing config AND Firebase is needed
if (missingEnvVars.length > 0) {
  // Check if we have valid Firebase config from environment
  const hasValidConfig = firebaseConfig.apiKey && firebaseConfig.projectId;
  
  if (!hasValidConfig) {
    console.error('🚨 Missing required Firebase environment variables:', missingEnvVars);
    console.log('📝 Please check your .env.local file and ensure all Firebase variables are set');
  } else {
    // Environment variables are available, just the check is running at wrong time
    console.log('✅ Firebase environment variables loaded successfully');
  }
}

// Initialize Firebase App (singleton pattern)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Track emulator connection status to prevent duplicate connections
let emulatorsConnected = false;

// Initialize Firebase regardless of environment (client or server)
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('🔥 Firebase app initialized');
} else {
  app = getApp();
  console.log('🔥 Firebase app already initialized');
}

// Initialize Firebase Services
auth = getAuth(app);
db = getFirestore(app);

export { auth, db };

// Development environment setup - only on client side
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Connect to emulators in development
  const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
  
  if (useEmulators && !emulatorsConnected && auth && db) {
    try {
      // Connect to Auth emulator
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('🔧 Connected to Firebase Auth emulator');
      
      // Connect to Firestore emulator  
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('🔧 Connected to Firestore emulator');
      
      emulatorsConnected = true;
    } catch (error) {
      console.warn('⚠️ Firebase emulators may already be connected:', error);
      // Set flag to true even if connection failed to prevent retry
      emulatorsConnected = true;
    }
  }
}

// Auth persistence configuration
if (typeof window !== 'undefined' && auth) {
  import('firebase/auth').then(({ setPersistence, browserLocalPersistence }) => {
    if (auth) {
      setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error('🚨 Failed to set auth persistence:', error);
      });
    }
  });
}

/**
 * Firebase App Instance
 */
export default app;

/**
 * Firebase configuration status
 */
export const firebaseConfigStatus = {
  isConfigured: missingEnvVars.length === 0,
  missingVariables: missingEnvVars,
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  isDevelopment: process.env.NODE_ENV === 'development',
  useEmulators: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'
};

/**
 * Helper function to check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
  return firebaseConfigStatus.isConfigured;
};

/**
 * Helper function to get Firebase project info
 */
export const getFirebaseProjectInfo = () => {
  return {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    appId: firebaseConfig.appId
  };
};

// Log configuration status
console.log('🔥 Firebase Configuration Status:', {
  configured: firebaseConfigStatus.isConfigured,
  projectId: firebaseConfigStatus.projectId,
  development: firebaseConfigStatus.isDevelopment,
  emulators: firebaseConfigStatus.useEmulators
}); 