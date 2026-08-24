'use client';

import { SmartApiProvider } from '@smart/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SmartApiProvider
      baseUrl="http://localhost:3000" // Replace with real API URL in higher envs
      getAccessToken={() => localStorage.getItem('access_token')}
      refreshAccessToken={async () => {
        // Stub for S0 - returning null forces logout, returning string is new token
        console.warn('Stub: 401 triggered silent refresh');
        return 'new-stub-token';
      }}
      onUnauthorized={() => {
        console.warn('Unauthorized - redirect to login');
      }}
    >
      {children}
    </SmartApiProvider>
  );
}
