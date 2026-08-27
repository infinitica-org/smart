'use client';

import { bootstrapAccessTokenFromUrl, getAccessToken, signOutAndRedirect } from '@smart/api-client';
import { api } from './api';

const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';

export function signOut(): Promise<void> {
  return signOutAndRedirect({
    logout: () => api.auth.logout(),
    authAppUrl: authUrl,
  });
}

export function hasSession(): boolean {
  bootstrapAccessTokenFromUrl();
  return getAccessToken() !== null;
}
