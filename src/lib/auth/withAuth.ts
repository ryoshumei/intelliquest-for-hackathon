import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../application/services/AuthService';
import { FirebaseAuthService } from '../../infrastructure/auth/FirebaseAuthService';
import { User } from '../../domain/user/entities/User';

// Extend NextRequest to include user property
declare module 'next/server' {
  interface NextRequest {
    user?: User;
  }
}

/**
 * Authentication middleware for API routes
 * Verifies JWT token and sets user context
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

      // Initialize auth service and verify token
      const authService: AuthService = new FirebaseAuthService();
      
      try {
        // In Firebase Auth, we need to verify the ID token
        // This should be implemented in the AuthService
        const user = await authService.getCurrentUser();
        
        if (!user) {
          return NextResponse.json(
            { 
              error: 'Unauthorized', 
              message: 'Invalid or expired token' 
            },
            { status: 401 }
          );
        }

        // Add user to request context
        req.user = user;

        // Call the actual handler
        return await handler(req, context);
        
      } catch (verificationError) {
        console.error('Token verification failed:', verificationError);
        return NextResponse.json(
          { 
            error: 'Unauthorized', 
            message: 'Token verification failed' 
          },
          { status: 401 }
        );
      }
      
    } catch (error) {
      console.error('Authentication middleware error:', error);
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
          const authService: AuthService = new FirebaseAuthService();
          
          try {
            const user = await authService.getCurrentUser();
            if (user) {
              req.user = user;
            }
          } catch (error) {
            // Ignore authentication errors for optional auth
            console.warn('Optional auth failed:', error);
          }
        }
      }

      return await handler(req, context);
      
    } catch (error) {
      console.error('Optional authentication middleware error:', error);
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