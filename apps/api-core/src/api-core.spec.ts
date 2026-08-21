import { describe, expect, it } from 'vitest';
import { matchContractRoute } from './common/interceptors/rate-limit.interceptor.js';
import { loadEnv } from './platform/config/env.js';

describe('rate-limit route matching', () => {
  it('maps a parameterised path onto the contract route', () => {
    const route = matchContractRoute('GET', '/api/v1/catalog/tracks/TECH_FULLSTACK');
    expect(route?.rateLimit).toBe('role.public');
    expect(route?.owner).toBe('Vedika G');
  });

  it('ignores health probes so they are never throttled as product traffic', () => {
    expect(matchContractRoute('GET', '/health')).toBeUndefined();
  });
});

describe('env', () => {
  it('loads with local defaults', () => {
    const env = loadEnv({ JWT_SECRET: 'local-dev-jwt-secret-change-me-now!!' });
    expect(env.PORT).toBe(3000);
  });
});
