import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginLoadingState, LoginShell } from '../../login/login-shell';
import { EmployerRegisterForm } from './employer-register-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Register your company · SMART',
  description: 'Register your company on SMART to hire verified, job-ready candidates.',
};

export default function RegisterEmployerPage() {
  return (
    <Suspense fallback={<LoginLoadingState />}>
      <LoginShell>
        <EmployerRegisterForm />
      </LoginShell>
    </Suspense>
  );
}
