import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { CORRELATION_HEADER } from '@smart/observability';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const reply = http.getResponse<FastifyReply>();
    const request = http.getRequest<FastifyRequest>();
    const traceId = String(request.headers[CORRELATION_HEADER] ?? request.id);

    if (exception instanceof ZodError) {
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

    this.logger.error(exception);
    void reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: 'internal_error',
      message: 'An unexpected error occurred.',
      statusCode: 500,
      traceId,
    });
  }
}
