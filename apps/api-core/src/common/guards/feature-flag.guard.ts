import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { REQUIRE_FLAG_KEY } from './feature-flag.decorator.js';
import type { RequestUser } from './jwt-auth.guard.js';
import { InstitutionsService } from '../../modules/institutions/institutions.service.js';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(InstitutionsService) private readonly institutions: InstitutionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredFlag = this.reflector.getAllAndOverride<string>(REQUIRE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredFlag) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: RequestUser }>();
    const institutionId = request.user?.inst;
    if (!institutionId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Institution admin must belong to an institution.',
        statusCode: 403,
      });
    }
    await this.institutions.assertInstitutionFlag(institutionId, requiredFlag);
    return true;
  }
}
