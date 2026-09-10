import { describe, expect, it } from 'vitest';
import {
  buildLoginUrl,
  decodeAccessTokenRole,
  evaluatePortalAccess,
  isClearSessionPath,
  isPublicPortalPath,
  isSafeReturnTo,
  PORTAL_ROLES,
  portalHomeForRole,
  returnToForRole,
  roleAllowsPortal,
} from './session.js';

function jwtWithPayload(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf8')
    .toString('base64')
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/=+$/u, '');
  return `eyJhbGciOiJub25lIn0.${b64}.sig`;
}

const origins = {
  student: 'http://localhost:3001',
  tpo: 'http://localhost:3002',
  admin: 'http://localhost:3003',
};

describe('decodeAccessTokenRole', () => {
  it('reads role from issued tokens that omit iss/aud', () => {
    expect(
      decodeAccessTokenRole(
        jwtWithPayload({
          sub: '123e4567-e89b-12d3-a456-426614174000',
          role: 'INSTITUTION_ADMIN',
          inst: null,
          trk: [],
          fam: 'family-1',
          iat: 1_700_000_000,
          exp: 1_700_000_900,
        }),
      ),
    ).toBe('INSTITUTION_ADMIN');
  });

  it('rejects garbage JWTs', () => {
    expect(decodeAccessTokenRole('not-a-jwt')).toBeNull();
    expect(decodeAccessTokenRole(jwtWithPayload({ sub: 'x' }))).toBeNull();
  });
});

describe('portal role gates', () => {
  it('maps the four login roles onto the three authenticated portals', () => {
    expect(roleAllowsPortal('STUDENT', PORTAL_ROLES.student)).toBe(true);
    expect(roleAllowsPortal('SUPER_ADMIN', PORTAL_ROLES.student)).toBe(false);
    expect(roleAllowsPortal('INSTITUTION_ADMIN', PORTAL_ROLES.tpo)).toBe(true);
    expect(roleAllowsPortal('PLACEMENT_STAFF', PORTAL_ROLES.tpo)).toBe(true);
    expect(roleAllowsPortal('STUDENT', PORTAL_ROLES.tpo)).toBe(false);
    expect(roleAllowsPortal('SUPER_ADMIN', PORTAL_ROLES.admin)).toBe(true);
    expect(roleAllowsPortal('INSTITUTION_ADMIN', PORTAL_ROLES.admin)).toBe(false);
  });
});

describe('login redirect per role', () => {
  it('sends each role to its own portal home', () => {
    expect(portalHomeForRole('STUDENT', origins)).toBe('http://localhost:3001/dashboard');
    expect(portalHomeForRole('INSTITUTION_ADMIN', origins)).toBe('http://localhost:3002/dashboard');
    expect(portalHomeForRole('PLACEMENT_STAFF', origins)).toBe('http://localhost:3002/dashboard');
    expect(portalHomeForRole('SUPER_ADMIN', origins)).toBe('http://localhost:3003/admin');
  });

  it('ignores returnTo that points at a different portal', () => {
    expect(returnToForRole('INSTITUTION_ADMIN', 'http://localhost:3001/dashboard', origins)).toBe(
      'http://localhost:3002/dashboard',
    );
    expect(returnToForRole('INSTITUTION_ADMIN', 'http://localhost:3002/batches/abc', origins)).toBe(
      'http://localhost:3002/batches/abc',
    );
  });
});

describe('public paths and returnTo', () => {
  it('identifies the cross-origin session wipe path', () => {
    expect(isClearSessionPath('/auth/clear-session')).toBe(true);
    expect(isClearSessionPath('/auth/callback')).toBe(false);
  });

  it('treats login, invite, and forbidden as public prefixes', () => {
    expect(isPublicPortalPath('/login', ['/login', '/forbidden'])).toBe(true);
    expect(isPublicPortalPath('/forbidden', ['/forbidden'])).toBe(true);
    expect(isPublicPortalPath('/invite/abc', ['/invite'])).toBe(true);
    expect(isPublicPortalPath('/dashboard', ['/login', '/forbidden'])).toBe(false);
    expect(isPublicPortalPath('/login-extra', ['/login'])).toBe(false);
  });

  it('builds a login URL with returnTo and blocks open redirects', () => {
    expect(buildLoginUrl('http://localhost:3005', 'http://localhost:3001/dashboard')).toBe(
      'http://localhost:3005/login?returnTo=http%3A%2F%2Flocalhost%3A3001%2Fdashboard',
    );
    expect(
      isSafeReturnTo('http://localhost:3001/dashboard', [
        'http://localhost:3001',
        'http://localhost:3002',
      ]),
    ).toBe(true);
    expect(isSafeReturnTo('https://evil.example/phish', ['http://localhost:3001'])).toBe(false);
  });
});

