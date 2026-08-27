import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/index.js';
import { env } from '../config/env.js';

/**
 * Prisma client with the Prisma 7 pg adapter.
 * Owner: Vishal V.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.warn(
        {
          event: 'postgres.degraded',
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
