'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import {
  bootstrapAccessTokenFromUrl,
  evaluatePortalAccess,
  getAccessToken,
} from '@smart/api-client';
import type { UserRole } from '@smart/contracts';

export type RolesGuardProps = {
  allowedRoles: readonly UserRole[];
  authAppUrl: string;
  publicPathPrefixes?: readonly string[];
  children: ReactNode;
};

/**
 * Browser-side counterpart of api-core RolesGuard.
 * Unauthenticated users go to web-auth login; wrong role is sent to /forbidden.
 */
export function RolesGuard({
  allowedRoles,
  authAppUrl,
  publicPathPrefixes = ['/forbidden'],
  children,
}: RolesGuardProps) {
  const [gate, setGate] = useState<'checking' | 'open'>('checking');

  useLayoutEffect(() => {
    bootstrapAccessTokenFromUrl();
    const decision = evaluatePortalAccess({
      pathname: window.location.pathname,
      publicPathPrefixes,
      accessToken: getAccessToken(),
      allowedRoles,
      authAppUrl,
      currentHref: window.location.href,
    });
    if (decision.action === 'login') {
      window.location.replace(decision.url);
      return;
    }
    if (decision.action === 'forbidden') {
      window.location.replace('/forbidden');
      return;
    }
    setGate('open');
  }, [allowedRoles, authAppUrl, publicPathPrefixes]);

  if (gate === 'checking') {
    return (
      <p className="p-8 text-sm text-[var(--text-muted)]" role="status">
        Checking session…
      </p>
    );
  }

  return children;
}
