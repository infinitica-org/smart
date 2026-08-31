'use client';

import { getAccessToken, clearAccessToken } from '@smart/api-client';
import { SessionBootstrap, SessionHoldWall, SmartApiProvider } from '@smart/ui';
import { api } from '../lib/api';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionBootstrap>
      <SessionHoldWall
        getAccessToken={getAccessToken}
        pollMe={() => api.auth.me()}
        onSignOut={async () => {
          try {
            await api.auth.logout();
          } catch {
            /* ignore */
          }
          clearAccessToken();
          window.location.href = `${authUrl}/login`;
        }}
      >
        <SmartApiProvider
          baseUrl={baseUrl}
          getAccessToken={getAccessToken}
          onUnauthorized={() => {
            clearAccessToken();
            window.location.href = `${authUrl}/login`;
          }}
        >
          {children}
        </SmartApiProvider>
      </SessionHoldWall>
    </SessionBootstrap>
  );
}
