'use client';

import { PORTAL_ROLES } from '@smart/api-client';
import { RolesGuard } from '@smart/ui';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';
const PUBLIC_PATHS = ['/forbidden'] as const;

export function PortalAuthGate({ children }: { children: React.ReactNode }) {
  return (
    <RolesGuard
      allowedRoles={PORTAL_ROLES.tpo}
      authAppUrl={AUTH_URL}
      publicPathPrefixes={PUBLIC_PATHS}
    >
      {children}
    </RolesGuard>
  );
}
