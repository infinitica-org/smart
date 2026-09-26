import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { concatMap, type Observable } from 'rxjs';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { AUDIT_ACCESS_KEY, type AuditAccessOptions } from '../decorators/audit-access.decorator.js';
import type { RequestUser } from '../guards/jwt-auth.guard.js';

/** One row per actor + resource per window, so paging through a record doesn't flood the log. */
export const AUDIT_ACCESS_THROTTLE_SECONDS = 600;

/**
 * S6-VV-103 (#493) — reads used to leave no trail (only mutations were
 * audited). For routes marked @AuditAccess, a successful response records who
 * looked at whose data. Failed or forbidden requests record nothing (the
 * handler never emits), and neither does a subject reading their own data.
 * Audit failures are logged, never surfaced to the caller.
 */
@Injectable()
export class AuditAccessInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditAccessInterceptor.name);

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditAccessOptions | undefined>(
      AUDIT_ACCESS_KEY,
      context.getHandler(),
    );
    if (!options) return next.handle();

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: RequestUser; routeOptions?: { url?: string } }>();
    return next.handle().pipe(
      concatMap(async (body) => {
        await this.record(request, options);
        return body;
      }),
    );
  }

  private async record(
    request: FastifyRequest & { user?: RequestUser; routeOptions?: { url?: string } },
    options: AuditAccessOptions,
  ): Promise<void> {
    const actor = request.user;
    const params = request.params as Record<string, string> | undefined;
    const resourceId = params?.[options.idParam];
    const subjectId = options.subjectParam ? params?.[options.subjectParam] : resourceId;
    if (!actor?.sub || !resourceId || actor.sub === subjectId) return;
    const action = options.action ?? 'admin.data_accessed';

    try {
      const key = `audit:access:${action}:${actor.sub}:${options.resourceType}:${resourceId}`;
      const first = await this.redis
        .set(key, '1', 'EX', AUDIT_ACCESS_THROTTLE_SECONDS, 'NX')
        .catch(() => 'OK'); // Redis down: record rather than silently skip
      if (first !== 'OK') return;

      await this.auditPublisher.record({
        actorId: actor.sub,
        action,
        resourceType: options.resourceType,
        resourceId,
        reasonCode: null,
        metadata: {
          ...(options.subjectParam ? { subjectId } : {}),
          actorRole: actor.role,
          route: `${request.method} ${request.routeOptions?.url ?? request.url.split('?')[0]}`,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Could not record data access for ${options.resourceType}:${resourceId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
