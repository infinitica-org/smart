import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { SmartLogo } from './smart-logo';

export interface AppShellProps {
  productName?: string;
  title: string;
  subtitle?: string;
  nav?: ReactNode;
  children: ReactNode;
  className?: string;
}

function productKicker(productName?: string): string | null {
  if (!productName) return null;
  const rest = productName.replace(/^SMART\s*[·•|\-:]*\s*/i, '').trim();
  if (!rest || rest.toLowerCase() === 'smart') return null;
  return rest;
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
  const kicker = productKicker(productName);

  return (
    <div
      className={cn('min-h-dvh bg-[var(--surface-muted)] text-[var(--text-primary)]', className)}
    >
      <header className="border-b border-[var(--surface-border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <SmartLogo kind="wordmark" className="h-7" title="SMART" />
              {kicker ? (
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                  {kicker}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-sm text-[var(--text-muted)]">{subtitle}</p> : null}
          </div>
          {nav}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
