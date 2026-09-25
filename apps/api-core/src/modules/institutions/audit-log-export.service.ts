import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { ListAuditLogsQuery } from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { auditExportHeader, auditExportLine, type AuditExportFormat } from './audit-log-export.js';
import { buildAuditLogWhere } from './audit-log-query.js';

/** Past this, the admin must narrow the filter (date range, action, actor). */
export const AUDIT_EXPORT_MAX_ROWS = 100_000;
const PAGE_SIZE = 5_000;

export interface PreparedAuditExport {
  rowCount: number;
  lines: AsyncGenerator<string>;
}

/**
 * S6-VV-101 (#496) — streams the filtered audit log as CSV or JSON Lines.
 * Pages by keyset (createdAt, id) so memory stays flat, and the export is
 * itself audited before the first byte is sent.
 */
@Injectable()
export class AuditLogExportService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  async prepare(
    query: ListAuditLogsQuery,
    format: AuditExportFormat,
    actorId: string,
  ): Promise<PreparedAuditExport> {
    const where = buildAuditLogWhere(query);
    const rowCount = await this.prisma.auditLog.count({ where });
    if (rowCount > AUDIT_EXPORT_MAX_ROWS) {
      throw new UnprocessableEntityException({
        error: 'export_too_large',
        message: `This filter matches ${rowCount} audit records; exports are limited to ${AUDIT_EXPORT_MAX_ROWS}. Narrow the date range or add an action/actor filter.`,
        statusCode: 422,
      });
    }

    await this.auditPublisher.record({
      actorId,
      action: 'audit.exported',
      resourceType: 'audit_log',
      resourceId: null,
      reasonCode: null,
      metadata: { format, rowCount, filter: query },
    });

    return { rowCount, lines: this.lines(where, format) };
  }

  private async *lines(
    where: ReturnType<typeof buildAuditLogWhere>,
    format: AuditExportFormat,
  ): AsyncGenerator<string> {
    yield auditExportHeader(format);
    let cursor: string | undefined;
    for (;;) {
      const page = await this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { email: true, role: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const row of page) yield auditExportLine(row, format);
      if (page.length < PAGE_SIZE) return;
      cursor = page[page.length - 1]?.id;
    }
  }
}