describe('INF-03 session auth end-to-end (SSO excluded)', () => {
  const authAppUrl = 'http://localhost:3005';
  const publicPaths = ['/forbidden', '/login', '/auth'] as const;
  const issued = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    inst: null,
    trk: [],
    fam: 'family-1',
    iat: 1_700_000_000,
    exp: 1_700_000_900,
  };

  const studentToken = jwtWithPayload({ ...issued, role: 'STUDENT' });
  const tpoAdminToken = jwtWithPayload({ ...issued, role: 'INSTITUTION_ADMIN' });
  const placementToken = jwtWithPayload({ ...issued, role: 'PLACEMENT_STAFF' });
  const superAdminToken = jwtWithPayload({ ...issued, role: 'SUPER_ADMIN' });

  it('logs each of the four roles into the matching portal home', () => {
    expect(returnToForRole('STUDENT', null, origins)).toBe('http://localhost:3001/dashboard');
    expect(returnToForRole('INSTITUTION_ADMIN', 'http://localhost:3001/dashboard', origins)).toBe(
      'http://localhost:3002/dashboard',
    );
    expect(returnToForRole('PLACEMENT_STAFF', null, origins)).toBe(
      'http://localhost:3002/dashboard',
    );
    expect(returnToForRole('SUPER_ADMIN', 'http://localhost:3002/batches', origins)).toBe(
      'http://localhost:3003/admin',
    );
  });

  it('sends unauthenticated users from a protected route to login with returnTo', () => {
    expect(
      evaluatePortalAccess({
        pathname: '/batches',
        publicPathPrefixes: publicPaths,
        accessToken: null,
        allowedRoles: PORTAL_ROLES.tpo,
        authAppUrl,
        currentHref: 'http://localhost:3002/batches',
      }),
    ).toStrictEqual({
      action: 'login',
      url: 'http://localhost:3005/login?returnTo=http%3A%2F%2Flocalhost%3A3002%2Fbatches',
    });
  });

  it('opens the matching portal for each role and forbids a mismatch', () => {
    expect(
      evaluatePortalAccess({
        pathname: '/dashboard',
        publicPathPrefixes: publicPaths,
        accessToken: studentToken,
        allowedRoles: PORTAL_ROLES.student,
        authAppUrl,
        currentHref: 'http://localhost:3001/dashboard',
      }).action,
    ).toBe('open');
    expect(
      evaluatePortalAccess({
        pathname: '/batches',
        publicPathPrefixes: publicPaths,
        accessToken: tpoAdminToken,
        allowedRoles: PORTAL_ROLES.tpo,
        authAppUrl,
        currentHref: 'http://localhost:3002/batches',
      }).action,
    ).toBe('open');
    expect(
      evaluatePortalAccess({
        pathname: '/batches',
        publicPathPrefixes: publicPaths,
        accessToken: placementToken,
        allowedRoles: PORTAL_ROLES.tpo,
        authAppUrl,
        currentHref: 'http://localhost:3002/batches',
      }).action,
    ).toBe('open');
    expect(
      evaluatePortalAccess({
        pathname: '/admin/health',
        publicPathPrefixes: publicPaths,
        accessToken: superAdminToken,
        allowedRoles: PORTAL_ROLES.admin,
        authAppUrl,
        currentHref: 'http://localhost:3003/admin/health',
      }).action,
    ).toBe('open');
    expect(
      evaluatePortalAccess({
        pathname: '/dashboard',
        publicPathPrefixes: publicPaths,
        accessToken: tpoAdminToken,
        allowedRoles: PORTAL_ROLES.student,
        authAppUrl,
        currentHref: 'http://localhost:3001/dashboard',
      }),
    ).toStrictEqual({ action: 'forbidden' });
    expect(
      evaluatePortalAccess({
        pathname: '/admin/health',
        publicPathPrefixes: publicPaths,
        accessToken: studentToken,
        allowedRoles: PORTAL_ROLES.admin,
        authAppUrl,
        currentHref: 'http://localhost:3003/admin/health',
      }),
    ).toStrictEqual({ action: 'forbidden' });
  });

  it('does not treat a malformed token as a role mismatch', () => {
    expect(
      evaluatePortalAccess({
        pathname: '/batches',
        publicPathPrefixes: publicPaths,
        accessToken: 'not-a-jwt',
        allowedRoles: PORTAL_ROLES.tpo,
        authAppUrl,
        currentHref: 'http://localhost:3002/batches',
      }).action,
    ).toBe('login');
  });

  it('never opens a portal shell for a role mismatch, including /forbidden', () => {
    expect(
      evaluatePortalAccess({
        pathname: '/forbidden',
        publicPathPrefixes: publicPaths,
        accessToken: tpoAdminToken,
        allowedRoles: PORTAL_ROLES.student,
        authAppUrl,
        currentHref: 'http://localhost:3001/forbidden',
      }),
    ).toStrictEqual({ action: 'forbidden' });
    expect(
      evaluatePortalAccess({
        pathname: '/batches',
        publicPathPrefixes: publicPaths,
        accessToken: studentToken,
        allowedRoles: PORTAL_ROLES.tpo,
        authAppUrl,
        currentHref: 'http://localhost:3002/batches',
      }),
    ).toStrictEqual({ action: 'forbidden' });
  });

  it('still opens login/auth without a session so callbacks can run', () => {
    expect(
      evaluatePortalAccess({
        pathname: '/auth/callback',
        publicPathPrefixes: publicPaths,
        accessToken: null,
        allowedRoles: PORTAL_ROLES.student,
        authAppUrl,
        currentHref: 'http://localhost:3001/auth/callback',
      }).action,
    ).toBe('open');
  });
});
