import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { RequestUser } from './jwt-auth.guard.js';

@Injectable()
export class AssistedSupportGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: RequestUser }>();
    const user = request.user;

    // Non-delegated sessions are not restricted by this guard
    if (!user || !user.isDelegated) {
      return true;
    }

    const method = request.method?.toUpperCase();

    // Read-only HTTP methods are permitted
    if (method === 'GET' || method === 'HEAD') {
      return true;
    }

    const path = request.url?.split('?')[0] || '';

    // Session-end endpoint must remain callable during impersonation
    if (path.endsWith('/admin/support/session/end') || path.endsWith('/support/session/end')) {
      return true;
    }

    // Block all state-mutating actions (POST, PUT, PATCH, DELETE, etc.)
    throw new ForbiddenException({
      error: 'assisted_support_read_only',
      message: 'Mutating actions are restricted during an assisted support session.',
      statusCode: 403,
    });
  }
}
