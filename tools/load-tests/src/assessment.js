/**
 * Candidate-critical smoke load test.
 * Install k6 (https://k6.io) and run: k6 run src/assessment.js
 * Owner: Vishal V.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<200'],
  },
};

const BASE = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  const health = http.get(`${BASE}/health`);
  check(health, { 'health 200': (res) => res.status === 200 });
  const tracks = http.get(`${BASE}/api/v1/catalog/tracks`);
  check(tracks, { 'catalog 200': (res) => res.status === 200 });
  sleep(1);
}
