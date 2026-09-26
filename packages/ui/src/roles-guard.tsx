'use client';

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
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
import { SmartLogo } from './components/smart-logo';
import { BrandLoadingScreen } from './components/brand-loading-screen';

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

/** Rotating splash copy shown while the session/role gate resolves — this is
 * usually on screen well under a second, so it's playful filler rather than
 * literal status reporting. */
const SESSION_CHECK_MESSAGES = [
  'Waking up your dashboard…',
  'Syncing your verified skills…',
  'Warming up SMART…',
  'Fetching your progress…',
  'Getting things ready…',
  'Almost there…',
] as const;

function SessionCheckMessage() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SESSION_CHECK_MESSAGES.length);
    }, 1400);
    return () => clearInterval(id);
  }, []);
  return <p className="text-sm text-[var(--text-muted)]">{SESSION_CHECK_MESSAGES[index]}</p>;
}

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
    return <BrandLoadingScreen message={<SessionCheckMessage />} />;
  }

  if (gate === 'forbidden') {
    const role = getSessionRole();
    const homeHref = role ? (portalHomeForRole(role, portalOrigins) ?? undefined) : undefined;
    const loginHref = `${authAppUrl.replace(/\/$/u, '')}/login`;
    return <ForbiddenWall loginHref={loginHref} homeHref={homeHref} onSignOut={onSignOut} />;
  }

  return children;
}
