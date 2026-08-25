import { describe, expect, it } from 'vitest';
import {
  AiCircuitBreaker,
  CircuitBreakerOpenError,
  isCircuitBreakerTriggerError,
} from './circuit-breaker.js';

describe('AiCircuitBreaker (Unit Tests)', () => {
  it('identifies 429, 5xx, and timeout errors as triggers', () => {
    expect(isCircuitBreakerTriggerError({ status: 429 })).toBe(true);
    expect(isCircuitBreakerTriggerError({ statusCode: 503 })).toBe(true);
    expect(isCircuitBreakerTriggerError(new Error('Rate limit exceeded (429)'))).toBe(true);
    expect(isCircuitBreakerTriggerError(new Error('502 Bad Gateway'))).toBe(true);
    expect(isCircuitBreakerTriggerError(new Error('Request timed out'))).toBe(true);
    expect(isCircuitBreakerTriggerError(new Error('fetch failed'))).toBe(false);
    expect(isCircuitBreakerTriggerError(new CircuitBreakerOpenError('ANTHROPIC'))).toBe(true);
    expect(isCircuitBreakerTriggerError(new Error('Invalid schema'))).toBe(false);
  });

  it('trips from CLOSED to OPEN after reaching failure threshold (AC 1)', async () => {
    const cb = new AiCircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 50 });
    expect(cb.getState('ANTHROPIC')).toBe('CLOSED');
    expect(cb.isCallAllowed('ANTHROPIC')).toBe(true);

    const rateLimitError = new Error('HTTP 429 Too Many Requests');
    await expect(
      cb.execute('ANTHROPIC', async () => {
        throw rateLimitError;
      }),
    ).rejects.toThrow('HTTP 429 Too Many Requests');

    expect(cb.getState('ANTHROPIC')).toBe('CLOSED');

    await expect(
      cb.execute('ANTHROPIC', async () => {
        throw rateLimitError;
      }),
    ).rejects.toThrow('HTTP 429 Too Many Requests');

    expect(cb.getState('ANTHROPIC')).toBe('OPEN');
    expect(cb.isCallAllowed('ANTHROPIC')).toBe(false);

    await expect(cb.execute('ANTHROPIC', async () => 'success')).rejects.toThrow(
      CircuitBreakerOpenError,
    );
  });

  it('transitions to HALF_OPEN after cooldown and recovers on successful probe', async () => {
    const cb = new AiCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 20 });
    cb.trip('ANTHROPIC');
    expect(cb.getState('ANTHROPIC')).toBe('OPEN');

    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(cb.getState('ANTHROPIC')).toBe('HALF_OPEN');
    expect(cb.isCallAllowed('ANTHROPIC')).toBe(true);

    const res = await cb.execute('ANTHROPIC', async () => 'ok');
    expect(res).toBe('ok');
    expect(cb.getState('ANTHROPIC')).toBe('CLOSED');
  });

  it('trips back to OPEN if probe in HALF_OPEN fails', async () => {
    const cb = new AiCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 20 });
    cb.trip('ANTHROPIC');

    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(cb.getState('ANTHROPIC')).toBe('HALF_OPEN');

    await expect(
      cb.execute('ANTHROPIC', async () => {
        throw new Error('500 Internal Server Error');
      }),
    ).rejects.toThrow('500 Internal Server Error');

    expect(cb.getState('ANTHROPIC')).toBe('OPEN');
  });

  it('enforces request timeout', async () => {
    const cb = new AiCircuitBreaker({ failureThreshold: 1, requestTimeoutMs: 20 });
    await expect(
      cb.execute('ANTHROPIC', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'too late';
      }),
    ).rejects.toThrow(/timed out/i);

    expect(cb.getState('ANTHROPIC')).toBe('OPEN');
  });
});
