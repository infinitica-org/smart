import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { CORRELATION_HEADER, getContext, isValidCorrelationId } from '@smart/observability';
import { ObservabilityInterceptor } from './observability.interceptor.js';

function mockContext(opts: {
  headers?: Record<string, string>;
  user?: { sub: string; role: string; inst: string | null };
  url?: string;
}) {
  const headers: Record<string, string> = {};
  const reply = {
    header(name: string, value: string) {
      headers[name] = value;
      return this;
    },
    statusCode: 200,
  };
  const request = {
    id: 'req-42',
    method: 'GET',
    url: opts.url ?? '/api/v1/catalog/tracks',
    routeOptions: { url: opts.url ?? '/api/v1/catalog/tracks' },
    headers: opts.headers ?? {},
    user: opts.user,
    smartLogContext: undefined as unknown,
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => reply,
    }),
  } as ExecutionContext;

  return { context, request, headers };
}

describe('ObservabilityInterceptor', () => {
  it('mints a UUID correlation id when inbound header is junk', async () => {
    const interceptor = new ObservabilityInterceptor();
    const { context, headers, request } = mockContext({
      headers: { [CORRELATION_HEADER]: 'not-a-uuid' },
    });
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(isValidCorrelationId(headers[CORRELATION_HEADER] ?? '')).toBe(true);
    expect(request.smartLogContext).toMatchObject({
      correlationId: headers[CORRELATION_HEADER],
      requestId: 'req-42',
      module: 'api-core',
    });
  });

  it('attaches userId and institutionId from JWT user', async () => {
    const interceptor = new ObservabilityInterceptor();
    const { context, request } = mockContext({
      user: { sub: 'user-1', role: 'STUDENT', inst: 'inst-9' },
    });
    let seenUserId: string | undefined;
    const next: CallHandler = {
      handle: () => {
        seenUserId = getContext()?.userId;
        return of({ ok: true });
      },
    };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(seenUserId).toBe('user-1');
    expect(request.smartLogContext).toMatchObject({
      userId: 'user-1',
      institutionId: 'inst-9',
    });
  });

  it('keeps ALS context on error path', async () => {
    const interceptor = new ObservabilityInterceptor();
    const { context } = mockContext({});
    let seen: string | undefined;
    const next: CallHandler = {
      handle: () =>
        throwError(() => {
          seen = getContext()?.correlationId;
          return new Error('fail');
        }),
    };

    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow('fail');
    expect(seen).toBeDefined();
    expect(isValidCorrelationId(seen ?? '')).toBe(true);
  });

  it('accepts a valid inbound correlation id', async () => {
    const interceptor = new ObservabilityInterceptor();
    const inbound = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const { context, headers } = mockContext({
      headers: { [CORRELATION_HEADER]: inbound },
    });
    const next: CallHandler = { handle: () => of(null) };
    const spy = vi.fn();
    next.handle = () => {
      spy(getContext()?.correlationId);
      return of(null);
    };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(headers[CORRELATION_HEADER]).toBe(inbound);
    expect(spy).toHaveBeenCalledWith(inbound);
  });
});
