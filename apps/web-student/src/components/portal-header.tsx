'use client';

import { SignOutButton, SmartLogo } from '@smart/ui';
import { signOut } from '../lib/auth';

export function PortalHeader() {
  return (
    <header className="border-b border-zinc-800 bg-black">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-2.5">
          <SmartLogo kind="mark" tone="on-dark" className="h-6 w-6 shrink-0" />
          <span className="text-xs font-semibold text-zinc-400 border-l border-zinc-800 pl-3">
            Candidate
          </span>
        </div>
        <SignOutButton onSignOut={signOut} />
      </div>
    </header>
  );
}
