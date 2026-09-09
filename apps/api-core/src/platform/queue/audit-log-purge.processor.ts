import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AUDIT_LOG_PURGE_INTERVAL_MS,
  AUDIT_LOG_PURGE_JOB_ID,
  AUDIT_LOG_PURGE_QUEUE,
  AUDIT_LOG_RETENTION_DAYS,
} from './queue.names.js';

/**
 * Rolling audit-log retention (S4-superadmin audit expansion): hard-deletes
 * `audit_logs` rows older than `AUDIT_LOG_RETENTION_DAYS` once a day. This is
 * a permanent, unrecoverable purge by design — audit rows are not archived
 * elsewhere first.
 */
@Processor(AUDIT_LOG_PURGE_QUEUE)
export class AuditLogPurgeProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AuditLogPurgeProcessor.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue(AUDIT_LOG_PURGE_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      // upsertJobScheduler is keyed by jobSchedulerId — idempotent across
      // restarts, it will not create a duplicate schedule.
      await this.queue.upsertJobScheduler(
        AUDIT_LOG_PURGE_JOB_ID,
        { every: AUDIT_LOG_PURGE_INTERVAL_MS },
        { name: 'purge' },
      );
    } catch (error) {
      this.logger.warn(
        `Could not schedule audit-log purge job: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async process(): Promise<void> {
    const cutoff = new Date(Date.now() - AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (count > 0) {
      this.logger.log(
        `Purged ${count} audit log row(s) older than ${AUDIT_LOG_RETENTION_DAYS} days`,
      );
    }
  }
}
