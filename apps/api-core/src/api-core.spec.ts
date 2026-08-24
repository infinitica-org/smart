import { describe, expect, it } from 'vitest';
import { HealthStatusSchema } from '@smart/contracts';
import { matchContractRoute } from './common/interceptors/rate-limit.interceptor.js';
import { loadEnv } from './platform/config/env.js';
import { HealthController } from './platform/health/health.controller.js';

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
  it('loads with local defaults including Redis host port 6380', () => {
    const env = loadEnv({ JWT_SECRET: 'local-dev-jwt-secret-change-me-now!!' });
    expect(env.PORT).toBe(3000);
    expect(env.REDIS_URL).toContain(':6380');
  });
});

describe('health probes', () => {
  it('liveness returns the contract HealthStatus shape', () => {
    const controller = new HealthController(
      { $queryRaw: async () => 1 } as never,
      { status: 'ready', connect: async () => undefined, ping: async () => 'PONG' } as never,
    );
    const body = controller.liveness();
    expect(HealthStatusSchema.parse(body).status).toBe('ok');
    expect(body.checks.process?.status).toBe('up');
  });
});
