import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from './login-form';
import { LoginLoadingState, LoginShell } from './login-shell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in · SMART',
  description: 'Sign in to SMART — role-specific readiness certification for your institution.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingState />}>
      <LoginShell>
        <LoginForm />
      </LoginShell>
    </Suspense>
  );
}
