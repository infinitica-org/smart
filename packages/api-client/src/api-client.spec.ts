import { BatchImportResultDtoSchema } from '@smart/contracts';
import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import {
  MAX_RATE_LIMIT_RETRIES,
  SmartApiClient,
  SmartApiError,
  SmartContractViolationError,
  SmartNetworkError,
  createSmartApi,
  invalidationGroups,
  isSmartApiError,
  queryKeys,
} from './index.js';

/**
 * API-client tests.
 *
 * Each test pins behaviour that, if it regressed, would look like a backend bug
 * from the outside — a logged-out candidate mid-assessment, a stale results page,
 * an untraceable error report.
 */

const schema = z.object({ ok: z.boolean() });

interface StubResponse {
  readonly status?: number;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
  readonly text?: string;
}

function stubFetch(responses: readonly StubResponse[]): {
  fetchImpl: typeof fetch;
  calls: { url: string; init: RequestInit }[];
} {
  const calls: { url: string; init: RequestInit }[] = [];
  let index = 0;

  const fetchImpl = ((url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const spec = responses[Math.min(index, responses.length - 1)] ?? {};
    index += 1;
    const status = spec.status ?? 200;
    const text = spec.text ?? JSON.stringify(spec.body ?? { ok: true });

    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(spec.headers ?? {}),
      text: () => Promise.resolve(text),
      blob: () => Promise.resolve(new Blob([text])),
      json: () => Promise.resolve(JSON.parse(text) as unknown),
    } as Response);
  }) as unknown as typeof fetch;

  return { fetchImpl, calls };
}

