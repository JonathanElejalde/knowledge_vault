import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/atoms/Button';
import { FormInput } from '@/components/molecules/FormInput';
import { PasswordInput } from '@/components/molecules/PasswordInput';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { SignupCredentials } from '@/features/auth/types/auth.types';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&.)'
    ),
  confirmPassword: z.string(),
  full_name: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

function SignupFormContent() {
  const { signup, isLoading, error: authError } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      const { confirmPassword, ...signupData } = data;
      await signup(signupData);
    } catch (error) {
      // Error is handled by the auth store
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormInput
        label="Username"
        type="text"
        autoComplete="username"
        required
        error={errors.username?.message}
        {...register('username')}
      />

      <FormInput
        label="Email"
        type="email"
        autoComplete="email"
        required
        error={errors.email?.message}
        {...register('email')}
      />

      <FormInput
        label="Full Name"
        type="text"
        autoComplete="name"
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <PasswordInput
        label="Password"
        error={errors.password?.message}
        required
        description="Must be at least 8 characters with uppercase, lowercase, number and special character (@$!%*?&.)"
        {...register('password')}
      />

      <PasswordInput
        label="Confirm Password"
        error={errors.confirmPassword?.message}
        required
        {...register('confirmPassword')}
      />

      {authError && (
        <div className="rounded-md bg-destructive/15 p-3">
          <p className="text-sm text-destructive">{authError}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}

export function SignupForm() {
  return (
    <ErrorBoundary>
      <SignupFormContent />
    </ErrorBoundary>
  );
} 