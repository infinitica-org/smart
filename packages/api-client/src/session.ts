/** Shared browser session key — all SMART portals read/write this. */
export const ACCESS_TOKEN_KEY = 'smart.accessToken' as const;

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
