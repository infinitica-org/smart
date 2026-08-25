import { HttpException, HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { RATE_LIMIT_HEADERS } from '@smart/contracts';
import {
  RateLimitInterceptor,
  matchContractRoute,
  resolveRateLimitIdentity,
} from '../../common/interceptors/rate-limit.interceptor.js';
import { RateLimitService } from './rate-limit.service.js';

describe('matchContractRoute', () => {
  it('maps a parameterised path onto the contract route', () => {
    const route = matchContractRoute('GET', '/api/v1/catalog/tracks/TECH_FULLSTACK');
    expect(route?.rateLimit).toBe('role.public');
  });

  it('ignores health probes so they are never throttled as product traffic', () => {
    expect(matchContractRoute('GET', '/health')).toBeUndefined();
  });
});

describe('resolveRateLimitIdentity', () => {
  it('uses IP for auth.login and the user id when present', () => {
    expect(resolveRateLimitIdentity('IP', { ip: '203.0.113.9' } as never)).toBe('203.0.113.9');
    expect(
      resolveRateLimitIdentity('USER', { ip: '203.0.113.9', user: { sub: 'user-1' } } as never),
    ).toBe('user-1');
  });

  it('reads attempt, institution, and API key scopes from the request', () => {
    expect(
      resolveRateLimitIdentity('ATTEMPT', {
        params: { attemptId: 'att-1' },
        user: { sub: 'user-1' },
      } as never),
    ).toBe('att-1');
    expect(resolveRateLimitIdentity('INSTITUTION', { user: { inst: 'inst-1' } } as never)).toBe(
      'inst-1',
    );
    expect(
      resolveRateLimitIdentity('API_KEY', {
        headers: { 'x-smart-api-key': 'sk_live_abcdef' },
      } as never),
    ).toBe('sk_live_abcdef');
    expect(resolveRateLimitIdentity('SERVICE_WORKER', {} as never)).toBe('gateway');
  });
});

describe('RateLimitService flood', () => {
  it('returns 429 after the sliding-window budget is exhausted', async () => {
    let hits = 0;
    const redis = {
      eval: vi.fn(async (_script: string, _n: number, key: string) => {
        if (key.endsWith(':burst')) return [0, 0, 60_000];
        hits += 1;
        if (hits > 10) return [0, 10, 45_000];
        return [1, hits, 0];
      }),
    };
    const kafka = { emit: vi.fn(async () => undefined) };
    const service = new RateLimitService(redis as never, kafka as never);

    const allowed: boolean[] = [];
    for (let i = 0; i < 12; i += 1) {
      const decision = await service.consume('auth.login', '203.0.113.9', 'PUBLIC', '/auth/login');
      allowed.push(decision.allowed);
    }

    expect(allowed.filter(Boolean)).toHaveLength(10);
    expect(allowed[10]).toBe(false);
    expect(allowed[11]).toBe(false);
    const denied = await service.consume('auth.login', '203.0.113.9', 'PUBLIC', '/auth/login');
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
    expect(kafka.emit).toHaveBeenCalled();
  });

  it('lets the token-bucket burst through after the window is full', async () => {
    const redis = {
      eval: vi.fn(async (_script: string, _n: number, key: string) => {
        if (key.endsWith(':burst')) return [1, 2, 0];
        return [0, 10, 30_000];
      }),
    };
    const kafka = { emit: vi.fn(async () => undefined) };
    const service = new RateLimitService(redis as never, kafka as never);
    const decision = await service.consume('auth.login', '203.0.113.9', 'PUBLIC', '/auth/login');
    expect(decision.allowed).toBe(true);
    expect(kafka.emit).not.toHaveBeenCalled();
  });
});

describe('RateLimitInterceptor', () => {
  it('sets X-RateLimit-* headers and throws 429 with Retry-After', async () => {
    const headers: Record<string, string> = {};
    const service = {
      consume: vi.fn(async () => ({
        allowed: false,
        count: 10,
        limit: 10,
        retryAfterSeconds: 42,
        resetAtEpochSeconds: 1_771_574_400,
        policy: { windowSeconds: 60, limit: 10 },
      })),
    };
    const interceptor = new RateLimitInterceptor(service as unknown as RateLimitService);
    const reply = { header: (name: string, value: string) => (headers[name] = value) };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/api/v1/auth/login', ip: '203.0.113.9' }),
        getResponse: () => reply,
      }),
    };

    await expect(
      interceptor.intercept(context as never, { handle: () => of({}) }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(headers[RATE_LIMIT_HEADERS.limit]).toBe('10');
    expect(headers[RATE_LIMIT_HEADERS.remaining]).toBe('0');
    expect(headers[RATE_LIMIT_HEADERS.reset]).toBe('1771574400');
    expect(headers[RATE_LIMIT_HEADERS.retryAfter]).toBe('42');
    try {
      await interceptor.intercept(context as never, { handle: () => of({}) });
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const exception = error as HttpException;
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(exception.getResponse()).toMatchObject({
        error: 'rate_limit_exceeded',
        retryAfterSeconds: 42,
        limit: 10,
        window: '60s',
      });
    }
  });
});
