import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from './public.decorator.js';

export interface RequestUser {
  readonly sub: string;
  readonly role: string;
  readonly inst: string | null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: RequestUser }>();
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Missing bearer token.',
        statusCode: 401,
      });
    }

    try {
      request.user = this.jwt.verify<RequestUser>(header.slice('Bearer '.length));
      return true;
    } catch {
      throw new UnauthorizedException({
        error: 'token_expired',
        message: 'Access token is invalid or expired.',
        statusCode: 401,
      });
    }
  }
}
