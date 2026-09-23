'use client';

import { useState, type ReactNode } from 'react';
import { getAccessToken } from '@smart/api-client';
import { SessionHoldWall } from '@smart/ui';
import { TpoSidebar } from './tpo-sidebar';
import { TpoTopbar } from './tpo-topbar';
import { api } from '../lib/api';
import { signOut } from '../lib/auth';

export function TpoShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <SessionHoldWall
      getAccessToken={getAccessToken}
      pollMe={() => api.auth.me()}
      onSignOut={signOut}
    >
      <div className="tpo-console flex h-screen overflow-hidden bg-[var(--ds-canvas)] text-[var(--ds-text)] antialiased selection:bg-[var(--tpo-accent)] selection:text-[var(--ds-text)]">
        <TpoSidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col lg:pl-64">
          <TpoTopbar onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto overscroll-contain p-4 pt-[calc(3.5rem+1rem)] md:p-8 md:pt-[calc(3.5rem+2rem)]">
            {children}
          </main>
        </div>
      </div>
    </SessionHoldWall>
  );
}
