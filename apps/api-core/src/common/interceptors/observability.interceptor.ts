import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import {
  CORRELATION_HEADER,
  httpRequestDuration,
  httpRequestsTotal,
  resolveCorrelationId,
  runWithContext,
  type LoggerContext,
} from '@smart/observability';
import type { RequestUser } from '../guards/jwt-auth.guard.js';

export type RequestWithLogContext = FastifyRequest & {
  user?: RequestUser;
  /** Stashed for pino-http customProps when ALS is not active at access-log time. */
  smartLogContext?: LoggerContext;
};

@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithLogContext>();
    const reply = http.getResponse<FastifyReply>();
    const started = process.hrtime.bigint();
    const correlationId = resolveCorrelationId(request.headers[CORRELATION_HEADER]);
    reply.header(CORRELATION_HEADER, correlationId);

    const method = request.method;
    const route = request.routeOptions?.url ?? request.url;
    const logContext: LoggerContext = {
      correlationId,
      requestId: request.id,
      module: 'api-core',
      ...(request.user?.sub ? { userId: request.user.sub } : {}),
      ...(request.user?.inst ? { institutionId: request.user.inst } : {}),
    };
    request.smartLogContext = logContext;

    // Re-enter ALS on each emission — RxJS can break the store after subscribe.
    return new Observable((subscriber) => {
      const subscription = runWithContext(logContext, () =>
        next.handle().subscribe({
          next: (value) => {
            runWithContext(logContext, () => {
              this.observe(method, route, reply.statusCode, started);
              subscriber.next(value);
            });
          },
          error: (err: unknown) => {
            runWithContext(logContext, () => {
              this.observe(method, route, reply.statusCode || 500, started);
              subscriber.error(err);
            });
          },
          complete: () => {
            runWithContext(logContext, () => {
              subscriber.complete();
            });
          },
        }),
      );
      return () => subscription.unsubscribe();
    });
  }

  private observe(method: string, route: string, status: number, started: bigint): void {
    const seconds = Number(process.hrtime.bigint() - started) / 1e9;
    const labels = { method, route, status_code: String(status) };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe({ ...labels, module: 'api-core' }, seconds);
  }
}
