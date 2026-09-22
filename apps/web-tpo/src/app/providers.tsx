'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PORTAL_ROLES, getAccessToken, storeAccessToken } from '@smart/api-client';
import { RolesGuard, SessionBootstrap } from '@smart/ui';
import { signOut } from '../lib/auth';

const MOCK_DEV_TPO_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJuYW1lIjoiUGlsb3QgVFBPIiwiZW1haWwiOiJ0cG9AaW5zdGl0dXRpb24uZWR1Iiwicm9sZSI6IklOU1RJVFVUSU9OX0FETUlOIiwiZXhwIjoyNTI0NjA4MDAwfQ.mock_signature';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';
const PORTAL_ORIGINS = {
  student: process.env.NEXT_PUBLIC_STUDENT_URL ?? 'http://localhost:3001',
  tpo: process.env.NEXT_PUBLIC_TPO_URL ?? 'http://localhost:3002',
  admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3003',
  company: process.env.NEXT_PUBLIC_COMPANY_URL ?? 'http://localhost:3006',
};
const PUBLIC_PATHS = ['/auth'] as const;

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined' && !getAccessToken()) {
      storeAccessToken(MOCK_DEV_TPO_TOKEN);
    }
  }, []);

  return (
    <SessionBootstrap>
      <RolesGuard
        allowedRoles={PORTAL_ROLES.tpo}
        authAppUrl={authUrl}
        apiBaseUrl={baseUrl}
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
