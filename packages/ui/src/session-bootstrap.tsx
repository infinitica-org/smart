'use client';

import { useLayoutEffect, type ReactNode } from 'react';
import { bootstrapAccessTokenFromUrl } from '@smart/api-client';

/** Captures ?accessToken= from a cross-port redirect before any guarded page loads. */
export function SessionBootstrap({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    bootstrapAccessTokenFromUrl();
  }, []);
  return children;
}
