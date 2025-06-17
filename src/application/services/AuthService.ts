import { User } from '../../domain/user/entities/User';

/**
 * Authentication Service Interface
 * Defines the contract for user authentication operations
 * Implementation will be provided by the infrastructure layer
 */
export interface AuthService {
  /**
   * Register a new user with email and password
   */
  registerWithEmail(email: string, password: string, displayName: string): Promise<User>;

  /**
   * Sign in with email and password
   */
  signInWithEmail(email: string, password: string): Promise<User>;



  /**
   * Sign in anonymously (for survey respondents)
   */
  signInAnonymously(): Promise<User>;

  /**
   * Sign out current user
   */
  signOut(): Promise<void>;

  /**
   * Get current authenticated user
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(email: string): Promise<void>;

  /**
   * Update user profile
   */
  updateProfile(displayName?: string, photoURL?: string): Promise<void>;

  /**
   * Update user email (requires re-authentication)
   */
  updateEmail(newEmail: string): Promise<void>;

  /**
   * Update password (requires current password)
   */
  updatePassword(currentPassword: string, newPassword: string): Promise<void>;

  /**
   * Delete user account
   */
  deleteAccount(): Promise<void>;

  /**
   * Listen to authentication state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void;

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Get user token for API authentication
   */
  getAuthToken(): Promise<string | null>;

  /**
   * Refresh authentication token
   */
  refreshToken(): Promise<string>;
}

/**
 * Authentication Error Types
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }

  static userNotFound(): AuthError {
    return new AuthError('用户不存在', 'USER_NOT_FOUND');
  }

  static wrongPassword(): AuthError {
    return new AuthError('密码错误', 'WRONG_PASSWORD');
  }

  static emailAlreadyInUse(): AuthError {
    return new AuthError('邮箱已被使用', 'EMAIL_ALREADY_IN_USE');
  }

  static weakPassword(): AuthError {
    return new AuthError('密码强度不够，至少需要6个字符', 'WEAK_PASSWORD');
  }

  static invalidEmail(): AuthError {
    return new AuthError('邮箱格式不正确', 'INVALID_EMAIL');
  }

  static tooManyRequests(): AuthError {
    return new AuthError('请求过于频繁，请稍后再试', 'TOO_MANY_REQUESTS');
  }

  static networkError(): AuthError {
    return new AuthError('网络连接错误，请检查网络设置', 'NETWORK_ERROR');
  }

  static serviceUnavailable(): AuthError {
    return new AuthError('认证服务不可用', 'SERVICE_UNAVAILABLE');
  }

  static unknown(originalError?: any): AuthError {
    return new AuthError('认证服务发生未知错误', 'UNKNOWN_ERROR', originalError);
  }
}

/**
 * User Registration Request
 */
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
}

/**
 * Sign In Request
 */
export interface SignInRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Password Reset Request
 */
export interface PasswordResetRequest {
  email: string;
  redirectUrl?: string;
}

/**
 * Profile Update Request
 */
export interface ProfileUpdateRequest {
  displayName?: string;
  photoURL?: string;
}

/**
 * Password Update Request
 */
export interface PasswordUpdateRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
} 