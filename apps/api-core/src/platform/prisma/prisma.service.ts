import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { dbQueryDuration, LOG_EVENTS, logEvent } from '@smart/observability';
import { PrismaClient } from '../../generated/prisma/index.js';
import { env } from '../config/env.js';

/** First SQL keyword, used as a low-cardinality Prometheus label (never the raw statement). */
function sqlOperation(query: string): string {
  const match = /^\s*(\w+)/.exec(query);
  return match?.[1]?.toUpperCase() ?? 'UNKNOWN';
}

/**
 * Prisma client with the Prisma 7 pg adapter.
 * Owner: Vishal V.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Runtime queries go through PgBouncer (transaction pooling) when
    // configured; `prisma migrate deploy` always uses DATABASE_URL directly
    // (see env.ts) since transaction-mode pooling can't support the
    // session-level features migrations need.
    super({
      adapter: new PrismaPg({
        connectionString: env.POOLED_DATABASE_URL ?? env.DATABASE_URL,
        max: 20,
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      logEvent(
        this.logger,
        'warn',
        LOG_EVENTS.POSTGRES_DEGRADED,
        {
          err: error instanceof Error ? error.message : 'unknown',
        },
        'Postgres is not reachable; catalog will serve contract defaults until infra is up',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
