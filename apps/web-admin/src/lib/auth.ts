'use client';

import { useLayoutEffect } from 'react';
import { bootstrapAccessTokenFromUrl, getAccessToken } from '@smart/api-client';

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
