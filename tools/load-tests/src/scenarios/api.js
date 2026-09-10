/**
 * Authenticated API-read traffic: a spread of real, discovered GET endpoints
 * a logged-in student's dashboard actually calls (profile, notifications,
 * certificates, results) — not just one endpoint hit in a loop.
 */
import { sleep } from 'k6';
import { API_PREFIX, urls } from '../config/index.js';
import { login } from '../helpers/auth.js';
import { timedGet, authHeaders, thinkTime } from '../helpers/http.js';
import { apiLatency } from '../helpers/metrics.js';

export function apiReadsScenario(user) {
  const session = login(user.email, user.password);
  if (!session) return;
  const headers = authHeaders(session.accessToken);

  timedGet(`${urls.api}${API_PREFIX}/users/me`, apiLatency, 'api_users_me', { headers });
  sleep(thinkTime(0.2, 0.8));

  timedGet(`${urls.api}${API_PREFIX}/me/notifications`, apiLatency, 'api_notifications', {
    headers,
  });
  sleep(thinkTime(0.2, 0.8));

  timedGet(`${urls.api}${API_PREFIX}/certificates/mine`, apiLatency, 'api_certificates_mine', {
    headers,
  });
  sleep(thinkTime(0.2, 0.8));

  timedGet(`${urls.api}${API_PREFIX}/me/applications`, apiLatency, 'api_my_applications', {
    headers,
  });
  sleep(thinkTime(0.2, 0.8));
}
