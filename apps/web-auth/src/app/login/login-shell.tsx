import type { ReactNode } from 'react';
import { LoginBrandPanel } from './login-brand-panel';

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--surface-muted)] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <LoginBrandPanel />
      {children}
    </div>
  );
}

export function LoginLoadingState() {
  return (
    <LoginShell>
      <section className="flex min-h-dvh items-center justify-center px-6 py-16">
        <div
          className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-10 shadow-[var(--shadow-card)]"
          role="status"
          aria-live="polite"
        >
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-brand-500/25 border-t-brand-400" />
          <p className="text-sm text-[var(--text-muted)]">Preparing sign-in…</p>
        </div>
      </section>
    </LoginShell>
  );
}
