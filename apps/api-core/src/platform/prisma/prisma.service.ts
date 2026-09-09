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
    super({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL, max: 20 }),
      log: [{ level: 'query', emit: 'event' }],
    });

    // `model` is intentionally not attributed here (Prisma's query event does not
    // carry it reliably across driver adapters); this is a load-test/soak signal
    // for overall Postgres latency, not a per-model breakdown — postgres_exporter
    // covers DB-side saturation, this covers what the app itself observed.
    this.$on('query' as never, (event: { duration: number; query: string }) => {
      try {
        dbQueryDuration.observe(
          { operation: sqlOperation(event.query), model: 'all' },
          event.duration / 1000,
        );
      } catch {
        // Never let a metrics observation take down a query path.
      }
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
