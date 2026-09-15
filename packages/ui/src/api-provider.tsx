'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  SmartApiClient,
  type SmartClientOptions,
  createSmartApi,
  type SmartApi,
} from '@smart/api-client';

const SmartApiContext = createContext<SmartApi | null>(null);

export interface SmartApiProviderProps extends Omit<SmartClientOptions, 'fetchImpl'> {
  children: React.ReactNode;
}

/**
 * Initializes the typed API client and a TanStack QueryClient, providing both
 * to the React tree.
 */
export function SmartApiProvider({ children, ...options }: SmartApiProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false, // Let the SmartApiClient handle 429 retries
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const api = useMemo(() => {
    const client = new SmartApiClient(options);
    return createSmartApi(client);
  }, [
    options.baseUrl,
    options.getAccessToken,
    options.refreshAccessToken,
    options.onUnauthorized,
    options.getCorrelationId,
  ]);

  return (
    <SmartApiContext.Provider value={api}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SmartApiContext.Provider>
  );
}

/**
 * Hook to access the fully typed SMART API client.
 */
export function useSmartApi(): SmartApi {
  const api = useContext(SmartApiContext);
  if (!api) {
    throw new Error('useSmartApi must be used within a SmartApiProvider');
  }
  return api;
}

export { useQuery, useQueries, useMutation, useQueryClient };
