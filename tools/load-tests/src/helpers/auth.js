/**
 * Auth flow against api-core directly (protocol-level — see README "browser
 * vs protocol testing"). Mirrors apps/api-core/src/modules/auth/auth.service.ts:
 * POST /auth/login returns { accessToken, tokenType, expiresInSeconds } and
 * sets the refresh token as an httpOnly cookie; k6's per-VU cookie jar carries
 * that cookie automatically into a later refresh() call on the same VU.
 */
import http from 'k6/http';
import { check } from 'k6';
import { API_PREFIX, urls } from '../config/index.js';
import { loginLatency } from './metrics.js';

export function login(email, password) {
  const res = http.post(
    `${urls.api}${API_PREFIX}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_login' } },
  );
  loginLatency.add(res.timings.duration);

  const ok = check(res, {
    'login: 200': (r) => r.status === 200,
    'login: has accessToken': (r) => {
      try {
        return typeof JSON.parse(r.body).accessToken === 'string';
      } catch {
        return false;
      }
    },
  });
  if (!ok) return null;

  const body = JSON.parse(res.body);
  return { accessToken: body.accessToken, expiresInSeconds: body.expiresInSeconds };
}

/** Rotates the access token using the refresh cookie already in this VU's cookie jar. */
export function refresh() {
  const res = http.post(`${urls.api}${API_PREFIX}/auth/refresh`, null, {
    tags: { name: 'auth_refresh' },
  });
  loginLatency.add(res.timings.duration);
  if (res.status !== 200) return null;
  try {
    return { accessToken: JSON.parse(res.body).accessToken };
  } catch {
    return null;
  }
}

export function logout(accessToken) {
  const res = http.post(`${urls.api}${API_PREFIX}/auth/logout`, null, {
    headers: { Authorization: `Bearer ${accessToken}` },
    tags: { name: 'auth_logout' },
  });
  check(res, { 'logout: 204': (r) => r.status === 204 });
  return res;
}
