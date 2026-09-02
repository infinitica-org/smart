'use client';

import Link from 'next/link';
import { SignOutButton } from '@smart/ui';
import { signOut } from '../lib/auth';

export function PortalHeader() {
  return (
    <header className="border-b border-[var(--surface-border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600"
          >
            SMART · Placement
          </Link>
          <nav aria-label="TPO portal" className="flex gap-4 text-sm">
            <Link href="/openings" className="hover:underline">
              Job openings
            </Link>
            <Link href="/suggestions" className="hover:underline">
              Ranked suggestions
            </Link>
            <Link href="/review" className="hover:underline">
              Review & send
            </Link>
            <Link href="/ats" className="hover:underline">
              ATS Kanban
            </Link>
            <Link href="/batches" className="hover:underline">
              Batches
            </Link>
            <Link href="/students" className="hover:underline">
              Students
            </Link>
          </nav>
        </div>
        <SignOutButton onSignOut={signOut} />
      </div>
    </header>
  );
}
