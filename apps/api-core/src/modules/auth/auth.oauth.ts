import { createHash, randomBytes } from 'node:crypto';
import type { AuthProvider } from '@smart/contracts';

export const OAUTH_STATE_TTL_SECONDS = 600;

export interface Auth0Settings {
  readonly domain: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface OauthStatePayload {
  readonly redirectUri: string;
  readonly provider: AuthProvider;
  readonly codeVerifier: string;
  readonly nonce: string;
}

export function oauthStateKey(state: string): string {
  return `auth:oauth:state:${state}`;
}

export function resolveAuth0Settings(source: {
  AUTH0_DOMAIN?: string;
  AUTH0_CLIENT_ID?: string;
  AUTH0_CLIENT_SECRET?: string;
}): Auth0Settings | null {
  const domain = stripAuth0Scheme(source.AUTH0_DOMAIN?.trim() ?? '');
  const clientId = source.AUTH0_CLIENT_ID?.trim() ?? '';
  const clientSecret = source.AUTH0_CLIENT_SECRET?.trim() ?? '';
  if (!domain || !clientId || !clientSecret) return null;
  return { domain, clientId, clientSecret };
}

export function stripAuth0Scheme(domain: string): string {
  return domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function randomOauthString(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

export function isSocialSsoProvider(provider: AuthProvider): provider is 'GOOGLE' | 'GITHUB' {
  return provider === 'GOOGLE' || provider === 'GITHUB';
}

export function auth0ConnectionFor(provider: AuthProvider): string | undefined {
  if (provider === 'GOOGLE') return 'google-oauth2';
  if (provider === 'GITHUB') return 'github';
  return undefined;
}

export function isAllowedRedirectUri(redirectUri: string, corsOrigins: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (parsed.pathname !== '/auth/callback') return false;
  const allowed = corsOrigins.split(',').map((origin) => origin.trim());
  return allowed.includes(parsed.origin);
}

export function buildAuthorizeUrl(input: {
  domain: string;
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  connection?: string;
  loginHint?: string;
}): string {
  const url = new URL(`https://${input.domain}/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', input.state);
  url.searchParams.set('nonce', input.nonce);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (input.connection) url.searchParams.set('connection', input.connection);
  if (input.loginHint) url.searchParams.set('login_hint', input.loginHint);
  return url.toString();
}

export function emailDomain(email: string): string | undefined {
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return undefined;
  return email.slice(at + 1).toLowerCase();
}

export function displayNameFromProfile(
  profile: { name?: string; nickname?: string; email: string },
  fallbackEmail: string,
): string {
  const name = profile.name?.trim() || profile.nickname?.trim();
  return name && name.length > 0 ? name : fallbackEmail;
}
