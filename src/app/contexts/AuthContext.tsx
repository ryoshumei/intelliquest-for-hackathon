'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { auth } from '../../infrastructure/firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';

// Types
interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAnonymous: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
  getToken: () => Promise<string | null>;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// Helper function to convert Firebase user to our User type
function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || undefined,
    isAnonymous: firebaseUser.isAnonymous,
  };
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (state.isLoading) {
        console.warn('⚠️ AuthContext: Authentication check timeout, setting to not authenticated');
        dispatch({ type: 'SET_USER', payload: null });
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timeout);
  }, [state.isLoading]);

  // Listen for auth state changes
  useEffect(() => {
    console.log('🔍 AuthContext: Setting up auth state listener...');
    
    if (!auth) {
      console.error('🚨 Firebase auth not initialized, setting to not authenticated');
      dispatch({ type: 'SET_USER', payload: null });
      return;
    }

    console.log('✅ AuthContext: Firebase auth is available, setting up listener');

    // Immediately check current user
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log('✅ AuthContext: Current user found immediately:', currentUser.email);
      const user = mapFirebaseUser(currentUser);
      dispatch({ type: 'SET_USER', payload: user });
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('🔄 AuthContext: Auth state changed', firebaseUser ? 'User logged in' : 'No user');
      
      if (firebaseUser) {
        const user = mapFirebaseUser(firebaseUser);
        console.log('✅ AuthContext: Setting authenticated user:', user.email);
        dispatch({ type: 'SET_USER', payload: user });
      } else {
        console.log('🚪 AuthContext: No user, setting to null');
        dispatch({ type: 'SET_USER', payload: null });
      }
    }, (error) => {
      console.error('🚨 AuthContext: Auth state change error:', error);
      dispatch({ type: 'SET_USER', payload: null });
    });

    return () => {
      console.log('🧹 AuthContext: Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  // Set up periodic token refresh for authenticated users
  useEffect(() => {
    if (!state.isAuthenticated || !auth?.currentUser) {
      return;
    }

    // Refresh token every 30 minutes to keep it fresh
    const tokenRefreshInterval = setInterval(async () => {
      try {
        console.log('🔄 AuthContext: Performing periodic token refresh');
        await auth?.currentUser?.getIdToken(true);
        console.log('✅ AuthContext: Token refreshed successfully');
             } catch (error) {
         console.error('🚨 AuthContext: Failed to refresh token:', error);
         // If refresh fails, user might need to re-authenticate
         if (auth) {
           await signOut(auth);
         }
       }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(tokenRefreshInterval);
  }, [state.isAuthenticated]);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    if (!auth) {
      throw new Error('Authentication service not available');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      console.log('🔐 AuthContext: Attempting login with Firebase');
      const credential = await signInWithEmailAndPassword(auth, email, password);
      console.log('🔐 AuthContext: Firebase login successful');
      
      // User will be set automatically by onAuthStateChanged
    } catch (error: any) {
      console.error('🚨 AuthContext: Login failed:', error);
      
      let errorMessage = 'Login failed';
      if (error?.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No user found with this email address';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email format';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later';
            break;
          default:
            errorMessage = 'Authentication failed';
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // Register function
  const register = async (email: string, password: string, displayName: string): Promise<void> => {
    if (!auth) {
      throw new Error('Authentication service not available');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      console.log('🔐 AuthContext: Attempting registration with Firebase');
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with display name
      await updateProfile(credential.user, { displayName });
      
      console.log('🔐 AuthContext: Firebase registration successful');
      
      // User will be set automatically by onAuthStateChanged
    } catch (error: any) {
      console.error('🚨 AuthContext: Registration failed:', error);
      
      let errorMessage = 'Registration failed';
      if (error?.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email format';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please choose a stronger password';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password registration is not enabled';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many registration attempts. Please try again later';
            break;
          default:
            errorMessage = 'Registration failed';
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    if (!auth) {
      throw new Error('Authentication service not available');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await signOut(auth);
      // User will be cleared automatically by onAuthStateChanged
    } catch (error: any) {
      console.error('🚨 AuthContext: Logout failed:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Logout failed' });
    }
  };

  // Forgot password function
  const forgotPassword = async (email: string): Promise<void> => {
    if (!auth) {
      throw new Error('Authentication service not available');
    }

    dispatch({ type: 'CLEAR_ERROR' });

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('🚨 AuthContext: Password reset failed:', error);
      
      let errorMessage = 'Password reset failed';
      if (error?.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No user found with this email address';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email format';
            break;
          default:
            errorMessage = 'Password reset failed';
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // Clear error function
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Get current user's ID token with automatic refresh
  const getToken = async (forceRefresh = false): Promise<string | null> => {
    if (!auth?.currentUser) {
      console.warn('🚨 AuthContext: No authenticated user found');
      return null;
    }

    try {
      // Force refresh token if requested or if we suspect it might be expired
      const token = await auth.currentUser.getIdToken(forceRefresh);
      console.log('✅ AuthContext: Successfully retrieved token');
      return token;
    } catch (error: any) {
      console.error('🚨 AuthContext: Failed to get user token:', error);
      
      // If token retrieval fails, try to refresh once
      if (!forceRefresh && error?.code === 'auth/id-token-expired') {
        console.log('🔄 AuthContext: Token expired, attempting refresh...');
        return await getToken(true);
      }
      
             // If refresh also fails, user needs to re-authenticate
       if (error?.code === 'auth/id-token-expired' || error?.code === 'auth/id-token-revoked') {
         console.log('🚨 AuthContext: Token expired and refresh failed, logging out user');
         if (auth) {
           await signOut(auth);
         }
       }
      
      return null;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    forgotPassword,
    clearError,
    getToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 