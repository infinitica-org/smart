/**
 * Login -> one authenticated request -> logout. Exercises api-core's JWT +
 * rotating-refresh-token flow (apps/api-core/src/modules/auth/auth.service.ts)
 * directly at the protocol level.
 */
import { sleep } from 'k6';
import { API_PREFIX, urls } from '../config/index.js';
import { login, logout, refresh } from '../helpers/auth.js';
import { timedGet, thinkTime } from '../helpers/http.js';
import { apiLatency } from '../helpers/metrics.js';

export function authenticationScenario(user) {
  const session = login(user.email, user.password);
  if (!session) return; // login() already recorded the check failure
  sleep(thinkTime(0.2, 0.5));

  timedGet(`${urls.api}${API_PREFIX}/users/me`, apiLatency, 'auth_get_me', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  sleep(thinkTime(0.2, 0.5));

  // Access tokens are short-lived (15 min default) — a soak test genuinely
  // exercises the rotation path; a smoke/load test mostly exercises login.
  refresh();
  sleep(thinkTime(0.2, 0.5));

  logout(session.accessToken);
}
