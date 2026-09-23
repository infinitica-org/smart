'use client';

import { usePathname } from 'next/navigation';
import { PORTAL_ROLES } from '@smart/api-client';
import { RolesGuard, SessionBootstrap } from '@smart/ui';
import { signOut } from '@/lib/auth';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const PORTAL_ORIGINS = {
  student: process.env.NEXT_PUBLIC_STUDENT_URL ?? 'http://localhost:3001',
  tpo: process.env.NEXT_PUBLIC_TPO_URL ?? 'http://localhost:3002',
  admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3003',
  company: process.env.NEXT_PUBLIC_COMPANY_URL ?? 'http://localhost:3006',
};
const PUBLIC_PATHS = ['/auth'] as const;

export function PortalAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SessionBootstrap>
      <RolesGuard
        allowedRoles={PORTAL_ROLES.company}
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
