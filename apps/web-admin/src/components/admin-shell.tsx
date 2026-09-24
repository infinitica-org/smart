'use client';

import { useState, type ReactNode } from 'react';
import { getAccessToken } from '@smart/api-client';
import { SessionHoldWall } from '@smart/ui';
import { AdminSidebar } from './admin-sidebar';
import { AdminTopbar } from './admin-topbar';
import { api } from '../lib/api';
import { signOut } from '../lib/auth';

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <SessionHoldWall
      getAccessToken={getAccessToken}
      pollMe={() => api.auth.me()}
      onSignOut={signOut}
    >
      <div className="admin-console flex h-screen overflow-hidden bg-[var(--ds-canvas,#f8fafc)] text-[var(--ds-text,#101828)] antialiased selection:bg-[var(--admin-accent,#10b981)] selection:text-[var(--ds-text,#101828)]">
        <AdminSidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col lg:pl-64">
          <AdminTopbar onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-6 md:py-4">
            {children}
          </main>
        </div>
      </div>
    </SessionHoldWall>
  );
}
