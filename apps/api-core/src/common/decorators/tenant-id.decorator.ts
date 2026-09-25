import { createParamDecorator, ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { RequestUser } from '../guards/jwt-auth.guard.js';

/**
 * The caller's institution id (the `inst` claim), for institution-scoped handlers. Throws 403 when
 * the caller has none, SUPER_ADMIN included: a missing id must never reach a query, where
 * `{ institutionId: undefined }` would match every tenant. Replaces the `requireInstitutionId()`
 * helper that was copied into each TPO / placement controller.
 */
export function resolveTenantId(user: RequestUser | undefined): string {
  if (!user?.inst) {
    throw new ForbiddenException({
      error: 'forbidden',
      message: 'This action requires an institution-scoped account.',
      statusCode: 403,
    });
  }
  return user.inst;
}

export const TenantId = createParamDecorator((_data: unknown, context: ExecutionContext): string =>
  resolveTenantId(
    context.switchToHttp().getRequest<FastifyRequest & { user?: RequestUser }>().user,
  ),
);
