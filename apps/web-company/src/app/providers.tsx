'use client';

import { usePathname } from 'next/navigation';
import {
  buildLoginUrl,
  clearAccessToken,
  createRefreshAccessToken,
  getAccessToken,
  PORTAL_ROLES,
  resolvePortalOriginsFromEnv,
} from '@smart/api-client';
import { RolesGuard, SessionBootstrap, SessionHoldWall, SmartApiProvider } from '@smart/ui';
import { api } from '../lib/api';
import { signOut } from '../lib/auth';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';
const PORTAL_ORIGINS = resolvePortalOriginsFromEnv();
const PUBLIC_PATHS = ['/auth'] as const;

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SessionBootstrap>
      <RolesGuard
        allowedRoles={PORTAL_ROLES.company}
        authAppUrl={authUrl}
        apiBaseUrl={baseUrl}
        pathname={pathname}
        portalOrigins={PORTAL_ORIGINS}
        publicPathPrefixes={PUBLIC_PATHS}
        onSignOut={signOut}
      >
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
            refreshAccessToken={createRefreshAccessToken(() => api.auth.refresh())}
            onUnauthorized={() => {
              clearAccessToken();
              window.location.href = buildLoginUrl(authUrl, window.location.href);
            }}
          >
            {children}
          </SmartApiProvider>
        </SessionHoldWall>
      </RolesGuard>
    </SessionBootstrap>
  );
}
