/**
 * "Search" traffic.
 *
 * This repo has exactly one real free-text search endpoint discovered in the
 * route registry (packages/contracts/src/http/routes.ts) and the api-core
 * controller (institutions-tpo.controller.ts `listStudents`): the
 * TPO candidate-roster filter, `GET /api/v1/tpo/students?q=<term>`
 * (packages/contracts/src/dto/onboarding.dto.ts `ListInstitutionStudentsQuerySchema`).
 * There is no public catalog full-text-search endpoint — deliberately not
 * inventing one (per the task's "do not invent endpoints"). This scenario is
 * therefore TPO-role and authenticated, not anonymous.
 */
import { sleep } from 'k6';
import { API_PREFIX, tpoCredentials, urls } from '../config/index.js';
import { login } from '../helpers/auth.js';
import { timedGet, thinkTime } from '../helpers/http.js';
import { searchLatency } from '../helpers/metrics.js';

const SEARCH_TERMS = ['a', 'student', 'load', 'test', ''];

export function searchScenario() {
  const session = login(tpoCredentials.username, tpoCredentials.password);
  if (!session) return;

  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const qs = term ? `?q=${encodeURIComponent(term)}` : '';
  timedGet(`${urls.api}${API_PREFIX}/tpo/students${qs}`, searchLatency, 'search_tpo_students', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  sleep(thinkTime());
}
