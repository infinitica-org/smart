import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginLoadingState, LoginShell } from '../login/login-shell';
import { RegisterForm } from './register-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Student Registration · SMART',
  description: 'Register using your official university email on SMART.',
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
