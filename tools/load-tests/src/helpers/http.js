/**
 * Thin wrapper around k6/http: every call records into a category Trend and
 * runs a baseline status check, so no scenario forgets to measure or check.
 */
import http from 'k6/http';
import { check } from 'k6';

function record(res, trend, label) {
  if (trend) trend.add(res.timings.duration);
  return check(res, { [`${label}: status < 400`]: (r) => r.status > 0 && r.status < 400 });
}

export function timedGet(url, trend, label, params = {}) {
  const res = http.get(url, { tags: { name: label }, ...params });
  record(res, trend, label);
  return res;
}

export function timedPost(url, body, trend, label, params = {}) {
  const res = http.post(url, body, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: label },
    ...params,
  });
  record(res, trend, label);
  return res;
}

export function timedPatch(url, body, trend, label, params = {}) {
  const res = http.patch(url, body, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: label },
    ...params,
  });
  record(res, trend, label);
  return res;
}

/** Uniform random think-time — avoids every VU hammering in perfect lockstep. */
export function thinkTime(minSeconds = 0.5, maxSeconds = 2) {
  return minSeconds + Math.random() * (maxSeconds - minSeconds);
}

export function authHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}
