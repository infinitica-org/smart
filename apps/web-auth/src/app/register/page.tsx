import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginLoadingState, LoginShell } from '../login/login-shell';
import { RegisterForm } from './register-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Create your account · SMART',
  description: 'Register for SMART — role-specific readiness certification for your institution.',
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoginLoadingState />}>
      <LoginShell>
        <RegisterForm />
      </LoginShell>
    </Suspense>
  );
}
