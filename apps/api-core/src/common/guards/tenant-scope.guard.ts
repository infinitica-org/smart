import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import type { RequestUser } from './jwt-auth.guard.js';

/**
 * Declarative replacement for the `requireInstitutionId()` null-check
 * duplicated across institutions-tpo.controller.ts / placement.controller.ts /
 * matching/placement-match.controller.ts — asserts the caller is tenant-scoped
 * (has an institution) unless they're a SUPER_ADMIN. This does not compare a
 * target resource's actual institution against the caller's — that ownership
 * check needs a DB lookup and stays at the service layer (see
 * InstitutionsService.requireStudent for the existing pattern).
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: RequestUser }>();
    const user = request.user;
    if (user?.role === 'SUPER_ADMIN') return true;

    if (!user?.inst) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'This action requires an institution-scoped account.',
        statusCode: 403,
      });
    }
    return true;
  }
}
