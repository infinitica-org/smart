'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import {
  bootstrapAccessTokenFromUrl,
  clearAccessToken,
  evaluatePortalAccess,
  getAccessToken,
  getSessionRole,
  isClearSessionPath,
  portalHomeForRole,
  reconcileAccessTokenFromCookie,
  SESSION_LOGOUT_CHANNEL,
  type PortalOrigins,
} from '@smart/api-client';
import type { UserRole } from '@smart/contracts';
import { ForbiddenWall } from './components/status-walls';

export type RolesGuardProps = {
  allowedRoles: readonly UserRole[];
  authAppUrl: string;
  apiBaseUrl: string;
  /** Re-evaluate when the App Router path changes (required to lock client navigations). */
  pathname: string;
  portalOrigins: PortalOrigins;
  publicPathPrefixes?: readonly string[];
  onSignOut?: () => void | Promise<void>;
  children: ReactNode;
};

type Gate = 'checking' | 'open' | 'forbidden';

/**
 * Browser-side counterpart of api-core RolesGuard.
 *
 * Wrong-role users never receive portal chrome (`children`). The 403 wall is
 * rendered by this gate, not by a "public" /forbidden route inside the shell.
 */
export function RolesGuard({
  allowedRoles,
  authAppUrl,
  apiBaseUrl,
  pathname,
  portalOrigins,
  publicPathPrefixes = [],
  onSignOut,
  children,
}: RolesGuardProps) {
  const [gate, setGate] = useState<Gate>(() => {
    if (typeof window !== 'undefined' && isClearSessionPath(pathname)) {
      clearAccessToken();
      return 'open';
    }
    return 'checking';
  });

  useLayoutEffect(() => {
    const loginHref = `${authAppUrl.replace(/\/$/u, '')}/login`;
    try {
      const channel = new BroadcastChannel(SESSION_LOGOUT_CHANNEL);
      channel.onmessage = () => {
        clearAccessToken();
        window.location.replace(loginHref);
      };
      return () => channel.close();
    } catch {
      return undefined;
    }
  }, [authAppUrl]);

  useLayoutEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      if (isClearSessionPath(pathname)) {
        clearAccessToken();
        if (!cancelled) setGate('open');
        return;
      }

      bootstrapAccessTokenFromUrl();
      const liveToken = await reconcileAccessTokenFromCookie(apiBaseUrl);
      if (cancelled) return;

      const accessToken = liveToken ?? getAccessToken();
      const decision = evaluatePortalAccess({
        pathname,
        publicPathPrefixes,
        accessToken,
        allowedRoles,
        authAppUrl,
        currentHref: window.location.href,
      });
      if (decision.action === 'login') {
        window.location.replace(decision.url);
        return;
      }
      if (decision.action === 'forbidden') {
        setGate('forbidden');
        return;
      }
      setGate('open');
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [allowedRoles, authAppUrl, apiBaseUrl, publicPathPrefixes, pathname]);

  if (gate === 'checking') {
    return (
      <p className="p-8 text-sm text-[var(--text-muted)]" role="status">
        Checking session…
      </p>
    );
  }

  if (gate === 'forbidden') {
    const role = getSessionRole();
    const homeHref = role ? (portalHomeForRole(role, portalOrigins) ?? undefined) : undefined;
    const loginHref = `${authAppUrl.replace(/\/$/u, '')}/login`;
    return <ForbiddenWall loginHref={loginHref} homeHref={homeHref} onSignOut={onSignOut} />;
  }

  return children;
}
