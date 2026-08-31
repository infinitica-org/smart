import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-sm text-[var(--text-muted)]" role="status">
          Loading sign-in…
        </p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
