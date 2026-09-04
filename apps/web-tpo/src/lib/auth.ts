'use client';

import { signOutAndRedirect } from '@smart/api-client';
import { api } from './api';

const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';
const portalOrigins = {
  student: process.env.NEXT_PUBLIC_STUDENT_URL ?? 'http://localhost:3001',
  tpo: process.env.NEXT_PUBLIC_TPO_URL ?? 'http://localhost:3002',
  admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3003',
};

export function signOut(): Promise<void> {
  return signOutAndRedirect({
    logout: () => api.auth.logout(),
    authAppUrl: authUrl,
    portalOrigins,
  });
}
