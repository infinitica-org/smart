import { describe, expect, it } from 'vitest';
import {
  auth0ConnectionFor,
  buildAuthorizeUrl,
  displayNameFromProfile,
  emailDomain,
  generatePkce,
  isAllowedRedirectUri,
  isSocialSsoProvider,
  oauthStateKey,
  resolveAuth0Settings,
  stripAuth0Scheme,
} from './auth.oauth.js';

describe('resolveAuth0Settings', () => {
  it('returns null when any credential is missing', () => {
    expect(resolveAuth0Settings({})).toBeNull();
    expect(
      resolveAuth0Settings({ AUTH0_DOMAIN: 'tenant.auth0.com', AUTH0_CLIENT_ID: 'abc' }),
    ).toBeNull();
  });

  it('strips https:// from the tenant domain', () => {
    const settings = resolveAuth0Settings({
      AUTH0_DOMAIN: 'https://tenant.auth0.com/',
      AUTH0_CLIENT_ID: 'client',
      AUTH0_CLIENT_SECRET: 'secret',
    });
    expect(settings?.domain).toBe('tenant.auth0.com');
  });
});

describe('social SSO providers', () => {
  it('maps Google and GitHub onto Auth0 connections and rejects SAML', () => {
    expect(isSocialSsoProvider('GOOGLE')).toBe(true);
    expect(isSocialSsoProvider('GITHUB')).toBe(true);
    expect(isSocialSsoProvider('SAML')).toBe(false);
    expect(auth0ConnectionFor('GOOGLE')).toBe('google-oauth2');
    expect(auth0ConnectionFor('GITHUB')).toBe('github');
    expect(auth0ConnectionFor('SAML')).toBeUndefined();
  });
});

describe('isAllowedRedirectUri', () => {
  const origins = 'http://localhost:3001,http://localhost:3002';

  it('accepts portal /auth/callback URLs on allowlisted origins', () => {
    expect(isAllowedRedirectUri('http://localhost:3001/auth/callback', origins)).toBe(true);
  });

  it('rejects open redirects', () => {
    expect(isAllowedRedirectUri('http://evil.example/auth/callback', origins)).toBe(false);
    expect(isAllowedRedirectUri('http://localhost:3001/elsewhere', origins)).toBe(false);
    expect(isAllowedRedirectUri('not-a-url', origins)).toBe(false);
  });
});

describe('buildAuthorizeUrl', () => {
  it('builds an OIDC authorize URL with PKCE', () => {
    const url = new URL(
      buildAuthorizeUrl({
        domain: 'tenant.auth0.com',
        clientId: 'abc',
        redirectUri: 'http://localhost:3001/auth/callback',
        state: 'st',
        nonce: 'n',
        codeChallenge: 'ch',
        connection: 'google-oauth2',
      }),
    );
    expect(url.origin).toBe('https://tenant.auth0.com');
    expect(url.pathname).toBe('/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('connection')).toBe('google-oauth2');
    expect(url.searchParams.get('scope')).toContain('openid');
  });
});

describe('helpers', () => {
  it('derives the email domain and a display name', () => {
    expect(emailDomain('Student@PSGTECH.ac.in')).toBe('psgtech.ac.in');
    expect(emailDomain('bad')).toBeUndefined();
    expect(displayNameFromProfile({ name: 'Ada', email: 'ada@x.test' }, 'ada@x.test')).toBe('Ada');
    expect(displayNameFromProfile({ email: 'ada@x.test' }, 'ada@x.test')).toBe('ada@x.test');
  });

  it('generates PKCE verifier/challenge pairs and redis keys', () => {
    const pkce = generatePkce();
    expect(pkce.verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pkce.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pkce.verifier).not.toBe(pkce.challenge);
    expect(oauthStateKey('abc')).toBe('auth:oauth:state:abc');
    expect(stripAuth0Scheme('https://a.auth0.com')).toBe('a.auth0.com');
  });
});
