import * as React from 'react';
import { Link } from 'react-router-dom';
import { LoginForm } from '@/components/organisms/LoginForm';
import { AuthLayout } from '@/components/organisms/AuthLayout';
import { ProtectedRoute } from '@/components/providers/ProtectedRoute';

export function LoginPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <AuthLayout
        title="Sign in to your account"
        subtitle="Welcome back! Please enter your details."
        footer={
          <p>
            Don't have an account?{' '}
            <Link
              to="/auth/signup"
              className="font-medium text-primary hover:text-primary/90"
            >
              Sign up
            </Link>
          </p>
        }
      >
        <LoginForm />
      </AuthLayout>
    </ProtectedRoute>
  );
} 