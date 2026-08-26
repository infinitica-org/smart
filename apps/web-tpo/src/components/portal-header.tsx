'use client';

import { SignOutButton } from '@smart/ui';
import { signOut } from '../lib/auth';

export function PortalHeader() {
  return (
    <header className="border-b border-[var(--surface-border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          SMART · Placement
        </span>
        <SignOutButton onSignOut={signOut} />
      </div>
    </header>
  );
}
