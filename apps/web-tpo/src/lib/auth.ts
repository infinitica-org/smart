'use client';

import { useLayoutEffect } from 'react';
import { bootstrapAccessTokenFromUrl, getAccessToken, signOutAndRedirect } from '@smart/api-client';
import { api } from './api';

const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';

export function useRequireAuth(): boolean {
  useLayoutEffect(() => {
    bootstrapAccessTokenFromUrl();
    if (!getAccessToken()) {
      const returnTo = encodeURIComponent(window.location.href);
      window.location.href = `${authUrl}/login?returnTo=${returnTo}`;
    }
  }, []);
  return true;
}

export function signOut(): Promise<void> {
  return signOutAndRedirect({
    logout: () => api.auth.logout(),
    authAppUrl: authUrl,
  });
}
