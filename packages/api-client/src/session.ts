import { UserRoleSchema, type UserRole } from '@smart/contracts';

/** Shared browser session key — all SMART portals read/write this. */
export const ACCESS_TOKEN_KEY = 'smart.accessToken' as const;

/** Roles allowed on each authenticated microfrontend (mirrors api-core RolesGuard). */
export const PORTAL_ROLES = {
  student: ['STUDENT'],
  tpo: ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF'],
  admin: ['SUPER_ADMIN'],
} as const satisfies Record<string, readonly UserRole[]>;

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function getAccessToken(): string | null {
  if (!hasBrowserStorage()) return null;
  return (
    window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

export function storeAccessToken(accessToken: string): void {
  if (!hasBrowserStorage()) return;
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearAccessToken(): void {
  if (!hasBrowserStorage()) return;
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

/**
 * Portals run on separate origins in local dev (3001–3005). sessionStorage does
 * not cross ports, so web-auth passes the token once via ?accessToken= on redirect.
 */
export function bootstrapAccessTokenFromUrl(): boolean {
  if (!hasBrowserStorage()) return false;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('accessToken');
  if (!token) return false;

  storeAccessToken(token);
  params.delete('accessToken');
  const query = params.toString();
  const nextPath = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', nextPath);
  return true;
}

export function buildPortalRedirectUrl(baseUrl: string, accessToken: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('accessToken', accessToken);
  return url.toString();
}

function utf8FromBase64Url(segment: string): string {
  const padded = segment.replace(/-/gu, '+').replace(/_/gu, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(`${padded}${pad}`);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Client-side role read for portal guards. Issued tokens may omit contract
 * fields such as iss/aud — the API still verifies the signature.
 */
export function decodeAccessTokenRole(accessToken: string): UserRole | null {
  const parts = accessToken.split('.');
  const payload = parts[1];
  if (parts.length < 2 || !payload) return null;
  try {
    const parsed = UserRoleSchema.safeParse(
      (JSON.parse(utf8FromBase64Url(payload)) as { role?: unknown }).role,
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function getSessionRole(): UserRole | null {
  const token = getAccessToken();
  if (!token) return null;
  return decodeAccessTokenRole(token);
}

export type PortalOrigins = {
  student: string;
  tpo: string;
  admin: string;
};

export function portalHomeForRole(role: UserRole, origins: PortalOrigins): string | null {
  switch (role) {
    case 'STUDENT':
      return `${origins.student.replace(/\/$/u, '')}/dashboard`;
    case 'INSTITUTION_ADMIN':
    case 'PLACEMENT_STAFF':
      return `${origins.tpo.replace(/\/$/u, '')}/batches`;
    case 'SUPER_ADMIN':
      return `${origins.admin.replace(/\/$/u, '')}/admin/health`;
    default:
      return null;
  }
}

/** Deep-link only when returnTo is already on the portal that owns this role. */
export function returnToForRole(
  role: UserRole,
  returnTo: string | null,
  origins: PortalOrigins,
): string | null {
  const home = portalHomeForRole(role, origins);
  if (!home) return null;
  if (!returnTo || !isSafeReturnTo(returnTo, [home])) return home;
  return returnTo;
}

export function roleAllowsPortal(role: UserRole, allowed: readonly UserRole[]): boolean {
  return allowed.includes(role);
}

export type PortalGateDecision =
  | { readonly action: 'open' }
  | { readonly action: 'login'; readonly url: string }
  | { readonly action: 'forbidden' };

/**
 * Full portal gate used by RolesGuard: public path, session, then role match.
 */
export function evaluatePortalAccess(input: {
  pathname: string;
  publicPathPrefixes: readonly string[];
  accessToken: string | null;
  allowedRoles: readonly UserRole[];
  authAppUrl: string;
  currentHref: string;
}): PortalGateDecision {
  if (isPublicPortalPath(input.pathname, input.publicPathPrefixes)) {
    return { action: 'open' };
  }
  if (!input.accessToken) {
    return { action: 'login', url: buildLoginUrl(input.authAppUrl, input.currentHref) };
  }
  const role = decodeAccessTokenRole(input.accessToken);
  if (!role) {
    return { action: 'login', url: buildLoginUrl(input.authAppUrl, input.currentHref) };
  }
  if (!roleAllowsPortal(role, input.allowedRoles)) {
    return { action: 'forbidden' };
  }
  return { action: 'open' };
}

export function isPublicPortalPath(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function buildLoginUrl(authAppUrl: string, returnTo?: string): string {
  const base = authAppUrl.replace(/\/$/u, '');
  const url = new URL(`${base}/login`);
  if (returnTo) url.searchParams.set('returnTo', returnTo);
  return url.toString();
}

export function isSafeReturnTo(returnTo: string, allowedOrigins: readonly string[]): boolean {
  try {
    const target = new URL(returnTo);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return false;
    return allowedOrigins.some((origin) => new URL(origin).origin === target.origin);
  } catch {
    return false;
  }
}

/** Clears local tokens and sends the browser to the auth login page. */
export async function signOutAndRedirect(options: {
  logout: () => Promise<void>;
  authAppUrl: string;
}): Promise<void> {
  try {
    await options.logout();
  } catch {
    // Best-effort server revoke; always clear the local session.
  }
  clearAccessToken();
  const base = options.authAppUrl.replace(/\/$/u, '');
  window.location.href = `${base}/login`;
}

/**
 * Hook for SmartApiClient: rotate the access token using the HttpOnly refresh cookie.
 */
export function createRefreshAccessToken(refresh: () => Promise<{ accessToken: string }>) {
  return async (): Promise<string | null> => {
    try {
      const result = await refresh();
      storeAccessToken(result.accessToken);
      return result.accessToken;
    } catch {
      return null;
    }
  };
}
