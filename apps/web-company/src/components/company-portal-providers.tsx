'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import {
  buildLoginUrl,
  clearAccessToken,
  createRefreshAccessToken,
  getAccessToken,
} from '@smart/api-client';
import { SessionHoldWall, SmartApiProvider } from '@smart/ui';
import { api } from '@/lib/api';
import { signOut } from '@/lib/auth';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';

export function CompanyPortalProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionHoldWall
        getAccessToken={getAccessToken}
        pollMe={() => api.auth.companyAccount()}
        onSignOut={signOut}
      >
        <SmartApiProvider
          baseUrl={baseUrl}
          getAccessToken={getAccessToken}
          refreshAccessToken={createRefreshAccessToken(() => api.auth.refresh())}
          onUnauthorized={() => {
            clearAccessToken();
            window.location.href = buildLoginUrl(authUrl, window.location.href);
          }}
        >
          {children}
        </SmartApiProvider>
      </SessionHoldWall>
    </QueryClientProvider>
  );
}
