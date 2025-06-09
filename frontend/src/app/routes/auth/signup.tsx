import * as React from 'react';
import { Link } from 'react-router-dom';
import { SignupForm } from '@/components/organisms/SignupForm';
import { AuthLayout } from '@/components/organisms/AuthLayout';
import { ProtectedRoute } from '@/components/providers/ProtectedRoute';

export function SignupPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <AuthLayout
        title="Create your account"
        subtitle="Join Knowledge Vault to start your learning journey."
        footer={
          <p>
            Already have an account?{' '}
            <Link
              to="/auth/login"
              className="font-medium text-primary hover:text-primary/90"
            >
              Sign in
            </Link>
          </p>
        }
      >
        <SignupForm />
      </AuthLayout>
    </ProtectedRoute>
  );
} 