'use client';

import type { ReactNode } from 'react';
import { getAccessToken } from '@smart/api-client';
import { SessionHoldWall } from '@smart/ui';
import { TpoSidebar } from './tpo-sidebar';
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
      <div className="flex h-screen bg-slate-50 text-slate-900 selection:bg-[#004c63]/20 font-sans overflow-hidden">
        <TpoSidebar />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <TpoTopbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    </SessionHoldWall>
  );
}
