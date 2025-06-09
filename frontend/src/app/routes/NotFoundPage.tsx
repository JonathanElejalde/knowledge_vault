import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function NotFoundPage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Don't wait for auth initialization to complete on 404 page
  // If loading, assume not authenticated for better UX
  const shouldShowAuthenticatedOptions = !isLoading && isAuthenticated;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-bold text-primary">404</h1>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Page not found
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>

        <div className="flex flex-col gap-4 items-center">
          {shouldShowAuthenticatedOptions ? (
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          ) : (
            <Link to="/auth/login">
              <Button>Go to Login</Button>
            </Link>
          )}
          <Link to="/">
            <Button variant="outline">Go to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 