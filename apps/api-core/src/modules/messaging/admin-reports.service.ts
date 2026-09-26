import { Inject, Injectable } from '@nestjs/common';
import type {
  AdminReportRow,
  ListAdminReportsQuery,
  ListAdminReportsResponse,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { decodeCursor, encodeCursor } from './messaging.service.js';

/**
 * Th6-430 — the moderation queue. Metadata only: who reported what is one click away on the detail
 * page, and the reported content (and the audited reason dialog) live there, never in this list.
 */
@Injectable()
export class AdminReportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: ListAdminReportsQuery): Promise<ListAdminReportsResponse> {
    const cursor = decodeCursor(query.cursor);
    const window = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
    const rows = await this.prisma.report.findMany({
      where: {
        ...(query.targetType ? { targetType: query.targetType } : {}),
        ...(query.status ? { status: query.status } : {}),
        // The date window and the cursor both bound createdAt, so they are combined, not overwritten.
        AND: [
          ...(Object.keys(window).length ? [{ createdAt: window }] : []),
          ...(cursor
            ? [
                {
                  OR: [
                    { createdAt: { lt: cursor.at } },
                    { createdAt: cursor.at, id: { lt: cursor.id } },
                  ],
                },
              ]
            : []),
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      select: { id: true, targetType: true, reason: true, status: true, createdAt: true },
    });
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      reports: page.map((row): AdminReportRow => ({
        id: row.id,
        targetType: row.targetType,
        reason: row.reason,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: rows.length > query.limit && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }
}
