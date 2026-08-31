'use client';

import { clearAccessToken, getAccessToken, PORTAL_ROLES } from '@smart/api-client';
import { RolesGuard, SessionBootstrap, SmartApiProvider } from '@smart/ui';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';
const PUBLIC_PATHS = ['/login', '/auth', '/forbidden', '/design-system'] as const;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionBootstrap>
      <RolesGuard
        allowedRoles={PORTAL_ROLES.student}
        authAppUrl={authUrl}
        publicPathPrefixes={PUBLIC_PATHS}
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
      </RolesGuard>
    </SessionBootstrap>
  );
}
