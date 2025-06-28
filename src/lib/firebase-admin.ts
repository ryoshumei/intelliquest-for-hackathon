import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  if (!admin.apps.length) {
    try {
      // For development, we'll use a simplified configuration
      // In production, you would use service account credentials
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'intelliquest-hackathon';
      
      admin.initializeApp({
        projectId: projectId,
        // For development/testing, we'll use Application Default Credentials
        // This works when running locally with Firebase CLI or on Google Cloud
      });
      
      console.log('🔥 Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('🚨 Firebase Admin SDK initialization failed:', error);
    }
  }
  
  return admin;
};

// Export initialized admin instance
export const adminApp = initializeFirebaseAdmin();
export const adminAuth = adminApp.auth();
export const adminFirestore = adminApp.firestore();

// Helper function to verify Firebase ID token
export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw error;
  }
}

export default adminApp; 