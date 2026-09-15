import type { HttpException } from '@nestjs/common';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { RATE_LIMIT_HEADERS } from '@smart/contracts';
import {
  RateLimitInterceptor,
  matchContractRoute,
  resolveRateLimitIdentity,
} from '../../common/interceptors/rate-limit.interceptor.js';
import { RateLimitService, failOpenOnRedisError } from './rate-limit.service.js';

const attemptId = '11111111-1111-4111-8111-111111111111';

describe('route matching', () => {
  it.each([
    ['GET', '/api/v1/catalog/tracks/TECH_FULLSTACK', 'role.public'],
    ['GET', '/api/v1/catalog/tracks?active=true', 'role.public'],
    ['GET', '/health', undefined],
    ['POST', '/api/v1/catalog/tracks', undefined],
    ['GET', '/api/v1/catalog/tracks/one/extra', undefined],
    ['GET', '/api/v1/users/me/work-experiences/ops-dashboard', 'role.placementStaff'],
    [
      'GET',
      '/api/v1/users/me/work-experiences/55555555-5555-4555-8555-555555555555',
      'role.student',
    ],
  ])('%s %s resolves to %s', (method, url, policy) => {
    expect(matchContractRoute(method, url)?.rateLimit).toBe(policy);
  });
});

describe('identity resolution', () => {
  it.each([
    ['IP', { ip: '1.2.3.4' }, '1.2.3.4'],
    ['IP', {}, 'anon'],
    ['USER', { user: { sub: 'u1' } }, 'u1'],
    ['USER', { ip: '1.2.3.4' }, '1.2.3.4'],
    ['ATTEMPT', { params: { attemptId: 'a1' } }, 'a1'],
    ['ATTEMPT', { params: { id: 'a2' } }, 'a2'],
    ['ATTEMPT', { body: { attemptId: 'a3' } }, 'a3'],
    ['ATTEMPT', { user: { sub: 'u1' } }, 'u1'],
    ['INSTITUTION', { user: { inst: 'i1' } }, 'i1'],
    ['INSTITUTION', { ip: '1.2.3.4' }, '1.2.3.4'],
    ['SERVICE_WORKER', {}, 'gateway'],
  ])('%s resolves the documented precedence', (scope, request, expected) => {
    expect(resolveRateLimitIdentity(scope as never, request as never)).toBe(expected);
  });

  it('uses the first API key, truncates it, and falls back when missing', () => {
    const longKey = 'a'.repeat(40);
    expect(
      resolveRateLimitIdentity('API_KEY', {
        headers: { 'x-smart-api-key': [longKey] },
      } as never),
    ).toBe(longKey.slice(0, 32));
    expect(resolveRateLimitIdentity('API_KEY', { headers: {} } as never)).toBe('anon');
  });
});

