import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';

const DAY_MS = 86_400_000;

export interface RetentionPolicy {
  readonly category: string;
  readonly days: number;
  /** `report` only counts: the rule needs a decision before anything is removed automatically. */
  readonly action: 'delete' | 'report';
  readonly why: string;
}

/**
 * S6-VV-118 (#556) — how long each category of data is kept. One table, so a DPDP review reads it
 * in one place and a change is a one-line diff. Audit logs follow decision D2 (2026-09-25).
 */
export const RETENTION_POLICIES: readonly RetentionPolicy[] = [
  { category: 'audit_logs', days: 400, action: 'delete', why: 'D2: 400 days online' },
  { category: 'rate_limit_logs', days: 30, action: 'delete', why: 'abuse forensics only' },
  { category: 'read_notifications', days: 180, action: 'delete', why: 'already seen' },
  {
    category: 'expired_auth_tokens',
    days: 30,
    action: 'delete',
    why: 'verify/reset/refresh tokens past expiry',
  },
  { category: 'dsr_export_bundles', days: 7, action: 'delete', why: 'S6-VV-115 download window' },
  {
    category: 'integrity_events',
    days: 730,
    action: 'report',
    why: 'back issued scores; needs a policy decision',
  },
  {
    category: 'deactivated_accounts',
    days: 730,
    action: 'report',
    why: 'anonymize after N years? needs a policy decision',
  },
];

export interface RetentionReportRow {
  category: string;
  days: number;
  action: RetentionPolicy['action'];
  matched: number;
  removed: number;
}

type Handler = { count(cutoff: Date): Promise<number>; purge(cutoff: Date): Promise<number> };

/** Runs every policy. With `dryRun` (the default) it only counts what it would remove. */
@Injectable()
export class RetentionSweepService {
  private readonly logger = new Logger(RetentionSweepService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  async run({ dryRun }: { dryRun: boolean }, now = Date.now()): Promise<RetentionReportRow[]> {
    const handlers = this.handlers();
    const report: RetentionReportRow[] = [];
    for (const policy of RETENTION_POLICIES) {
      const cutoff = new Date(now - policy.days * DAY_MS);
      const handler = handlers[policy.category];
      if (!handler) throw new Error(`No retention handler for ${policy.category}`);
      const matched = await handler.count(cutoff);
      const removed =
        !dryRun && policy.action === 'delete' && matched > 0 ? await handler.purge(cutoff) : 0;
      report.push({
        category: policy.category,
        days: policy.days,
        action: policy.action,
        matched,
        removed,
      });
    }
    const summary = report.map((row) => `${row.category}=${row.matched}/${row.removed}`).join(' ');
    this.logger.log(`Retention sweep (${dryRun ? 'dry run' : 'live'}) matched/removed: ${summary}`);
    return report;
  }

  private handlers(): Record<string, Handler> {
    const db = this.prisma;
    const older = (cutoff: Date) => ({ createdAt: { lt: cutoff } });
    const expiredTokens = (cutoff: Date) => ({ expiresAt: { lt: cutoff } });
    const exportBundles = (cutoff: Date) => ({
      type: 'EXPORT' as const,
      exportKey: { not: null },
      resolvedAt: { lt: cutoff },
    });
    return {
      audit_logs: {
        count: (c) => db.auditLog.count({ where: older(c) }),
        purge: async (c) => (await db.auditLog.deleteMany({ where: older(c) })).count,
      },
      rate_limit_logs: {
        count: (c) => db.rateLimitLog.count({ where: older(c) }),
        purge: async (c) => (await db.rateLimitLog.deleteMany({ where: older(c) })).count,
      },
      read_notifications: {
        count: (c) => db.notification.count({ where: { readAt: { lt: c } } }),
        purge: async (c) =>
          (await db.notification.deleteMany({ where: { readAt: { lt: c } } })).count,
      },
      expired_auth_tokens: {
        count: async (c) =>
          (await db.emailVerificationToken.count({ where: expiredTokens(c) })) +
          (await db.passwordResetToken.count({ where: expiredTokens(c) })) +
          (await db.refreshToken.count({ where: expiredTokens(c) })),
        purge: async (c) =>
          (await db.emailVerificationToken.deleteMany({ where: expiredTokens(c) })).count +
          (await db.passwordResetToken.deleteMany({ where: expiredTokens(c) })).count +
          (await db.refreshToken.deleteMany({ where: expiredTokens(c) })).count,
      },
      dsr_export_bundles: {
        count: (c) => db.dataSubjectRequest.count({ where: exportBundles(c) }),
        purge: async (c) => {
          const rows = await db.dataSubjectRequest.findMany({
            where: exportBundles(c),
            select: { id: true, exportKey: true },
          });
          for (const row of rows) {
            if (row.exportKey) await this.storage.deleteObject(row.exportKey);
            await db.dataSubjectRequest.update({
              where: { id: row.id },
              data: { exportKey: null },
            });
          }
          return rows.length;
        },
      },
      integrity_events: {
        count: (c) => db.integrityEvent.count({ where: older(c) }),
        purge: async () => 0,
      },
      deactivated_accounts: {
        count: (c) => db.user.count({ where: { deactivatedAt: { lt: c } } }),
        purge: async () => 0,
      },
    };
  }
}
