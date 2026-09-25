import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import type { RequestUser } from './jwt-auth.guard.js';
import { resolveSessionHold, throwSessionHoldForbidden } from '../session-hold.js';

@Injectable()
export class SessionHoldGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: RequestUser }>();
    const user = request.user;
    if (!user || user.role === 'SUPER_ADMIN') return true;

    const path = request.url.split('?')[0] ?? '';
    const method = request.method.toUpperCase();
    if (method === 'GET' && path.endsWith('/users/me')) return true;
    if (method === 'POST' && path.endsWith('/auth/logout')) return true;

    const row = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        role: true,
        heldAt: true,
        institution: { select: { heldAt: true, deactivatedAt: true } },
        company: { select: { heldAt: true, deactivatedAt: true, verificationStatus: true } },
      },
    });
    if (!row) return true;
    const hold = resolveSessionHold(row);
    if (hold) throwSessionHoldForbidden(hold);
    return true;
  }
}