describe('RateLimitService', () => {
  it('allows the window budget, then denies and enqueues an exceeded event', async () => {
    let hits = 0;
    const redis = {
      eval: vi.fn(async (_script: string, _n: number, key: string) => {
        if (key.endsWith(':burst')) return [0, 0, 60_000];
        hits += 1;
        return hits <= 10 ? [1, hits, 0] : [0, 10, 45_000];
      }),
    };
    const outbox = { enqueueEnvelope: vi.fn(async () => undefined) };
    const service = new RateLimitService(redis as never, outbox as never);

    for (let index = 0; index < 10; index += 1) {
      await expect(
        service.consume('auth.login', '1.2.3.4', 'PUBLIC', '/auth/login'),
      ).resolves.toMatchObject({ allowed: true });
    }
    const denied = await service.consume('auth.login', '1.2.3.4', 'PUBLIC', '/auth/login');
    expect(denied).toMatchObject({ allowed: false, count: 10, retryAfterSeconds: 60 });
    expect(outbox.enqueueEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'smart.rate_limit.exceeded',
        partitionKey: '1.2.3.4',
      }),
    );
  });

  it('uses burst capacity when the sliding window is full', async () => {
    const redis = {
      eval: vi.fn(async (_script: string, _n: number, key: string) =>
        key.endsWith(':burst') ? [1, 2, 0] : [0, 10, 30_000],
      ),
    };
    const outbox = { enqueueEnvelope: vi.fn() };
    const decision = await new RateLimitService(redis as never, outbox as never).consume(
      'auth.login',
      '1.2.3.4',
      'PUBLIC',
      '/auth/login',
    );
    expect(decision).toMatchObject({ allowed: true, retryAfterSeconds: 0 });
    expect(outbox.enqueueEnvelope).not.toHaveBeenCalled();
  });

  it('preserves 429 when outbox fails and includes a valid attempt id', async () => {
    const redis = {
      eval: vi.fn(async (_script: string, _n: number, key: string) =>
        key.endsWith(':burst') ? [0, 0, 40_000] : [0, 10, 30_000],
      ),
    };
    const outbox = {
      enqueueEnvelope: vi.fn(async () => Promise.reject(new Error('broker down'))),
    };
    const decision = await new RateLimitService(redis as never, outbox as never).consume(
      'assessment.submitL1',
      attemptId,
      'STUDENT',
      '/assessment/submit-l1',
      attemptId,
    );
    expect(decision.allowed).toBe(false);
    expect(outbox.enqueueEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'smart.rate_limit.exceeded',
        partitionKey: attemptId,
      }),
    );
  });

  it('fails open on Redis errors outside production and fails closed in production', async () => {
    const redis = { eval: vi.fn(async () => Promise.reject(new Error('redis down'))) };
    const service = new RateLimitService(redis as never, { enqueueEnvelope: vi.fn() } as never);
    await expect(
      service.consume('auth.login', '1.2.3.4', 'PUBLIC', '/auth/login'),
    ).resolves.toMatchObject({ allowed: true, count: 0, retryAfterSeconds: 0 });
    expect(failOpenOnRedisError('development', 'redis://127.0.0.1:6380')).toBe(true);
    expect(failOpenOnRedisError('test', 'redis://127.0.0.1:6380')).toBe(true);
    expect(failOpenOnRedisError('production', 'redis://redis:6379')).toBe(false);
    expect(failOpenOnRedisError('production', 'redis://127.0.0.1:6380')).toBe(true);
  });
});

describe('RateLimitInterceptor', () => {
  it('bypasses unregistered routes', async () => {
    const service = { consume: vi.fn() };
    const result = of({ ok: true });
    const interceptor = new RateLimitInterceptor(service as never);
    await expect(interceptor.intercept(context('/health'), { handle: () => result })).resolves.toBe(
      result,
    );
    expect(service.consume).not.toHaveBeenCalled();
  });

  it.each([
    [true, 2, undefined],
    [false, 10, '42'],
  ])(
    'sets headers for allowed=%s and only adds Retry-After on deny',
    async (allowed, count, retry) => {
      const headers: Record<string, string> = {};
      const service = {
        consume: vi.fn(async () => ({
          allowed,
          count,
          limit: 10,
          retryAfterSeconds: 42,
          resetAtEpochSeconds: 1_771_574_400,
          policy: { windowSeconds: 60 },
        })),
      };
      const interceptor = new RateLimitInterceptor(service as never);
      const run = interceptor.intercept(context('/api/v1/auth/login', headers), {
        handle: () => of({ ok: true }),
      });

      if (allowed) await expect(run).resolves.toBeDefined();
      else await expect(run).rejects.toMatchObject<HttpException>({ status: 429 });
      expect(headers).toMatchObject({
        [RATE_LIMIT_HEADERS.limit]: '10',
        [RATE_LIMIT_HEADERS.remaining]: String(10 - count),
        [RATE_LIMIT_HEADERS.reset]: '1771574400',
      });
      expect(headers[RATE_LIMIT_HEADERS.retryAfter]).toBe(retry);
    },
  );
});

function context(url: string, headers: Record<string, string> = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: url === '/health' ? 'GET' : 'POST', url, ip: '1.2.3.4' }),
      getResponse: () => ({
        header: (name: string, value: string) => {
          headers[name] = value;
        },
      }),
    }),
  } as never;
}
