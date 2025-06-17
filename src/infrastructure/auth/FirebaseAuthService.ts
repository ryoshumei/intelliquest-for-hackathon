import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
  getIdToken,
  getAuth,
  Auth
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

import { User } from '../../domain/user/entities/User';
import { AuthService, AuthError } from '../../application/services/AuthService';

/**
 * Firebase Authentication Service Implementation
 * Handles all authentication operations for survey creators (调查者)
 */
export class FirebaseAuthService implements AuthService {
  private auth: Auth | null = null;
  private db: any = null; // Firestore instance

  constructor(auth?: Auth, firestoreDb?: any) {
    // Always try to initialize Firebase
    try {
      if (!auth || !firestoreDb) {
        const { auth: defaultAuth, db: defaultDb } = require('../firebase/config');
        this.auth = auth || defaultAuth;
        this.db = firestoreDb || defaultDb;
      } else {
        this.auth = auth;
        this.db = firestoreDb;
      }
      
      // Validate that we have valid instances
      if (!this.auth || !this.db) {
        console.warn('⚠️ Firebase services not properly initialized');
        this.auth = null;
        this.db = null;
      } else {
        console.log('✅ Firebase services initialized successfully');
      }
    } catch (error) {
      console.warn('⚠️ Firebase services initialization failed:', error);
      this.auth = null;
      this.db = null;
    }
  }

  private ensureAuth(): Auth {
    if (!this.auth) {
      throw AuthError.serviceUnavailable();
    }
    return this.auth;
  }

  private ensureDb(): any {
    if (!this.db) {
      throw AuthError.serviceUnavailable();
    }
    return this.db;
  }

