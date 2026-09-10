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
      <div className="relative min-h-screen bg-[#030712] text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-200 font-sans flex flex-col antialiased overflow-x-hidden">
        {/* Ambient Dark Glow Gradients */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-radial from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl opacity-70" />
          <div className="absolute top-[40%] -left-[10%] w-[600px] h-[600px] bg-radial from-indigo-500/5 via-purple-500/5 to-transparent blur-3xl opacity-50" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[700px] h-[700px] bg-radial from-emerald-600/5 via-teal-500/5 to-transparent blur-3xl opacity-60" />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <TpoTopbar />
          <main className="flex-1 p-4 md:p-8 max-w-[1440px] w-full mx-auto">{children}</main>
        </div>
      </div>
    </SessionHoldWall>
  );
}
