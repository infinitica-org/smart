import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { getContext, LOG_EVENTS, logEvent } from '@smart/observability';
import type { RequestWithLogContext } from '../interceptors/observability.interceptor.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const reply = http.getResponse<FastifyReply>();
    const request = http.getRequest<RequestWithLogContext>();
    const route = request.routeOptions?.url ?? request.url;
    // Prefer ALS (minted UUID), then interceptor stash — never raw inbound header.
    const traceId =
      getContext()?.correlationId ?? request.smartLogContext?.correlationId ?? String(request.id);

    if (exception instanceof ZodError) {
      logEvent(
        this.logger,
        'warn',
        LOG_EVENTS.HTTP_CLIENT_ERROR,
        { statusCode: 422, error: 'validation_failed', route },
        'Request failed validation',
      );
      void reply.status(422).send({
        error: 'validation_failed',
        message: 'Request failed validation.',
        statusCode: 422,
        traceId,
        details: exception.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const body = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
      this.logHttpException(status, body, route, exception);

      // Preserve structured readiness payloads (status/checks) when thrown as HttpException.
      if (typeof body.status === 'string' && body.checks && typeof body.checks === 'object') {
        void reply.status(status).send({ ...body, statusCode: status, traceId });
        return;
      }
      void reply.status(status).send({
        error: body.error ?? exception.name,
        message: body.message ?? exception.message,
        statusCode: status,
        traceId,
        details: body.details,
        retryAfterSeconds: body.retryAfterSeconds,
      });
      return;
    }

    logEvent(
      this.logger,
      'error',
      LOG_EVENTS.HTTP_UNHANDLED_ERROR,
      {
        statusCode: 500,
        route,
        err:
          exception instanceof Error
            ? { type: exception.name, message: exception.message, stack: exception.stack }
            : { type: 'unknown', message: String(exception) },
      },
      'Unhandled error',
    );
    void reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: 'internal_error',
      message: 'An unexpected error occurred.',
      statusCode: 500,
      traceId,
    });
  }

  private logHttpException(
    status: number,
    body: Record<string, unknown>,
    route: string,
    exception: HttpException,
  ): void {
    const errorCode =
      typeof body.error === 'string' ? body.error : (exception.name ?? 'HttpException');

    if (status >= 500) {
      logEvent(
        this.logger,
        'error',
        LOG_EVENTS.HTTP_UNHANDLED_ERROR,
        {
          statusCode: status,
          error: errorCode,
          route,
          err: { type: exception.name, message: exception.message },
        },
        'Server error',
      );
      return;
    }

    if (status === 401 || status === 404) return;

    logEvent(
      this.logger,
      'warn',
      LOG_EVENTS.HTTP_CLIENT_ERROR,
      { statusCode: status, error: errorCode, route },
      'Client error',
    );
  }
}