  /**
   * Register a new survey creator with email and password
   */
  async registerWithEmail(email: string, password: string, displayName: string): Promise<User> {
    try {
      const auth = this.ensureAuth();
      
      // Create Firebase user
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase profile
      await updateProfile(credential.user, { displayName });

      // Create domain user entity
      const user = User.createRegistered(
        credential.user.uid,
        email,
        displayName,
        credential.user.photoURL || undefined
      );

      // Skip Firestore operations for now
      console.log(`🔐 FirebaseAuth: Successfully registered user ${user.getEmail()}`);
      return user;

    } catch (error: any) {
      console.error('🚨 FirebaseAuth: Registration failed:', error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const auth = this.ensureAuth();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = await this.mapFirebaseUserToDomain(credential.user);
      
      // Update last login time (in memory only)
      user.recordLogin();

      console.log(`🔐 FirebaseAuth: User ${user.getEmail()} signed in`);
      return user;

    } catch (error: any) {
      console.error('🚨 FirebaseAuth: Sign in failed:', error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Sign in anonymously (for survey respondents)
   */
  async signInAnonymously(): Promise<User> {
    try {
      const auth = this.ensureAuth();
      const credential = await signInAnonymously(auth);
      const user = User.createAnonymous(credential.user.uid);

      console.log(`👤 FirebaseAuth: Anonymous user created ${user.getId()}`);
      return user;

    } catch (error: any) {
      console.error('🚨 FirebaseAuth: Anonymous sign in failed:', error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      const auth = this.ensureAuth();
      await signOut(auth);
      console.log('🔐 FirebaseAuth: User signed out');
    } catch (error: any) {
      console.error('🚨 FirebaseAuth: Sign out failed:', error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const auth = this.auth;
    if (!auth) return null;

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    return await this.mapFirebaseUserToDomain(firebaseUser);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      const auth = this.ensureAuth();
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/auth/signin`,
        handleCodeInApp: false
      });
      
      console.log(`📧 FirebaseAuth: Password reset email sent to ${email}`);
    } catch (error: any) {
      console.error('🚨 FirebaseAuth: Password reset failed:', error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(displayName?: string, photoURL?: string): Promise<void> {
    const auth = this.ensureAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw AuthError.userNotFound();
    }

    try {
      // Update Firebase profile
      await updateProfile(firebaseUser, {
        ...(displayName && { displayName }),
        ...(photoURL !== undefined && { photoURL })
      });

      // Update domain user
      const user = await this.mapFirebaseUserToDomain(firebaseUser);
      user.updateProfile(displayName, photoURL);
      
      // Save to Firestore
      await this.updateUserProfile(user);

      console.log(`📝 FirebaseAuth: Profile updated for ${user.getEmail()}`);
    } catch (error: any) {
      console.error('🚨 FirebaseAuth: Profile update failed:', error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Update user email
   */
  async updateEmail(newEmail: string): Promise<void> {
    const auth = this.ensureAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw AuthError.userNotFound();
    }

    try {
      await updateEmail(firebaseUser, newEmail);
      
      // Update domain user
      const user = await this.mapFirebaseUserToDomain(firebaseUser);
      user.updateEmail(newEmail);
      
      // Save to Firestore
      await this.updateUserProfile(user);

      console.log(`📧 FirebaseAuth: Email updated to ${newEmail}`);
    } catch (error: any) {
      console.error('🚨 FirebaseAuth: Email update failed:', error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Update password
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const auth = this.ensureAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      throw AuthError.userNotFound();
    }

    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);

      // Update password
      await updatePassword(firebaseUser, newPassword);

      console.log(`🔒 FirebaseAuth: Password updated for ${firebaseUser.email}`);
    } catch (error: any) {
      console.error('🚨 FirebaseAuth: Password update failed:', error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    const auth = this.ensureAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw AuthError.userNotFound();
    }

    try {
      const userId = firebaseUser.uid;
      
      // Delete user data from Firestore
      // TODO: Implement cascade deletion of user's surveys and data
      
      // Delete Firebase user
      await deleteUser(firebaseUser);

      console.log(`🗑️ FirebaseAuth: Account deleted for ${userId}`);
    } catch (error: any) {
      console.error('🚨 FirebaseAuth: Account deletion failed:', error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const auth = this.auth;
    if (!auth) {
      // Return empty unsubscribe function if auth is not available
      return () => {};
    }
    
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const user = await this.mapFirebaseUserToDomain(firebaseUser);
          callback(user);
        } catch (error) {
          console.error('🚨 FirebaseAuth: Error mapping user in state change:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const auth = this.auth;
    if (!auth) return false;
    return auth.currentUser !== null;
  }

  /**
   * Get user token for API authentication
   */
  async getAuthToken(): Promise<string | null> {
    const auth = this.auth;
    if (!auth) return null;
    
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      return await getIdToken(firebaseUser);
    } catch (error) {
      console.error('🚨 FirebaseAuth: Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<string> {
    const auth = this.ensureAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw AuthError.userNotFound();
    }

    try {
      return await getIdToken(firebaseUser, true); // Force refresh
    } catch (error: any) {
      console.error('🚨 FirebaseAuth: Token refresh failed:', error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Map Firebase user to domain User entity
   */
  private async mapFirebaseUserToDomain(firebaseUser: FirebaseUser): Promise<User> {
    if (firebaseUser.isAnonymous) {
      return User.createAnonymous(firebaseUser.uid);
    }

    // Create user from Firebase user data (skip Firestore for now)
    const user = User.createRegistered(
      firebaseUser.uid,
      firebaseUser.email || '',
      firebaseUser.displayName || 'User',
      firebaseUser.photoURL || undefined
    );

    return user;
  }

  /**
   * Save user profile to Firestore
   */
  private async saveUserProfile(user: User): Promise<void> {
    const db = this.ensureDb();
    const userRef = doc(db, 'users', user.getId());
    await setDoc(userRef, {
      ...user.toJSON(),
      createdAt: user.getCreatedAt(),
      lastLoginAt: user.getLastLoginAt()
    });
  }

  /**
   * Update user profile in Firestore
   */
  private async updateUserProfile(user: User): Promise<void> {
    const db = this.ensureDb();
    const userRef = doc(db, 'users', user.getId());
    await updateDoc(userRef, {
      displayName: user.getDisplayName(),
      email: user.getEmail(),
      photoURL: user.getPhotoURL(),
      lastLoginAt: user.getLastLoginAt(),
      preferences: user.getPreferences()
    });
  }

  /**
   * Get user from Firestore
   */
  private async getUserFromFirestore(userId: string): Promise<any | null> {
    try {
      const db = this.ensureDb();
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
    } catch (error) {
      console.warn('⚠️ Could not get user from Firestore:', error);
      return null;
    }
  }

  /**
   * Map Firebase error to domain AuthError
   */
  private mapFirebaseError(error: any): AuthError {
    const errorCode = error.code || '';
    
    switch (errorCode) {
      case 'auth/user-not-found':
        return AuthError.userNotFound();
      case 'auth/wrong-password':
        return AuthError.wrongPassword();
      case 'auth/email-already-in-use':
        return AuthError.emailAlreadyInUse();
      case 'auth/weak-password':
        return AuthError.weakPassword();
      case 'auth/invalid-email':
        return AuthError.invalidEmail();
      case 'auth/too-many-requests':
        return AuthError.tooManyRequests();
      case 'auth/network-request-failed':
        return AuthError.networkError();
      default:
        return AuthError.unknown(error);
    }
  }
} 