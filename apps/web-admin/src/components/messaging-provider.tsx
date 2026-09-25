'use client';

import type { ReactNode } from 'react';
import {
  buildLoginUrl,
  clearAccessToken,
  createRefreshAccessToken,
  getAccessToken,
} from '@smart/api-client';
import { SmartApiProvider } from '@smart/ui';
import { api } from '@/lib/api';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';

// Module-level so the provider keeps one stable client: web-admin has no app-wide SmartApiProvider.
const refreshAccessToken = createRefreshAccessToken(() => api.auth.refresh());
const onUnauthorized = () => {
  clearAccessToken();
  window.location.href = buildLoginUrl(authUrl, window.location.href);
};

/** Gives the shared reported-conversation view (`@smart/ui`) its API client inside web-admin. */
export function MessagingProvider({ children }: { children: ReactNode }) {
  return (
    <SmartApiProvider
      baseUrl={baseUrl}
      getAccessToken={getAccessToken}
      refreshAccessToken={refreshAccessToken}
      onUnauthorized={onUnauthorized}
    >
      {children}
    </SmartApiProvider>
  );
}
