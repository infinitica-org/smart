import {
  API_PREFIX,
  AuthTokenResponseSchema,
  UserRoleSchema,
  type UserRole,
} from '@smart/contracts';

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

/** Hidden iframe target so Sign out on one portal can wipe leftover JWTs on the others. */
export const CLEAR_SESSION_PATH = '/auth/clear-session' as const;

export const SESSION_LOGOUT_CHANNEL = 'smart.session.logout' as const;

export function isClearSessionPath(pathname: string): boolean {
  return pathname === CLEAR_SESSION_PATH || pathname.startsWith(`${CLEAR_SESSION_PATH}/`);
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
 * Full portal gate used by RolesGuard: session + role, then public-path exception.
 *
 * Role is read from the signed JWT payload only. Never persist a separate
 * `role` key in localStorage/sessionStorage — that is trivially writable and
 * would let a student paint an admin shell. The API still verifies the
 * signature; this decode is a UX lock, not a substitute for RolesGuard.
 *
 * Public prefixes (`/login`, `/auth`, …) must not share an authenticated
 * chrome layout. `/forbidden` is not public: a mismatch must never `open`.
 */
export function evaluatePortalAccess(input: {
  pathname: string;
  publicPathPrefixes: readonly string[];
  accessToken: string | null;
  allowedRoles: readonly UserRole[];
  authAppUrl: string;
  currentHref: string;
}): PortalGateDecision {
  const publicPath = isPublicPortalPath(input.pathname, input.publicPathPrefixes);
  const role = input.accessToken ? decodeAccessTokenRole(input.accessToken) : null;

  let action: PortalGateDecision['action'];
  if (!input.accessToken) {
    action = publicPath ? 'open' : 'login';
  } else if (!role) {
    action = publicPath ? 'open' : 'login';
  } else if (!roleAllowsPortal(role, input.allowedRoles)) {
    action = 'forbidden';
  } else {
    action = 'open';
  }

  if (action === 'login') {
    return { action: 'login', url: buildLoginUrl(input.authAppUrl, input.currentHref) };
  }
  return { action };
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

function originOf(url: string): string {
  return new URL(url).origin;
}

function notifySameOriginTabsToLogout(): void {
  try {
    const channel = new BroadcastChannel(SESSION_LOGOUT_CHANNEL);
    channel.postMessage({ type: 'logout' });
    channel.close();
  } catch {
    // BroadcastChannel is unavailable in some privacy modes; local clear still runs.
  }
}

function clearForeignOriginSession(origin: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.display = 'none';
    const finish = (): void => {
      iframe.remove();
      resolve();
    };
    iframe.addEventListener('load', finish, { once: true });
    iframe.addEventListener('error', finish, { once: true });
    window.setTimeout(finish, 2500);
    iframe.src = `${origin}${CLEAR_SESSION_PATH}`;
    document.body.appendChild(iframe);
  });
}

/**
 * Revoke the refresh-cookie family, wipe this origin, then fan out a clear to
 * the other portal origins (ports do not share localStorage).
 */
export async function signOutAndRedirect(options: {
  logout: () => Promise<void>;
  authAppUrl: string;
  portalOrigins: PortalOrigins;
}): Promise<void> {
  try {
    await options.logout();
  } catch {
    // Best-effort server revoke; always clear the local session.
  }
  clearAccessToken();
  notifySameOriginTabsToLogout();
  const here = window.location.origin;
  const foreign = [
    originOf(options.portalOrigins.student),
    originOf(options.portalOrigins.tpo),
    originOf(options.portalOrigins.admin),
    originOf(options.authAppUrl),
  ].filter((origin, index, all) => origin !== here && all.indexOf(origin) === index);
  await Promise.all(foreign.map((origin) => clearForeignOriginSession(origin)));
  const base = options.authAppUrl.replace(/\/$/u, '');
  window.location.href = `${base}/login`;
}

/**
 * Replace a leftover per-origin JWT with the live HttpOnly refresh session.
 * Ports do not share localStorage; the cookie on the API origin is the truth.
 */
export async function reconcileAccessTokenFromCookie(apiBaseUrl: string): Promise<string | null> {
  if (!hasBrowserStorage()) return null;
  try {
    const res = await fetch(`${apiBaseUrl.replace(/\/$/u, '')}${API_PREFIX}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401 || res.status === 403) {
      clearAccessToken();
      return null;
    }
    if (!res.ok) return getAccessToken();
    const parsed = AuthTokenResponseSchema.safeParse(await res.json());
    if (!parsed.success) return getAccessToken();
    storeAccessToken(parsed.data.accessToken);
    return parsed.data.accessToken;
  } catch {
    return getAccessToken();
  }
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
