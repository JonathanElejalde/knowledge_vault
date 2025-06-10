import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/atoms/Button';
import { FormInput } from '@/components/molecules/FormInput';
import { PasswordInput } from '@/components/molecules/PasswordInput';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { LoginCredentials } from '@/features/auth/types/auth.types';
import { Checkbox } from '@/components/molecules/Checkbox';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login, isLoading, error: authError } = useAuth();
  // Generate unique ID for this form instance to avoid DOM conflicts
  const formId = React.useId();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      remember_me: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
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

      <PasswordInput
        label="Password"
        autoComplete="current-password"
        required
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex items-center space-x-2">
        <Checkbox
          id={`${formId}-remember_me`}
          {...register('remember_me')}
        />
        <label
          htmlFor={`${formId}-remember_me`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Remember me
        </label>
      </div>

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
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
} 