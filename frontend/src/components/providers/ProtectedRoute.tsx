import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const redirectState = location.state as {
    from?: { pathname?: string; search?: string; hash?: string };
  } | null;

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authentication is required and user is not authenticated, redirect to login
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If authentication is not required and user is authenticated, redirect to dashboard
  if (!requireAuth && isAuthenticated) {
    const fromPath = redirectState?.from?.pathname;
    const fromSearch = redirectState?.from?.search ?? '';
    const fromHash = redirectState?.from?.hash ?? '';
    const safeRedirectPath = fromPath && !fromPath.startsWith('/auth')
      ? `${fromPath}${fromSearch}${fromHash}`
      : '/dashboard';

    return <Navigate to={safeRedirectPath} replace />;
  }

  // Wrap children in a fragment to prevent unnecessary DOM nesting
  return <React.Fragment>{children}</React.Fragment>;
} 
