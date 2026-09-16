'use client';

import type { ReactNode } from 'react';
import { getAccessToken } from '@smart/api-client';
import { SessionHoldWall } from '@smart/ui';
import { TpoTopbar } from './tpo-topbar';
import { api } from '../lib/api';
import { signOut } from '../lib/auth';

export function TpoShell({ children }: { children: ReactNode }) {
  return (
    <SessionHoldWall
      getAccessToken={getAccessToken}
      pollMe={() => api.auth.me()}
      onSignOut={signOut}
    >
      <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[var(--ds-canvas)] font-sans text-[var(--ds-text)] antialiased selection:bg-[var(--tpo-accent)] selection:text-[var(--ds-text)]">
        <TpoTopbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 md:p-8">{children}</main>
      </div>
    </SessionHoldWall>
  );
}
