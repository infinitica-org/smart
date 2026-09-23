'use client';

import { usePathname } from 'next/navigation';
import { PORTAL_ROLES, resolvePortalOriginsFromEnv } from '@smart/api-client';
import { RolesGuard, SessionBootstrap } from '@smart/ui';
import { signOut } from '../lib/auth';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const PORTAL_ORIGINS = resolvePortalOriginsFromEnv();
const PUBLIC_PATHS = ['/auth'] as const;

export function PortalAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SessionBootstrap>
      <RolesGuard
        allowedRoles={PORTAL_ROLES.admin}
        authAppUrl={AUTH_URL}
        apiBaseUrl={API_URL}
        pathname={pathname}
        portalOrigins={PORTAL_ORIGINS}
        publicPathPrefixes={PUBLIC_PATHS}
        onSignOut={signOut}
      >
        {children}
      </RolesGuard>
    </SessionBootstrap>
  );
}
