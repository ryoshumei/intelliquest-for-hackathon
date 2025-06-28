import { NextRequest, NextResponse } from 'next/server';
import { User } from '../../domain/user/entities/User';
import {AuthService} from "@/application/services/AuthService";
import {FirebaseAuthService} from "@/infrastructure/auth/FirebaseAuthService";
import { verifyIdToken } from '../firebase-admin';

// Extend NextRequest to include user property
declare module 'next/server' {
  interface NextRequest {
    user?: User;
  }
}

/**
 * Authentication middleware for API routes
 * Verifies Firebase ID token using Firebase Admin SDK
 */
export function withAuth<T = any>(
  handler: (req: NextRequest, context: T) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { 
            error: 'Unauthorized', 
            message: 'Missing or invalid authorization header' 
          },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      if (!token) {
        return NextResponse.json(
          { 
            error: 'Unauthorized', 
            message: 'Missing authentication token' 
          },
          { status: 401 }
        );
      }

      // Verify Firebase ID token using Admin SDK
      try {
        console.log('🔐 Verifying Firebase ID token with Admin SDK');
        const decodedToken = await verifyIdToken(token);
        
        // Extract user information from verified token
        const userId = decodedToken.uid;
        const email = decodedToken.email || 'unknown@example.com';
        const name = decodedToken.name || decodedToken.display_name || 'User';
        
        if (!userId) {
          return NextResponse.json(
            { 
              error: 'Unauthorized', 
              message: 'Invalid token payload - missing user ID' 
            },
            { status: 401 }
          );
        }

        // Create user from verified token payload
        const user = User.createRegistered(userId, email, name);

        // Add user to request context
        req.user = user;

        console.log(`✅ User authenticated: ${email} (${userId})`);

        // Call the actual handler
        return await handler(req, context);
        
      } catch (verificationError: any) {
        console.error('🚨 Firebase token verification failed:', verificationError.message);
        
        // Handle specific Firebase Auth errors
        let errorMessage = 'Token verification failed';
        if (verificationError.code) {
          switch (verificationError.code) {
            case 'auth/id-token-expired':
              errorMessage = 'Token has expired. Please log in again.';
              break;
            case 'auth/id-token-revoked':
              errorMessage = 'Token has been revoked. Please log in again.';
              break;
            case 'auth/invalid-id-token':
              errorMessage = 'Invalid token format or signature.';
              break;
            case 'auth/project-not-found':
              errorMessage = 'Firebase project configuration error.';
              break;
            default:
              errorMessage = 'Authentication failed. Please log in again.';
          }
        }
        
        return NextResponse.json(
          { 
            error: 'Unauthorized', 
            message: errorMessage,
            code: verificationError.code || 'AUTH_ERROR'
          },
          { status: 401 }
        );
      }
      
    } catch (error) {
      console.error('🚨 Authentication middleware error:', error);
      return NextResponse.json(
        { 
          error: 'Internal Server Error', 
          message: 'Authentication service unavailable' 
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Optional authentication middleware
 * Sets user context if authenticated, but allows unauthenticated requests
 */
export function withOptionalAuth<T = any>(
  handler: (req: NextRequest, context: T) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        if (token) {
          try {
            console.log('🔐 Optional auth: Verifying Firebase ID token');
            const decodedToken = await verifyIdToken(token);
            
            const userId = decodedToken.uid;
            const email = decodedToken.email || 'unknown@example.com';
            const name = decodedToken.name || decodedToken.display_name || 'User';
            
            if (userId) {
              const user = User.createRegistered(userId, email, name);
              req.user = user;
              console.log(`✅ Optional auth successful: ${email} (${userId})`);
            }
          } catch (error) {
            // Ignore authentication errors for optional auth
            console.warn('⚠️ Optional auth failed, continuing without user:', error);
          }
        }
      }

      return await handler(req, context);
      
    } catch (error) {
      console.error('🚨 Optional authentication middleware error:', error);
      return await handler(req, context);
    }
  };
}

/**
 * Role-based authorization middleware
 * Requires authentication and specific user permissions
 */
export function withRole<T = any>(
  requiredPermissions: string[],
  handler: (req: NextRequest, context: T) => Promise<NextResponse> | NextResponse
) {
  return withAuth<T>(async (req: NextRequest, context: T) => {
    const user = req.user!; // User is guaranteed to exist due to withAuth

    // Check if user is anonymous (anonymous users have no permissions)
    if (user.getIsAnonymous()) {
      return NextResponse.json(
        { 
          error: 'Forbidden', 
          message: 'Anonymous users do not have permission to access this resource' 
        },
        { status: 403 }
      );
    }

    // For now, we implement basic permission checks
    // In a real application, you might have a more sophisticated RBAC system
    const hasPermission = requiredPermissions.every(permission => {
      switch (permission) {
        case 'surveys:create':
          return user.canCreateSurveys();
        case 'surveys:read':
          return true; // All authenticated users can read their own surveys
        case 'analytics:view':
          return user.canViewAnalytics();
        default:
          return false;
      }
    });

    if (!hasPermission) {
      return NextResponse.json(
        { 
          error: 'Forbidden', 
          message: 'Insufficient permissions to access this resource' 
        },
        { status: 403 }
      );
    }

    return await handler(req, context);
  });
}

/**
 * Helper function to extract user from authenticated request
 */
export function getUser(req: NextRequest): User | null {
  return req.user || null;
}

/**
 * Helper function to require authenticated user
 */
export function requireUser(req: NextRequest): User {
  const user = req.user;
  if (!user) {
    throw new Error('User not found in request context. Make sure to use withAuth middleware.');
  }
  return user;
} 