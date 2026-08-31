'use client';

import type { ReactNode } from 'react';
import { getAccessToken } from '@smart/api-client';
import { SessionBootstrap, SessionHoldWall } from '@smart/ui';
import { PortalHeader } from './portal-header';
import { api } from '../lib/api';
import { signOut } from '../lib/auth';

export function TpoShell({ children }: { children: ReactNode }) {
  return (
    <SessionBootstrap>
      <SessionHoldWall
        getAccessToken={getAccessToken}
        pollMe={() => api.auth.me()}
        onSignOut={signOut}
      >
        <PortalHeader />
        {children}
      </SessionHoldWall>
    </SessionBootstrap>
  );
}
