'use client';

import { getAccessToken } from '@smart/api-client';
import { SessionBootstrap, SmartApiProvider } from '@smart/ui';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionBootstrap>
      <SmartApiProvider
        baseUrl={baseUrl}
        getAccessToken={getAccessToken}
        onUnauthorized={() => {
          window.location.href = `${authUrl}/login`;
        }}
      >
        {children}
      </SmartApiProvider>
    </SessionBootstrap>
  );
}
