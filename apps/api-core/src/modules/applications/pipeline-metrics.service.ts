import { Inject, Injectable } from '@nestjs/common';
import type { ConversionMetrics, ConversionMetricsQuery } from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

function rate(entered: number, converted: number) {
  return {
    entered,
    converted,
    // Nobody entered: no rate, never a divide-by-zero.
    ratePercent: entered === 0 ? null : Math.round((converted / entered) * 1000) / 10,
  };
}

/**
 * Th6-421 — shortlist→interview and interview→hire conversion, counted from the append-only stage
 * history. Each application counts once per stage however many times it moved, so a retry or a
 * back-and-forth never inflates a rate. Read-only; the admin controller gates access.
 */
@Injectable()
export class PipelineMetricsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async conversion(query: ConversionMetricsQuery): Promise<ConversionMetrics> {
    const events = await this.prisma.applicationStageEvent.findMany({
      where: {
        toStatus: { in: ['REVIEWING', 'INTERVIEWING', 'HIRED'] },
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      select: { applicationId: true, toStatus: true },
    });

    const reached = {
      REVIEWING: new Set<string>(),
      INTERVIEWING: new Set<string>(),
      HIRED: new Set<string>(),
    };
    for (const event of events) {
      if (
        event.toStatus === 'REVIEWING' ||
        event.toStatus === 'INTERVIEWING' ||
        event.toStatus === 'HIRED'
      ) {
        reached[event.toStatus].add(event.applicationId);
      }
    }
    const count = (from: Set<string>, to: Set<string>) =>
      [...from].filter((id) => to.has(id)).length;

    return {
      status: reached.REVIEWING.size === 0 && reached.INTERVIEWING.size === 0 ? 'empty' : 'ready',
      shortlistToInterview: rate(
        reached.REVIEWING.size,
        count(reached.REVIEWING, reached.INTERVIEWING),
      ),
      interviewToHire: rate(reached.INTERVIEWING.size, count(reached.INTERVIEWING, reached.HIRED)),
      from: query.from ?? null,
      to: query.to ?? null,
      calculatedAt: new Date().toISOString(),
    };
  }
}
