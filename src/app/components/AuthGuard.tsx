'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  allowedRoles?: string[];
}

/**
 * Authentication Guard Component
 * Protects routes that require authentication
 */
export function AuthGuard({
  children,
  fallback,
  redirectTo = '/auth/login',
  requireAuth = true,
  allowedRoles = [],
}: AuthGuardProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !isAuthenticated) {
        // Store the attempted URL for redirect after login
        sessionStorage.setItem('redirectAfterLogin', pathname);
        router.push(redirectTo);
      } else if (requireAuth && isAuthenticated && allowedRoles.length > 0) {
        // Check role-based permissions
        const hasRequiredRole = allowedRoles.some(role => {
          switch (role) {
            case 'survey_creator':
              return user?.canCreateSurveys() || false;
            case 'analytics_viewer':
              return user?.canViewAnalytics() || false;
            default:
              return true;
          }
        });

        if (!hasRequiredRole) {
          router.push('/dashboard/no-access');
          return;
        }
      }
      setIsChecking(false);
    }
  }, [loading, isAuthenticated, user, requireAuth, allowedRoles, pathname, router, redirectTo]);

  // Show loading state while checking authentication
  if (loading || isChecking) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Checking authentication...</p>
          </div>
        </div>
      )
    );
  }

  // If authentication is required but user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Render children if authentication checks pass
  return <>{children}</>;
}

/**
 * Higher-Order Component for protected routes
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardOptions?: Omit<AuthGuardProps, 'children'>
) {
  const AuthGuardedComponent = (props: P) => {
    return (
      <AuthGuard {...guardOptions}>
        <Component {...props} />
      </AuthGuard>
    );
  };

  AuthGuardedComponent.displayName = `withAuthGuard(${Component.displayName || Component.name})`;
  
  return AuthGuardedComponent;
}

/**
 * Redirect Guard - Redirects authenticated users away from auth pages
 */
interface RedirectGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  when?: 'authenticated' | 'unauthenticated';
}

export function RedirectGuard({
  children,
  redirectTo = '/dashboard',
  when = 'authenticated',
}: RedirectGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (!loading && !hasRedirected) {
      const shouldRedirect = 
        (when === 'authenticated' && isAuthenticated) ||
        (when === 'unauthenticated' && !isAuthenticated);

      if (shouldRedirect) {
        setHasRedirected(true);
        
        // Check for stored redirect URL
        const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
        if (storedRedirect && when === 'authenticated') {
          sessionStorage.removeItem('redirectAfterLogin');
          router.push(storedRedirect);
        } else {
          router.push(redirectTo);
        }
      }
    }
  }, [loading, isAuthenticated, when, redirectTo, router, hasRedirected]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Permission-based component wrapper
 */
interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: string[];
  fallback?: React.ReactNode;
  mode?: 'all' | 'any'; // 'all' requires all permissions, 'any' requires at least one
}

export function PermissionGuard({
  children,
  permissions,
  fallback,
  mode = 'all',
}: PermissionGuardProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return fallback || null;
  }

  const hasPermission = mode === 'all' 
    ? permissions.every(permission => checkUserPermission(user, permission))
    : permissions.some(permission => checkUserPermission(user, permission));

  if (!hasPermission) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * Helper function to check user permissions
 */
function checkUserPermission(user: any, permission: string): boolean {
  switch (permission) {
    case 'surveys:create':
      return user.canCreateSurveys();
    case 'surveys:read':
      return !user.getIsAnonymous();
    case 'analytics:view':
      return user.canViewAnalytics();
    case 'profile:edit':
      return !user.getIsAnonymous();
    default:
      return false;
  }
} 