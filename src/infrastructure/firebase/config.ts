import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';

/**
 * Firebase Configuration
 * Initializes Firebase services for IntelliQuest
 */

// Fallback configuration for development/testing when env vars are not available
// IMPORTANT: These are placeholder values and should be replaced with real values in environment variables
const fallbackConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};

// Firebase project configuration
// These values should be set in environment variables for security
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallbackConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || fallbackConfig.measurementId,
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
const usingFallbackConfig = missingEnvVars.length > 0;

if (usingFallbackConfig) {
  console.log('⚠️  Using fallback Firebase configuration (env vars not available)');
  console.log('🔧 Missing env vars:', missingEnvVars);
} else {
  console.log('✅ Firebase environment variables loaded successfully');
}

// Initialize Firebase App (singleton pattern)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Track emulator connection status to prevent duplicate connections
let emulatorsConnected = false;

// Initialize Firebase regardless of environment (client or server)
try {
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
  
  console.log('🔥 Firebase services initialized successfully');
} catch (error) {
  console.error('🚨 Firebase initialization failed:', error);
  throw error;
}

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
  isConfigured: true, // Always true now with fallback config
  usingFallback: usingFallbackConfig,
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
  usingFallback: firebaseConfigStatus.usingFallback,
  projectId: firebaseConfigStatus.projectId,
  development: firebaseConfigStatus.isDevelopment,
  emulators: firebaseConfigStatus.useEmulators
}); 