import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListGradingQueueQuerySchema,
  ManualGradeResponseRequestSchema,
  UuidSchema,
  type ListGradingQueueResponse,
  type ManualGradeResponseResult,
} from '@smart/contracts';
import {
  Prisma,
  type AttemptStatus,
  type Evaluator,
  type ItemType,
} from '../../generated/prisma/index.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AttemptResultRecalculationService } from './attempt-result-recalculation.service.js';

const SUBJECTIVE_ITEM_TYPES = new Set(['SHORT_ANSWER', 'SCENARIO_RESPONSE', 'SPOKEN_RESPONSE']);
const GRADABLE_ATTEMPT_STATUSES = new Set(['SUBMITTED', 'EVALUATING', 'EVALUATED']);

function extractAnswerText(answer: unknown): string {
  if (!answer || typeof answer !== 'object') return '';
  const record = answer as Record<string, unknown>;
  if (record.kind === 'TEXT' && typeof record.text === 'string') return record.text;
  if (record.kind === 'AUDIO' && typeof record.transcript === 'string') return record.transcript;
  return JSON.stringify(answer);
}

@Injectable()
export class GradingAdminService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(AttemptResultRecalculationService)
    private readonly recalculation: AttemptResultRecalculationService,
  ) {}

  async listQueue(queryInput: unknown): Promise<ListGradingQueueResponse> {
    const query = ListGradingQueueQuerySchema.parse(queryInput ?? {});
    const skip = (query.page - 1) * query.pageSize;

    const where: Prisma.ResponseWhereInput = {
      item: { itemType: { in: Array.from(SUBJECTIVE_ITEM_TYPES) as ItemType[] } },
      OR: [{ evaluatedBy: null }, { evaluatedBy: { not: 'HUMAN_RATER' as Evaluator } }],
      attempt: {
        status: { in: Array.from(GRADABLE_ATTEMPT_STATUSES) as AttemptStatus[] },
      },
      answer: { not: Prisma.JsonNull },
    };

    const [rows, total] = await Promise.all([
      this.prisma.response.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: query.pageSize,
        include: {
          item: { select: { stem: true, itemType: true } },
          attempt: {
            include: {
              user: { select: { id: true, fullName: true } },
              level: { include: { track: { select: { code: true } } } },
            },
          },
        },
      }),
      this.prisma.response.count({ where }),
    ]);

    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: rows.map((row) => ({
        responseId: row.id,
        attemptId: row.attemptId,
        itemId: row.itemId,
        studentId: row.attempt.userId,
        studentName: row.attempt.user.fullName,
        trackCode: row.attempt.level.track.code,
        levelNumber: row.attempt.level
          .levelNumber as ListGradingQueueResponse['items'][number]['levelNumber'],
        itemType: row.item.itemType,
        stem: row.item.stem,
        answerText: extractAnswerText(row.answer),
        maxScore: Number(row.maxScore),
        currentScore: row.score != null ? Number(row.score) : null,
        evaluatedBy: row.evaluatedBy,
        attemptStatus: row.attempt.status,
        submittedAt: row.attempt.completedAt?.toISOString() ?? null,
      })),
    };
  }

  async gradeResponse(
    actorId: string,
    responseId: string,
    body: unknown,
  ): Promise<ManualGradeResponseResult> {
    const id = UuidSchema.parse(responseId);
    const request = ManualGradeResponseRequestSchema.parse(body);

    const response = await this.prisma.response.findUnique({
      where: { id },
      include: {
        item: true,
        attempt: { include: { level: { include: { track: true } } } },
      },
    });
    if (!response) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Response not found.',
        statusCode: 404,
      });
    }
    if (!SUBJECTIVE_ITEM_TYPES.has(response.item.itemType)) {
      throw new BadRequestException({
        error: 'not_subjective',
        message: 'Only subjective responses can be manually graded.',
        statusCode: 400,
      });
    }
    if (!GRADABLE_ATTEMPT_STATUSES.has(response.attempt.status)) {
      throw new ConflictException({
        error: 'attempt_not_gradable',
        message: 'Attempt is not in a gradable state.',
        statusCode: 409,
      });
    }

    const maxScore = Number(response.maxScore);
    if (request.score < 0 || request.score > maxScore) {
      throw new BadRequestException({
        error: 'invalid_score',
        message: `Score must be between 0 and ${maxScore}.`,
        statusCode: 400,
      });
    }

    const previousScore = response.score != null ? Number(response.score) : null;
    const previousEvaluator = response.evaluatedBy;
    if (
      previousEvaluator === 'HUMAN_RATER' &&
      previousScore !== null &&
      previousScore === request.score
    ) {
      const recalculated = await this.recalculation.recalculateForAttempt(response.attemptId);
      return {
        responseId: id,
        attemptId: response.attemptId,
        score: request.score,
        maxScore,
        evaluatedBy: 'HUMAN_RATER',
        evaluatedAt: response.evaluatedAt?.toISOString() ?? new Date().toISOString(),
        attemptScorePercent: recalculated.scorePercent,
        tierAwarded: recalculated.tierAwarded as ManualGradeResponseResult['tierAwarded'],
      };
    }

    const evaluatedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.response.update({
        where: { id },
        data: {
          score: request.score,
          evaluatedBy: 'HUMAN_RATER',
          evaluatedAt,
        },
      });
    });

    const recalculated = await this.recalculation.recalculateForAttempt(response.attemptId);

    await this.auditPublisher.record({
      actorId,
      action: 'admin.response.graded',
      resourceType: 'Response',
      resourceId: id,
      reasonCode: request.reason ?? null,
      metadata: {
        attemptId: response.attemptId,
        itemId: response.itemId,
        previousScore,
        newScore: request.score,
        previousEvaluator,
        newEvaluator: 'HUMAN_RATER',
        attemptScorePercent: recalculated.scorePercent,
      },
    });

    return {
      responseId: id,
      attemptId: response.attemptId,
      score: request.score,
      maxScore,
      evaluatedBy: 'HUMAN_RATER',
      evaluatedAt: evaluatedAt.toISOString(),
      attemptScorePercent: recalculated.scorePercent,
      tierAwarded: recalculated.tierAwarded as ManualGradeResponseResult['tierAwarded'],
    };
  }
}
