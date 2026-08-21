import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';
import { API_PREFIX, RATE_LIMIT_HEADERS, ROUTES, type RouteSpec } from '@smart/contracts';
import { RateLimitService } from '../../modules/rate-limit/rate-limit.service.js';
import type { RequestUser } from '../guards/jwt-auth.guard.js';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(@Inject(RateLimitService) private readonly rateLimits: RateLimitService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest & { user?: RequestUser }>();
    const reply = http.getResponse<FastifyReply>();
    const route = matchContractRoute(request.method, request.url);

    if (!route) return next.handle();

    const identity = request.user?.sub ?? request.ip ?? 'anon';
    const role = request.user?.role ?? 'PUBLIC';
    const decision = await this.rateLimits.consume(route.rateLimit, identity, role, route.path);

    reply.header(RATE_LIMIT_HEADERS.limit, String(decision.limit));
    reply.header(
      RATE_LIMIT_HEADERS.remaining,
      String(Math.max(0, decision.limit - decision.count)),
    );
    reply.header(RATE_LIMIT_HEADERS.reset, String(decision.policy.windowSeconds));

    if (!decision.allowed) {
      reply.header(RATE_LIMIT_HEADERS.retryAfter, String(decision.retryAfterSeconds));
      throw new HttpException(
        {
          error: 'rate_limit_exceeded',
          message: 'Too many requests for this policy.',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfterSeconds: decision.retryAfterSeconds,
          limit: decision.limit,
          window: `${String(decision.policy.windowSeconds)}s`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }
}

export function matchContractRoute(method: string, rawUrl: string): RouteSpec | undefined {
  const path = rawUrl.split('?')[0] ?? rawUrl;
  const stripped = path.startsWith(API_PREFIX) ? path.slice(API_PREFIX.length) || '/' : path;
  const normalised = stripped.startsWith('/') ? stripped : `/${stripped}`;

  return ROUTES.find((route) => route.method === method && pathMatches(route.path, normalised));
}

function pathMatches(template: string, actual: string): boolean {
  const templateParts = template.split('/');
  const actualParts = actual.split('/');
  if (templateParts.length !== actualParts.length) return false;
  return templateParts.every((part, index) => part.startsWith(':') || part === actualParts[index]);
}
