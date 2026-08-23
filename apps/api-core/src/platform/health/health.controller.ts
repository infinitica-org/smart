import { Controller, Get, Header, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, type HealthStatus } from '@smart/contracts';
import { collectMetrics, METRICS_CONTENT_TYPE } from '@smart/observability';
import { Public } from '../../common/guards/public.decorator.js';
import { env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('/health')
  @ApiOperation({ summary: 'Liveness probe — process is up' })
  liveness(): HealthStatus {
    return {
      status: 'ok',
      version: env.APP_VERSION,
      uptimeSeconds: Math.floor(process.uptime()),
      checks: { process: { status: 'up' } },
    };
  }

  @Public()
  @Get('/ready')
  @ApiOperation({ summary: 'Readiness probe — Postgres + Redis reachable' })
  async readiness(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {};

    const pgStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = { status: 'up', latencyMs: Date.now() - pgStart };
    } catch (error) {
      checks.postgres = {
        status: 'down',
        latencyMs: Date.now() - pgStart,
        message: error instanceof Error ? error.message : 'unreachable',
      };
    }

    const redisStart = Date.now();
    try {
      if (this.redis.status === 'wait' || this.redis.status === 'end') {
        await this.redis.connect();
      }
      await this.redis.ping();
      checks.redis = { status: 'up', latencyMs: Date.now() - redisStart };
    } catch (error) {
      checks.redis = {
        status: 'down',
        latencyMs: Date.now() - redisStart,
        message: error instanceof Error ? error.message : 'unreachable',
      };
    }

    const down = Object.values(checks).some((check) => check.status === 'down');
    const body: HealthStatus = {
      status: down ? 'error' : 'ok',
      version: env.APP_VERSION,
      uptimeSeconds: Math.floor(process.uptime()),
      checks,
    };
    if (down) throw new ServiceUnavailableException(body);
    return body;
  }

  @Public()
  @Get(`${API_PREFIX}/admin/metrics`)
  @Header('content-type', METRICS_CONTENT_TYPE)
  metrics(): Promise<string> {
    return collectMetrics();
  }
}
