import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  assignTier,
  computeMarkWeightedScore,
  MARK_WEIGHTS,
  type CutScore,
  type MarkWeightedItemType,
} from '@smart/scoring-engine';
import type { CertifiableTier } from '@smart/contracts';
import { Effect, Either } from 'effect';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

export type AttemptRecalculationResult = {
  attemptId: string;
  marksEarned: number;
  marksTotal: number;
  scorePercent: number;
  tierAwarded: string | null;
  confidenceBand: string | null;
  borderline: boolean;
};

function num(value: { toNumber?: () => number } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

function toCutScore(tier: CertifiableTier, mean: number, sd: number): CutScore {
  return {
    tier,
    mean,
    sd,
    panelistCount: 3,
    lowerBound: Math.max(0, mean - sd),
    upperBound: Math.min(100, mean + sd),
  };
}

@Injectable()
export class AttemptResultRecalculationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Recomputes attempt aggregate score from persisted Response rows.
   * Uses the same mark-weighted semantics as AssessmentService.completeAttempt.
   */
  async recalculateForAttempt(attemptId: string): Promise<AttemptRecalculationResult> {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        level: { include: { cutScores: true } },
        responses: { include: { item: true } },
        result: true,
      },
    });
    if (!attempt) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Attempt not found.',
        statusCode: 404,
      });
    }

    const scored: { itemId: string; marksEarned: number; marksMax: number }[] = [];
    for (const response of attempt.responses) {
      const itemType = response.item.itemType as MarkWeightedItemType;
      const weight = (MARK_WEIGHTS as Record<string, number | undefined>)[itemType];
      if (weight === undefined) continue;
      const marksMax = num(response.maxScore) > 0 ? num(response.maxScore) : weight;
      const marksEarned =
        response.score != null ? Math.min(Math.max(num(response.score), 0), marksMax) : 0;
      scored.push({ itemId: response.itemId, marksEarned, marksMax });
    }

    if (scored.length === 0) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Attempt has no scoreable responses.',
        statusCode: 400,
      });
    }

    const aggregate = Effect.runSync(Effect.either(computeMarkWeightedScore(scored)));
    if (Either.isLeft(aggregate)) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: aggregate.left.message,
        statusCode: 400,
      });
    }

    const { marksEarned, marksTotal, scorePercent } = aggregate.right;
    const published = attempt.level.cutScores.filter((row) => row.published);
    let tierAwarded: string | null = null;
    let confidenceBand: string | null = null;
    let borderline = false;

    if (published.length >= 3) {
      const byTier = Object.fromEntries(published.map((row) => [row.tier, row]));
      const gold = byTier.GOLD;
      const silver = byTier.SILVER;
      const bronze = byTier.BRONZE;
      if (gold && silver && bronze) {
        const assignment = Effect.runSync(
          assignTier(scorePercent, {
            gold: toCutScore('GOLD', num(gold.mean), num(gold.sd)),
            silver: toCutScore('SILVER', num(silver.mean), num(silver.sd)),
            bronze: toCutScore('BRONZE', num(bronze.mean), num(bronze.sd)),
          }),
        );
        tierAwarded = assignment.tier;
        confidenceBand = assignment.confidenceBand;
        borderline = assignment.borderline;
      }
    }

    if (attempt.result) {
      await this.prisma.levelResult.update({
        where: { attemptId },
        data: {
          rawScore: scorePercent,
          tierAwarded: (tierAwarded ?? null) as never,
          confidenceBand: confidenceBand ?? attempt.result.confidenceBand,
          borderline,
        },
      });
    } else {
      await this.prisma.levelResult.create({
        data: {
          attemptId,
          levelId: attempt.levelId,
          rawScore: scorePercent,
          tierAwarded: (tierAwarded ?? null) as never,
          confidenceBand: confidenceBand ?? `${scorePercent}%`,
          borderline,
        },
      });
    }

    return {
      attemptId,
      marksEarned,
      marksTotal,
      scorePercent,
      tierAwarded,
      confidenceBand,
      borderline,
    };
  }
}
