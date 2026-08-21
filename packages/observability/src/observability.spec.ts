import { describe, expect, it } from 'vitest';
import {
  CORRELATION_HEADER,
  REDACTED_PATHS,
  REDACTION_PLACEHOLDER,
  collectMetrics,
  getContext,
  isValidCorrelationId,
  maskEmail,
  newCorrelationId,
  redactObject,
  resetMetrics,
  resolveCorrelationId,
  runWithContext,
  tierDistribution,
  rateLimitRejections,
} from './index.js';

/**
 * Observability tests.
 *
 * Redaction and correlation are tested because both fail silently. A logger that
 * stops redacting still logs; the damage only surfaces when someone reads the
 * log store. So the guarantees are pinned here.
 */

describe('redaction', () => {
  it('redacts credentials and assessment content, not correlation fields', () => {
    const redacted = redactObject({
      correlationId: 'c-1',
      userId: 'u-1',
      password: 'hunter2',
      accessToken: 'ey.jwt',
      apiKey: 'sk-live-123',
      answer: 'B',
      answerKey: 'B',
      candidateResponse: 'I used Postgres because...',
      email: 'student@college.edu',
    }) as Record<string, unknown>;

    expect(redacted.correlationId).toBe('c-1');
    expect(redacted.userId).toBe('u-1');
    for (const key of [
      'password',
      'accessToken',
      'apiKey',
      'answer',
      'answerKey',
      'candidateResponse',
      'email',
    ]) {
      expect(redacted[key], key).toBe(REDACTION_PLACEHOLDER);
    }
  });

  it('redacts inside nested structures and arrays', () => {
    const redacted = redactObject({
      responses: [{ itemId: 'i-1', answer: 'C' }],
      meta: { nested: { password: 'x' } },
    }) as { responses: { answer: string }[]; meta: { nested: { password: string } } };

    expect(redacted.responses[0]?.answer).toBe(REDACTION_PLACEHOLDER);
    expect(redacted.meta.nested.password).toBe(REDACTION_PLACEHOLDER);
  });

  it('stops at a depth limit so a pathological payload cannot hang a log call', () => {
    let deep: Record<string, unknown> = { answer: 'leaf' };
    for (let i = 0; i < 12; i += 1) deep = { level: deep };

    expect(() => redactObject(deep)).not.toThrow();
    expect(JSON.stringify(redactObject(deep))).toContain('[max-depth]');
  });

  it('covers the credential paths pino needs, including header forms', () => {
    // A missing header path is a JWT in the log store.
    for (const path of [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'refreshToken',
    ]) {
      expect(REDACTED_PATHS, path).toContain(path);
    }
  });

  it('masks an email rather than exposing it when support genuinely needs one', () => {
    expect(maskEmail('student@college.edu')).toBe('s***@college.edu');
    expect(maskEmail('not-an-email')).toBe(REDACTION_PLACEHOLDER);
  });
});

describe('correlation ids', () => {
  it('accepts a valid inbound id so a trace is not broken at the boundary', () => {
    const inbound = newCorrelationId();
    expect(resolveCorrelationId(inbound)).toBe(inbound);
  });

  it('rejects client-supplied junk instead of putting it in metric labels', () => {
    // Arbitrary client strings in labels are a cardinality bomb and a log-forgery vector.
    const forged = resolveCorrelationId('"; DROP TABLE attempts; --');
    expect(forged).not.toBe('"; DROP TABLE attempts; --');
    expect(isValidCorrelationId(forged)).toBe(true);
  });

  it('mints an id when none arrives', () => {
    expect(isValidCorrelationId(resolveCorrelationId(undefined))).toBe(true);
  });

  it('uses the header name the gateway and web clients agree on', () => {
    expect(CORRELATION_HEADER).toBe('x-correlation-id');
  });
});

describe('ambient log context', () => {
  it('makes correlation available to code that was never passed it', () => {
    // This is what lets a Kafka consumer log the originating request's id.
    const result = runWithContext({ correlationId: 'abc', module: 'evaluation' }, () => {
      const nested = (): string | undefined => getContext()?.correlationId;
      return nested();
    });

    expect(result).toBe('abc');
    expect(getContext()).toBeUndefined();
  });
});

describe('metric registry', () => {
  it('exposes every metric under the smart_ prefix', async () => {
    resetMetrics();
    rateLimitRejections.inc({ policy: 'STUDENT', role: 'STUDENT', route: '/v1/attempts' });
    tierDistribution.set({ track_code: 'TECH_FULLSTACK', level_number: '1', tier: 'GOLD' }, 0.18);

    const scraped = await collectMetrics();

    expect(scraped).toContain('smart_rate_limit_rejections_total');
    expect(scraped).toContain('smart_tier_distribution_ratio');
    // A metric outside the prefix breaks the Grafana dashboards' selectors.
    for (const line of scraped.split('\n').filter((l) => l.startsWith('# TYPE'))) {
      expect(line, line).toMatch(/^# TYPE smart_/u);
    }
  });

  it('keeps the kappa circuit-breaker gauges registered', async () => {
    const scraped = await collectMetrics();
    expect(scraped).toContain('smart_inter_rater_kappa');
    expect(scraped).toContain('smart_automated_scoring_paused');
  });
});
