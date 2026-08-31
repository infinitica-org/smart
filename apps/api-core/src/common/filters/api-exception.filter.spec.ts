import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { newCorrelationId, runWithContext } from '@smart/observability';
import { ApiExceptionFilter } from './api-exception.filter.js';

function mockHost(headers: Record<string, string> = {}, requestId = 'req-1') {
  const sent: { status?: number; body?: unknown } = {};
  const reply = {
    status(code: number) {
      sent.status = code;
      return this;
    },
    send(body: unknown) {
      sent.body = body;
      return this;
    },
  };
  const request = {
    id: requestId,
    url: '/api/v1/auth/login',
    routeOptions: { url: '/api/v1/auth/login' },
    headers,
    smartLogContext: undefined as { correlationId: string } | undefined,
  };
  return {
    sent,
    request,
    host: {
      switchToHttp: () => ({
        getResponse: () => reply,
        getRequest: () => request,
      }),
    },
  };
}

describe('ApiExceptionFilter', () => {
  it('uses ALS correlationId as traceId, not a forged inbound header', () => {
    const filter = new ApiExceptionFilter();
    const minted = newCorrelationId();
    const { host, sent, request } = mockHost({ 'x-correlation-id': '"; DROP TABLE--' });
    request.smartLogContext = { correlationId: minted };

    runWithContext({ correlationId: minted, module: 'api-core' }, () => {
      filter.catch(
        new BadRequestException({ error: 'bad_request', message: 'nope' }),
        host as never,
      );
    });

    expect(sent.status).toBe(400);
    expect((sent.body as { traceId: string }).traceId).toBe(minted);
    expect((sent.body as { traceId: string }).traceId).not.toContain('DROP');
  });

  it('falls back to smartLogContext when ALS is empty', () => {
    const filter = new ApiExceptionFilter();
    const stashed = newCorrelationId();
    const { host, sent, request } = mockHost({ 'x-correlation-id': 'not-a-uuid' });
    request.smartLogContext = { correlationId: stashed };

    filter.catch(new UnauthorizedException({ error: 'unauthorized' }), host as never);

    expect((sent.body as { traceId: string }).traceId).toBe(stashed);
  });

  it('logs validation failures without answer values', () => {
    const filter = new ApiExceptionFilter();
    const warn = vi.spyOn(
      (filter as unknown as { logger: { warn: (...a: unknown[]) => void } }).logger,
      'warn',
    );
    const { host } = mockHost();
    const result = z.object({ answer: z.string() }).safeParse({ answer: 123 });
    if (result.success) throw new Error('expected zod failure');

    filter.catch(result.error, host as never);

    expect(warn).toHaveBeenCalled();
    const payload = warn.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.event).toBe('http.client_error');
    expect(JSON.stringify(payload)).not.toContain('123');
  });

  it('logs unexpected errors as structured http.unhandled_error', () => {
    const filter = new ApiExceptionFilter();
    const error = vi.spyOn(
      (filter as unknown as { logger: { error: (...a: unknown[]) => void } }).logger,
      'error',
    );
    const { host, sent } = mockHost();
    const minted = newCorrelationId();

    runWithContext({ correlationId: minted }, () => {
      filter.catch(new Error('boom'), host as never);
    });

    expect(sent.status).toBe(500);
    expect((sent.body as { traceId: string }).traceId).toBe(minted);
    const payload = error.mock.calls[0]?.[0] as { event: string; err: { message: string } };
    expect(payload.event).toBe('http.unhandled_error');
    expect(payload.err.message).toBe('boom');
  });
});
