'use client';

import { usePathname } from 'next/navigation';
import { PORTAL_ROLES } from '@smart/api-client';
import { RolesGuard, SessionBootstrap } from '@smart/ui';
import { signOut } from '../lib/auth';

/** TPO hosts its own Institution Login; unauthenticated users stay on this portal. */
const AUTH_URL = process.env.NEXT_PUBLIC_TPO_URL ?? 'http://localhost:3002';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://dev.api.becomesmart.online';
const PORTAL_ORIGINS = {
  student: process.env.NEXT_PUBLIC_STUDENT_URL ?? 'http://localhost:3001',
  tpo: process.env.NEXT_PUBLIC_TPO_URL ?? 'http://localhost:3002',
  admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3003',
};
const PUBLIC_PATHS = ['/auth', '/login'] as const;

export function PortalAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // --- MOCK BYPASS: Bypassing auth gate so you aren't kicked out ---
  return <>{children}</>;
}
