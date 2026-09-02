'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardDescription, CardHeader, CardTitle, Alert } from '@smart/ui';
import { api } from '@/lib/api';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const formSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof formSchema>;

export default function ActivateClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    if (!token) {
      setError('Invalid activation link. The token is missing.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session = await api.auth.activate({ token, password: data.password });
      window.sessionStorage.setItem('smart.accessToken', session.accessToken);
      if (session.user.institutionId) {
        window.sessionStorage.setItem('smart.institutionId', session.user.institutionId);
      }
      setSuccess(true);
      setTimeout(() => {
        router.push('/onboarding');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to activate account. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token && !error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert tone="danger">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>Invalid activation link. Please check your email and try again.</span>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md shadow-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Activate your account</CardTitle>
          <CardDescription>
            {success
              ? 'Account activated successfully!'
              : 'Create a password to access your SMART portal.'}
          </CardDescription>
        </CardHeader>

        <div className="p-6 pt-0">
          {success ? (
            <div className="flex flex-col items-center space-y-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You will be redirected to your dashboard shortly...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert tone="danger">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="password">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                  className={`flex h-10 w-full rounded-lg border bg-transparent px-3 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00fad0]/50 ${errors.password ? 'border-red-500' : ''}`}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className={`flex h-10 w-full rounded-lg border bg-transparent px-3 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00fad0]/50 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full mt-4" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Activating...' : 'Activate Account'}
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
