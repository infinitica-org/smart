import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';
import {
  CORRELATION_HEADER,
  httpRequestDuration,
  httpRequestsTotal,
  resolveCorrelationId,
  runWithContext,
} from '@smart/observability';

@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const started = process.hrtime.bigint();
    const correlationId = resolveCorrelationId(request.headers[CORRELATION_HEADER]);
    reply.header(CORRELATION_HEADER, correlationId);

    const method = request.method;
    const route = request.routeOptions?.url ?? request.url;

    return runWithContext({ correlationId, requestId: request.id, module: 'api-core' }, () =>
      next.handle().pipe(
        tap({
          next: () => this.observe(method, route, reply.statusCode, started),
          error: () => this.observe(method, route, reply.statusCode || 500, started),
        }),
      ),
    );
  }

  private observe(method: string, route: string, status: number, started: bigint): void {
    const seconds = Number(process.hrtime.bigint() - started) / 1e9;
    const labels = { method, route, status_code: String(status) };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe({ ...labels, module: 'api-core' }, seconds);
  }
}
