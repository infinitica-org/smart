'use client';

import { getAccessToken, signOutAndRedirect, storeAccessToken } from '@smart/api-client';
import { api } from './api';

const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';
const portalOrigins = {
  student: process.env.NEXT_PUBLIC_STUDENT_URL ?? 'http://localhost:3001',
  tpo: process.env.NEXT_PUBLIC_TPO_URL ?? 'http://localhost:3002',
  admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3003',
  company: process.env.NEXT_PUBLIC_COMPANY_URL ?? 'http://localhost:3006',
};

export async function loginWithPassword(email: string, password: string) {
  const result = await api.auth.login({ email: email.trim().toLowerCase(), password });
  if (result.accessToken) {
    storeAccessToken(result.accessToken);
  }
  return result;
}

export function signOut(): Promise<void> {
  return signOutAndRedirect({
    logout: () => api.auth.logout(),
    authAppUrl: authUrl,
    portalOrigins,
  });
}

export async function getCurrentUser() {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const user = await api.auth.me();
    return user;
  } catch {
    return null;
  }
}