describe('request construction', () => {
  it('sends the bearer token, correlation id, and credentials for the refresh cookie', async () => {
    const { fetchImpl, calls } = stubFetch([{ body: { ok: true } }]);
    const client = new SmartApiClient({
      baseUrl: 'https://api.smart.test/',
      getAccessToken: () => 'token-123',
      getCorrelationId: () => 'corr-1',
      fetchImpl,
    });

    await client.get('/api/v1/users/me', { schema });

    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer token-123');
    expect(headers['x-correlation-id']).toBe('corr-1');
    // Without this the HttpOnly refresh cookie never travels and refresh fails.
    expect(calls[0]?.init.credentials).toBe('include');
  });

  it('omits the auth header on anonymous routes', async () => {
    // Public verification must not look like an authenticated request.
    const { fetchImpl, calls } = stubFetch([{ body: { ok: true } }]);
    const client = new SmartApiClient({
      baseUrl: 'https://api.smart.test',
      getAccessToken: () => 'token-123',
      fetchImpl,
    });

    await client.get('/api/v1/verify/abc', { schema, anonymous: true });

    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('sends multipart data without overriding the browser boundary header', async () => {
    const { fetchImpl, calls } = stubFetch([{ body: { ok: true } }]);
    const client = new SmartApiClient({
      baseUrl: 'https://api.smart.test',
      getAccessToken: () => 'token-123',
      fetchImpl,
    });
    const formData = new FormData();
    formData.append('file', new Blob(['synthetic']), 'candidates.csv');

    await client.postForm('/api/v1/tpo/import', formData, { schema });

    expect(calls[0]?.init.body).toBe(formData);
    expect((calls[0]?.init.headers as Record<string, string>)['content-type']).toBeUndefined();
    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBe(
      'Bearer token-123',
    );
  });

  it('sends a mapped dry-run import through the existing error and schema path', async () => {
    const preview = {
      imported: 0,
      skipped: 0,
      errors: [],
      headers: ['Student Name', 'Email Address'],
    };
    const { fetchImpl, calls } = stubFetch([{ body: preview }]);
    const client = new SmartApiClient({
      baseUrl: 'https://api.smart.test',
      getAccessToken: () => 'token-123',
      fetchImpl,
    });
    const formData = new FormData();
    formData.append('file', new Blob(['synthetic']), 'candidates.csv');
    formData.append(
      'mapping',
      JSON.stringify({ fullName: 'Student Name', email: 'Email Address' }),
    );

    await expect(
      client.postForm('/api/v1/tpo/batches/batch-1/members/import', formData, {
        query: { dryRun: true },
        schema: BatchImportResultDtoSchema,
      }),
    ).resolves.toMatchObject({ headers: ['Student Name', 'Email Address'] });
    expect(calls[0]?.url).toContain('dryRun=true');
    expect((calls[0]?.init.body as FormData).get('mapping')).toBe(
      JSON.stringify({ fullName: 'Student Name', email: 'Email Address' }),
    );
  });

  it('normalizes failed import responses instead of returning raw fetch bodies', async () => {
    const { fetchImpl } = stubFetch([
      {
        status: 400,
        body: {
          error: 'bad_request',
          message: 'Column mapping is invalid.',
          statusCode: 400,
        },
      },
    ]);
    const client = new SmartApiClient({ baseUrl: 'https://api.smart.test', fetchImpl });
    const error = await client
      .postForm('/api/v1/tpo/batches/batch-1/members/import', new FormData(), {
        schema: BatchImportResultDtoSchema,
      })
      .catch((caught: unknown) => caught);

    expect(isSmartApiError(error) && error.statusCode).toBe(400);
    expect(isSmartApiError(error) && error.message).toBe('Column mapping is invalid.');
  });

  it('downloads authenticated binary responses without JSON parsing', async () => {
    const { fetchImpl, calls } = stubFetch([{ text: 'synthetic-template' }]);
    const client = new SmartApiClient({
      baseUrl: 'https://api.smart.test',
      getAccessToken: () => 'token-123',
      fetchImpl,
    });

    const blob = await client.getBlob('/api/v1/tpo/template');

    expect(await blob.text()).toBe('synthetic-template');
    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBe(
      'Bearer token-123',
    );
  });

  it('reads the access token per request so a rotated token is picked up', async () => {
    // A captured token string starts failing 15 minutes after page load.
    const tokens = ['first', 'second'];
    const { fetchImpl, calls } = stubFetch([{ body: { ok: true } }, { body: { ok: true } }]);
    const client = new SmartApiClient({
      baseUrl: 'https://api.smart.test',
      getAccessToken: () => tokens.shift() ?? null,
      fetchImpl,
    });

    await client.get('/a', { schema });
    await client.get('/b', { schema });

    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBe('Bearer first');
    expect((calls[1]?.init.headers as Record<string, string>).authorization).toBe('Bearer second');
  });

  it('serialises query parameters and drops undefined ones', async () => {
    const { fetchImpl, calls } = stubFetch([{ body: { ok: true } }]);
    const client = new SmartApiClient({ baseUrl: 'https://api.smart.test', fetchImpl });

    await client.get('/api/v1/tpo/shortlist', {
      schema,
      query: { page: 2, tier: 'GOLD', cohortId: undefined },
    });

    expect(calls[0]?.url).toBe('https://api.smart.test/api/v1/tpo/shortlist?page=2&tier=GOLD');
  });
});

describe('token refresh', () => {
  it('refreshes once on 401 and replays the original request', async () => {
    const { fetchImpl, calls } = stubFetch([
      { status: 401, body: { error: 'token_expired', message: 'expired', statusCode: 401 } },
      { body: { ok: true } },
    ]);
    const refreshAccessToken = vi.fn().mockResolvedValue('fresh-token');
    const client = new SmartApiClient({
      baseUrl: 'https://api.smart.test',
      getAccessToken: () => 'stale',
      refreshAccessToken,
      fetchImpl,
    });

    await expect(client.get('/api/v1/users/me', { schema })).resolves.toStrictEqual({ ok: true });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  it('stores a rotated access token from createRefreshAccessToken', async () => {
    const { createRefreshAccessToken } = await import('./session.js');
    const refresh = createRefreshAccessToken(async () => ({ accessToken: 'rotated-access' }));
    const token = await refresh();
    expect(token).toBe('rotated-access');
  });

  it('shares one refresh across concurrent 401s', async () => {
    // Refresh tokens rotate. Parallel refreshes invalidate each other and log the
    // user out for the crime of loading a page with three panels on it.
    const { fetchImpl } = stubFetch([
      { status: 401, body: { error: 'token_expired', message: 'expired', statusCode: 401 } },
      { status: 401, body: { error: 'token_expired', message: 'expired', statusCode: 401 } },
      { status: 401, body: { error: 'token_expired', message: 'expired', statusCode: 401 } },
      { body: { ok: true } },
    ]);
    // A slow refresh keeps the promise in flight long enough for all three
    // requests to arrive at it.
    const refreshAccessToken = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          setTimeout(() => resolve('fresh'), 20);
        }),
    );
    const client = new SmartApiClient({
      baseUrl: 'https://api.smart.test',
      getAccessToken: () => 'stale',
      refreshAccessToken,
      fetchImpl,
    });

    await Promise.all([
      client.get('/a', { schema }),
      client.get('/b', { schema }),
      client.get('/c', { schema }),
    ]);

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('does not loop when the retried request is also unauthorised', async () => {
    const { fetchImpl, calls } = stubFetch([
      { status: 401, body: { error: 'token_expired', message: 'expired', statusCode: 401 } },
    ]);
    const onUnauthorized = vi.fn();
    const client = new SmartApiClient({
      baseUrl: 'https://api.smart.test',
      refreshAccessToken: () => Promise.resolve('fresh'),
      onUnauthorized,
      fetchImpl,
    });

    await expect(client.get('/a', { schema })).rejects.toBeInstanceOf(SmartApiError);
    expect(calls).toHaveLength(2);
  });

  it('signals the app to log out when refresh fails', async () => {
    const { fetchImpl } = stubFetch([
      { status: 401, body: { error: 'token_expired', message: 'expired', statusCode: 401 } },
    ]);
    const onUnauthorized = vi.fn();
    const client = new SmartApiClient({
      baseUrl: 'https://api.smart.test',
      refreshAccessToken: () => Promise.resolve(null),
      onUnauthorized,
      fetchImpl,
    });

    await expect(client.get('/a', { schema })).rejects.toBeInstanceOf(SmartApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});

describe('rate limiting', () => {
  it('waits out a short Retry-After and retries once', async () => {
    const { fetchImpl, calls } = stubFetch([
      {
        status: 429,
        headers: { 'retry-after': '0' },
        body: { error: 'rate_limit_exceeded', message: 'slow down', statusCode: 429 },
      },
      { body: { ok: true } },
    ]);
    const client = new SmartApiClient({ baseUrl: 'https://api.smart.test', fetchImpl });

    await expect(client.get('/a', { schema })).resolves.toStrictEqual({ ok: true });
    expect(calls).toHaveLength(2);
    expect(MAX_RATE_LIMIT_RETRIES).toBe(1);
  });

  it('surfaces a long Retry-After instead of hanging the UI', async () => {
    // Silently waiting 60 seconds looks identical to a frozen app.
    const { fetchImpl, calls } = stubFetch([
      {
        status: 429,
        headers: { 'retry-after': '60' },
        body: {
          error: 'rate_limit_exceeded',
          message: 'slow down',
          statusCode: 429,
          retryAfterSeconds: 60,
        },
      },
    ]);
    const client = new SmartApiClient({ baseUrl: 'https://api.smart.test', fetchImpl });

    const error = await client.get('/a', { schema }).catch((caught: unknown) => caught);
    expect(isSmartApiError(error) && error.retryAfterSeconds).toBe(60);
    expect(isSmartApiError(error) && error.isRetryable).toBe(true);
    expect(calls).toHaveLength(1);
  });
});

describe('error surfaces', () => {
  it('exposes the trace id so a bug report is actionable', async () => {
    const { fetchImpl } = stubFetch([
      {
        status: 500,
        body: {
          error: 'internal_error',
          message: 'boom',
          statusCode: 500,
          traceId: '11111111-1111-4111-8111-111111111111',
        },
      },
    ]);
    const client = new SmartApiClient({ baseUrl: 'https://api.smart.test', fetchImpl });

    const error = await client.get('/a', { schema }).catch((caught: unknown) => caught);
    expect(isSmartApiError(error) && error.traceId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('maps validation details onto form fields', async () => {
    const { fetchImpl } = stubFetch([
      {
        status: 422,
        body: {
          error: 'validation_failed',
          message: 'invalid',
          statusCode: 422,
          details: [{ path: 'email', message: 'Enter a valid email' }],
        },
      },
    ]);
    const client = new SmartApiClient({ baseUrl: 'https://api.smart.test', fetchImpl });

    const error = await client.get('/a', { schema }).catch((caught: unknown) => caught);
    expect(isSmartApiError(error) && error.fieldErrors).toStrictEqual({
      email: 'Enter a valid email',
    });
  });

  it('synthesises a contract-shaped error when a proxy returns HTML', async () => {
    // Callers must never have to handle a third error shape.
    const { fetchImpl } = stubFetch([{ status: 502, text: '<html>502 Bad Gateway</html>' }]);
    const client = new SmartApiClient({ baseUrl: 'https://api.smart.test', fetchImpl });

    const error = await client.get('/a', { schema }).catch((caught: unknown) => caught);
    expect(isSmartApiError(error) && error.code).toBe('service_unavailable');
    expect(isSmartApiError(error) && error.isRetryable).toBe(true);
  });

  it('flags a 2xx body that violates the contract instead of passing it through', async () => {
    // Otherwise the failure appears as a crash deep in a component tree.
    const { fetchImpl } = stubFetch([{ body: { ok: 'yes' } }]);
    const client = new SmartApiClient({ baseUrl: 'https://api.smart.test', fetchImpl });

    await expect(client.get('/api/v1/users/me', { schema })).rejects.toBeInstanceOf(
      SmartContractViolationError,
    );
  });

  it('distinguishes a dropped connection from a server error', async () => {
    const fetchImpl = (() => Promise.reject(new Error('ECONNRESET'))) as unknown as typeof fetch;
    const client = new SmartApiClient({ baseUrl: 'https://api.smart.test', fetchImpl });

    await expect(client.get('/a', { schema })).rejects.toBeInstanceOf(SmartNetworkError);
  });

  it('treats 204 as an empty success', async () => {
    const { fetchImpl } = stubFetch([{ status: 204, text: '' }]);
    const client = new SmartApiClient({ baseUrl: 'https://api.smart.test', fetchImpl });

    await expect(client.delete('/a')).resolves.toBeUndefined();
  });

  it('classifies errors that require re-login', () => {
    const expired = new SmartApiError({ error: 'token_expired', message: 'x', statusCode: 401 });
    const forbidden = new SmartApiError({ error: 'forbidden', message: 'x', statusCode: 403 });

    expect(expired.requiresLogin).toBe(true);
    expect(forbidden.requiresLogin).toBe(false);
  });
});

describe('query keys', () => {
  it('nests keys so a prefix invalidation reaches everything under it', () => {
    expect(queryKeys.attemptSession('a-1')).toStrictEqual(['attempt', 'a-1', 'session']);
    expect(queryKeys.nextItem('a-1')[0]).toBe('attempt');
    expect(queryKeys.myApplications()).toStrictEqual(['me', 'applications']);
  });

  it('invalidates every surface that a completed attempt changes', () => {
    // Missing one of these leaves a candidate or a TPO looking at stale data.
    const groups = invalidationGroups.onAttemptCompleted('a-1');
    const flattened = JSON.stringify(groups);

    for (const expected of ['results', 'certificates', 'analytics', 'growth-report']) {
      expect(flattened, expected).toContain(expected);
    }
  });

  it('invalidates results when cut scores are published', () => {
    // Publishing cut scores re-tiers existing results; every result view is stale.
    const flattened = JSON.stringify(invalidationGroups.onCutScoresPublished('TECH_FULLSTACK'));
    expect(flattened).toContain('results');
    expect(flattened).toContain('TECH_FULLSTACK');
  });
});

describe('CN-T06 my applications client', () => {
  it('GETs /me/applications without a client-supplied studentId', async () => {
    const { fetchImpl, calls } = stubFetch([
      {
        body: {
          applications: [
            {
              applicationId: '00000000-0000-4000-8000-000000000001',
              openingId: '00000000-0000-4000-8000-000000000010',
              studentId: '00000000-0000-4000-8000-000000000020',
              stage: 'SHORTLISTED',
              matchScore: 0.88,
              createdAt: '2026-09-02T00:00:00.000Z',
              updatedAt: '2026-09-02T01:00:00.000Z',
              companyName: 'Acme Labs',
              roleTitle: 'Backend Engineer',
              location: 'Bengaluru',
              employmentType: 'FULL_TIME',
              domain: 'SOFTWARE_IT',
            },
          ],
        },
      },
    ]);
    const api = createSmartApi(
      new SmartApiClient({ baseUrl: 'https://api.smart.test', fetchImpl }),
    );

    await api.placement.listMyApplications();

    expect(calls[0]?.url).toBe('https://api.smart.test/api/v1/me/applications');
    expect(calls[0]?.url).not.toContain('studentId');
    expect(calls[0]?.init.method ?? 'GET').toBe('GET');
  });
});
