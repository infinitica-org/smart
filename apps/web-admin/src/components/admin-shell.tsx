'use client';

import type { ReactNode } from 'react';
import { getAccessToken } from '@smart/api-client';
import { SessionHoldWall } from '@smart/ui';
import { AdminSidebar } from './admin-sidebar';
import { api } from '../lib/api';
import { signOut } from '../lib/auth';

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <SessionHoldWall
      getAccessToken={getAccessToken}
      pollMe={() => api.auth.me()}
      onSignOut={signOut}
    >
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto w-full">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </SessionHoldWall>
  );
}
