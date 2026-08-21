import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface AppShellProps {
  productName?: string;
  title: string;
  subtitle?: string;
  nav?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Shared chrome for the four SMART portals. Keeps brand, density and motion
 * rules identical so a candidate who later becomes a TPO user is not relearning
 * the product.
 */
export function AppShell({
  productName = 'SMART',
  title,
  subtitle,
  nav,
  children,
  className,
}: AppShellProps) {
  return (
    <div className={cn('min-h-dvh bg-[var(--surface-muted)] text-[var(--text-primary)]', className)}>
      <header className="border-b border-[var(--surface-border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              {productName}
            </p>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-sm text-[var(--text-muted)]">{subtitle}</p> : null}
          </div>
          {nav}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
