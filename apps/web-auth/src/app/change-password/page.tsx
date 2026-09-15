import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ChangePasswordForm } from './change-password-form';
import { LoginLoadingState, LoginShell } from '../login/login-shell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Change password · SMART',
  description: 'Update your SMART account password.',
};

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<LoginLoadingState />}>
      <LoginShell>
        <ChangePasswordForm />
      </LoginShell>
    </Suspense>
  );
}
