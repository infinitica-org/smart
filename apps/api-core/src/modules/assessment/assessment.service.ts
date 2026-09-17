import { randomUUID } from 'node:crypto';
import {
  SkillClaimDtoSchema,
  SMART_TOPICS,
  UuidSchema,
  type AiCompletionRequest,
  type AttemptSessionDto,
  type AttemptStatus,
  type CompleteAttemptRequest,
  type CompleteAttemptResponse,
  type DeclareSkillClaimRequest,
  type SkillClaimDto,
  type SkillClaimStatus,
  type SkillProficiency,
  type DeliverableItemDto,
  type DifficultyTag,
  type DomainCode,
  type IntegrityFlag,
  type IntegrityQueueItemDto,
  type IntegrityQueueStatus,
  type ItemType,
  type LevelFormat,
  type LevelNumber,
  type NextItemDto,
  type ProctoringSeverity,
  type ProctoringViolationKind,
  type SaveDraftRequest,
  type SaveDraftResponse,
  type StartAttemptRequest,
  type Tier,
  type TrackCode,
  SKILL_DEFINITIONS,
  SKILL_REFRESH_DAYS,
  AssessmentResultSchema,
  hydrateFocusProgress,
  focusProgressFor,
  resolveSkillFocus,
  skillFocusFromMetadata,
  skillClaimVerificationInProgress,
} from '@smart/contracts';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { attemptsStarted, cacheOperations, draftsSaved, getContext } from '@smart/observability';
import { Effect, Either } from 'effect';
import { z } from 'zod';
import {
  computeMarkWeightedScore,
  MARK_WEIGHTS,
  type MarkWeightedItemType,
} from '@smart/scoring-engine';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { env } from '../../platform/config/env.js';
import { ItemRotationService } from './item-rotation.service.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Prisma } from '../../generated/prisma/index.js';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import { passThresholdsFor } from '../catalog/skill-pass-thresholds.js';
import { bandForScore, integrityScore, type StoredViolation } from '../proctoring/risk.js';
import {
  applySkillClaimTransition,
  type SkillClaimEvent,
  type SkillClaimSnapshot,
} from './skill-claim-state-machine.js';

const RubricGradeSchema = z.object({
  marksAwarded: z.number().min(0),
  justification: z.string().min(10).max(2_000),
});

const SESSION_TTL_SECONDS = 7200; // 2 hours TTL per spec
const ITEM_BANK_TTL_SECONDS = 86400; // 24 hours TTL per spec

interface StoredDraft {
  attemptId: string;
  itemId: string;
  answer: unknown;
  clientSequence: number;
  updatedAt: string;
}
interface AttemptWithLevelAndResponses {
  id: string;
  userId: string;
  formCode: string;
  status: string;
  integrityFlag: string;
  startedAt: Date;
  expiresAt: Date;
  level: {
    levelNumber: number;
    format: string;
    itemCount: number | null;
    track: {
      code: string;
    };
  };
  responses?: unknown[];
}

interface AttemptWithUserAndEvents {
  id: string;
  userId: string;
  integrityFlag: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  user: { fullName: string; email: string };
  events: { detail: unknown; createdAt: Date }[];
}

@Injectable()
export class AssessmentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssessmentService.name);
  readonly owner = 'Vishal Bharath R';
  readonly purpose = 'Attempt lifecycle, item delivery, integrity.';
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(ItemRotationService) private readonly rotation: ItemRotationService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(AiGatewayService) private readonly aiGateway: AiGatewayService,
  ) {}

  onModuleInit() {
    this.flushTimer = setInterval(() => {
      this.flushDraftsToPostgres().catch((err) => {
        this.logger.error({ err }, 'Failed periodic PostgreSQL batch flush of drafts');
      });
    }, 5000);
    this.flushTimer.unref();
  }

  onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async flushDraftsToPostgres(): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;
    try {
      let dirtyKeys: string[] = [];
      try {
        dirtyKeys = await this.redis.smembers('drafts:dirty');
      } catch (err) {
        this.logger.error({ err }, 'Redis error while reading dirty drafts for flush');
        return;
      }

      if (!dirtyKeys || dirtyKeys.length === 0) return;

      for (const compositeKey of dirtyKeys) {
        const parts = compositeKey.split(':');
        if (parts.length !== 2) continue;
        const [attemptId, itemId] = parts;
        const draftKey = `draft:assessment:${attemptId}:${itemId}`;

        let rawDraft: string | null = null;
        try {
          rawDraft = await this.redis.get(draftKey);
        } catch {
          continue;
        }

        if (!rawDraft) {
          try {
            await this.redis.srem('drafts:dirty', compositeKey);
          } catch {
            // Ignore srem error
          }
          continue;
        }

        try {
          const draft = JSON.parse(rawDraft) as StoredDraft;
          const answerPayloadWithSeq =
            typeof draft.answer === 'object' && draft.answer !== null
              ? {
                  ...(draft.answer as Record<string, unknown>),
                  _clientSequence: draft.clientSequence,
                }
              : draft.answer;

          await this.prisma.response.upsert({
            where: { attemptId_itemId: { attemptId: draft.attemptId, itemId: draft.itemId } },
            update: { answer: answerPayloadWithSeq as Prisma.InputJsonValue },
            create: {
              attemptId: draft.attemptId,
              itemId: draft.itemId,
              answer: answerPayloadWithSeq as Prisma.InputJsonValue,
            },
          });
          await this.redis.srem('drafts:dirty', compositeKey);
        } catch (err) {
          this.logger.error(
            { err, attemptId, itemId },
            'Failed to flush draft to PostgreSQL; will retry next interval',
          );
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * GET /assessment/skill-claims — existing SkillClaimDto only.
   * Students see their rows; TPO roles see claims of students in JWT `inst`.
   */
  async listSkillClaims(user: RequestUser): Promise<SkillClaimDto[]> {
    if (user.role === 'STUDENT') {
      return this.mapSkillClaims(
        await this.prisma.skillClaim.findMany({
          where: { studentId: user.sub },
          include: { skill: { select: { code: true } } },
          orderBy: { updatedAt: 'desc' },
        }),
      );
    }

    if (user.role === 'INSTITUTION_ADMIN' || user.role === 'PLACEMENT_STAFF') {
      if (!user.inst) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'Placement staff must belong to an institution.',
          statusCode: 403,
        });
      }
      return this.mapSkillClaims(
        await this.prisma.skillClaim.findMany({
          where: { student: { institutionId: user.inst, role: 'STUDENT' } },
          include: { skill: { select: { code: true } } },
          orderBy: { updatedAt: 'desc' },
        }),
      );
    }

    throw new ForbiddenException({
      error: 'forbidden',
      message: 'You do not have permission to list skill claims.',
      statusCode: 403,
    });
  }

  /**
   * POST /assessment/skill-claims — CN-T04 declare.
   * Writes SkillClaim at DECLARED. Re-declare after LOCKED cooldown (SE-T01 / playbook).
   */
  async declareSkillClaim(
    user: RequestUser,
    body: DeclareSkillClaimRequest,
    provenance?: { source: 'GITHUB_DERIVED'; sourceMetadata: Record<string, unknown> },
  ): Promise<SkillClaimDto> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only students can declare skill claims.',
        statusCode: 403,
      });
    }

    const def = SKILL_DEFINITIONS.find((skill) => skill.code === body.skillCode);
    if (!def || def.domain !== 'SOFTWARE_IT') {
      throw new BadRequestException({
        error: 'invalid_skill',
        message: `Unknown Software & IT skill code: ${body.skillCode}`,
        statusCode: 400,
      });
    }

    const skill =
      (await this.prisma.skill.findUnique({ where: { code: def.code } })) ??
      (await this.prisma.skill.create({
        data: {
          code: def.code,
          name: def.name,
          domain: def.domain,
        },
      }));

    const existing = await this.prisma.skillClaim.findUnique({
      where: {
        studentId_skillId: { studentId: user.sub, skillId: skill.id },
      },
      include: { skill: { select: { code: true } } },
    });

    const now = new Date();
    const skillFocus = resolveSkillFocus(def.code, body.skillFocus);
    const nextMetadata = this.claimMetadata(existing?.sourceMetadata, provenance, skillFocus);

    if (existing && (existing.status === 'DECLARED' || existing.status === 'BEGINNER_REATTEMPT')) {
      const row = await this.prisma.skillClaim.update({
        where: { id: existing.id },
        data: {
          ...(existing.status === 'DECLARED' ? { proficiency: body.proficiency } : {}),
          sourceMetadata: nextMetadata,
        },
        include: { skill: { select: { code: true } } },
      });
      const mapped = await this.mapSkillClaims([row]);
      const dto = mapped[0];
      if (!dto) {
        throw new NotFoundException({
          error: 'not_found',
          message: 'Declared skill claim could not be loaded.',
          statusCode: 404,
        });
      }
      return dto;
    }

    if (existing && existing.status !== 'LOCKED') {
      throw new ConflictException({
        error: 'skill_already_claimed',
        message: `Skill ${def.code} is already claimed (${existing.status}).`,
        statusCode: 409,
      });
    }

    if (existing?.status === 'LOCKED') {
      if (existing.lockedUntil && existing.lockedUntil.getTime() > now.getTime()) {
        throw new ForbiddenException({
          error: 'skill_locked',
          message: `Skill is locked until ${existing.lockedUntil.toISOString()}. Refresh window is ${String(SKILL_REFRESH_DAYS)} days.`,
          statusCode: 403,
          lockedUntil: existing.lockedUntil.toISOString(),
        });
      }
    }

    const row = existing
      ? await this.prisma.skillClaim.update({
          where: { id: existing.id },
          data: {
            proficiency: body.proficiency,
            status: 'DECLARED',
            source: provenance?.source ?? 'MANUAL',
            sourceMetadata: nextMetadata,
            strikes: 0,
            lockedUntil: null,
            lastAttemptId: null,
            verifiedUntil: null,
          },
          include: { skill: { select: { code: true } } },
        })
      : await this.prisma.skillClaim.create({
          data: {
            studentId: user.sub,
            skillId: skill.id,
            proficiency: body.proficiency,
            status: 'DECLARED',
            source: provenance?.source ?? 'MANUAL',
            sourceMetadata: nextMetadata,
          },
          include: { skill: { select: { code: true } } },
        });

    const mapped = await this.mapSkillClaims([row]);
    const dto = mapped[0];
    if (!dto) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Declared skill claim could not be loaded.',
        statusCode: 404,
      });
    }
    return dto;
  }

  private claimMetadata(
    existing: unknown,
    provenance: { source: 'GITHUB_DERIVED'; sourceMetadata: Record<string, unknown> } | undefined,
    skillFocus: string | null,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    const fromExisting =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
    const merged = {
      ...fromExisting,
      ...(provenance?.sourceMetadata ?? {}),
      ...(skillFocus ? { skillFocus } : {}),
    };
    return Object.keys(merged).length > 0 ? (merged as Prisma.InputJsonValue) : Prisma.JsonNull;
  }

  private async mapSkillClaims(
    rows: Array<{
      id: string;
      studentId: string;
      proficiency: SkillClaimDto['proficiency'];
      status: SkillClaimDto['status'];
      strikes: number;
      lockedUntil: Date | null;
      lastAttemptId: string | null;
      sourceMetadata?: unknown;
      skill: { code: string };
    }>,
  ): Promise<SkillClaimDto[]> {
    if (rows.length === 0) return [];
    const claimIds = rows.map((row) => row.id);
    const failures = await this.prisma.skillVerificationAttempt.findMany({
      where: {
        claimId: { in: claimIds },
        OR: [{ passed: false }, { technicalFailure: true }],
      },
      orderBy: { createdAt: 'desc' },
      select: { claimId: true, createdAt: true },
    });
    const passedAttempts = await this.prisma.skillVerificationAttempt.findMany({
      where: {
        claimId: { in: claimIds },
        passed: true,
      },
      orderBy: { createdAt: 'desc' },
      select: { claimId: true, assessmentResultJson: true },
    });
    const lastFail = new Map<string, Date>();
    for (const row of failures) {
      if (!lastFail.has(row.claimId)) lastFail.set(row.claimId, row.createdAt);
    }
    const latestAssessment = new Map<string, SkillClaimDto['latestAssessmentResult']>();
    for (const row of passedAttempts) {
      if (latestAssessment.has(row.claimId) || row.assessmentResultJson == null) continue;
      const parsed = AssessmentResultSchema.safeParse(row.assessmentResultJson);
      if (parsed.success) latestAssessment.set(row.claimId, parsed.data);
    }
    return rows.map((row) => {
      const lastGenuineFailureAt = lastFail.get(row.id)?.toISOString() ?? null;
      const progress = hydrateFocusProgress({
        skillCode: row.skill.code,
        metadata: row.sourceMetadata,
        status: row.status,
        strikes: row.strikes,
        lockedUntil: row.lockedUntil?.toISOString() ?? null,
        lastAttemptId: row.lastAttemptId,
        lastGenuineFailureAt,
      });
      const skillFocus = resolveSkillFocus(
        row.skill.code,
        skillFocusFromMetadata(row.sourceMetadata),
      );
      const selected = skillFocus ? focusProgressFor(progress, skillFocus) : null;
      const lastAttemptId = selected?.lastAttemptId ?? row.lastAttemptId;
      const verificationInProgress = skillClaimVerificationInProgress({
        lastAttemptId,
        sourceMetadata: row.sourceMetadata,
      });
      return SkillClaimDtoSchema.parse({
        claimId: row.id,
        studentId: row.studentId,
        skillCode: row.skill.code,
        proficiency: row.proficiency,
        status: selected?.status ?? row.status,
        strikes: selected?.strikes ?? row.strikes,
        lockedUntil: selected?.lockedUntil ?? row.lockedUntil?.toISOString() ?? null,
        lastAttemptId,
        skillFocus,
        focusProgress: progress,
        retryAvailableAt: selected?.retryAvailableAt ?? null,
        latestAssessmentResult: latestAssessment.get(row.id) ?? null,
        verificationInProgress,
      });
    });
  }

  /**
   * POST /assessment/complete — SE-T01/CN-T04 finalisation.
   *
   * Scores the attempt's responses with the INF-05 mark-weighted formula
   * (`@smart/scoring-engine`), then — when `claimId` is supplied — drives
   * `applySkillClaimTransition` against the SkillClaim's PRD v1 §7.3 pass
   * bars (`skill-pass-thresholds.ts`) and persists the result. Without
   * `claimId` this only finalises the attempt and returns its score.
   *
   * KNOWN GAP: CODE_TASK/SQL_TASK items cannot be auto-scored yet — the
   * `sandbox` execution runner (owner: Vishal V) is unimplemented. Such
   * items score 0 of their max and the response is marked `incomplete`, so a
   * caller must not treat a passing score as final while `incomplete` is
   * true.
   */
  async completeAttempt(
    user: RequestUser,
    body: CompleteAttemptRequest,
  ): Promise<CompleteAttemptResponse> {
    await this.flushDraftsToPostgres();

    const attempt = await this.prisma.attempt.findUnique({
      where: { id: body.attemptId },
      include: {
        level: { include: { track: true } },
        responses: { include: { item: { include: { options: true } } } },
      },
    });
    if (!attempt) {
      throw new NotFoundException({
        error: 'not_found',
        message: `Attempt ${body.attemptId} not found.`,
        statusCode: 404,
      });
    }
    if (attempt.userId !== user.sub) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You cannot complete another candidate’s attempt.',
        statusCode: 403,
      });
    }
    if (attempt.status === 'EVALUATED' || attempt.status === 'VOIDED') {
      throw new ConflictException({
        error: 'attempt_already_submitted',
        message: `Attempt is already ${attempt.status}.`,
        statusCode: 409,
      });
    }

    const { marksEarned, marksTotal, scorePercent, incomplete } = await this.scoreResponses(
      attempt.responses,
      body.attemptId,
    );

    let claimDto: SkillClaimDto | null = null;

    if (body.claimId) {
      claimDto = await this.settleSkillClaim(
        user,
        body,
        attempt.level.track.code as TrackCode,
        marksEarned,
        marksTotal,
        scorePercent,
      );
    }

    const submittedAt = new Date();
    const remainingSeconds = attempt.expiresAt
      ? Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000))
      : 0;
    const autoSubmitted = body.autoSubmitted || remainingSeconds <= 0;

    const responses = (attempt.responses ?? []).map((row) => {
      const raw = row.answer;
      let answer: unknown = raw;
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && '_clientSequence' in raw) {
        const { _clientSequence, ...rest } = raw as Record<string, unknown>;
        answer = rest;
      }
      const itemId = row.item.id;
      const competencyIdRaw =
        typeof row.item.competencyId === 'string' ? row.item.competencyId : itemId;
      const responseId = UuidSchema.safeParse(row.id).success ? row.id : randomUUID();
      const competencyId = UuidSchema.safeParse(competencyIdRaw).success ? competencyIdRaw : itemId;
      return {
        responseId,
        itemId,
        competencyId,
        itemWeight: 1,
        answer,
        objectKey: null,
      };
    });

    await this.prisma.attempt.update({
      where: { id: body.attemptId },
      data: { status: 'EVALUATED', completedAt: submittedAt },
    });

    await this.outbox.enqueueAssessmentSubmitted({
      meta: {
        eventId: randomUUID(),
        eventType: SMART_TOPICS.assessmentSubmitted,
        version: 1 as const,
        occurredAt: submittedAt.toISOString(),
        traceId: getContext()?.correlationId ?? randomUUID(),
        source: 'assessment',
      },
      data: {
        attemptId: attempt.id,
        studentId: attempt.userId,
        trackCode: attempt.level.track.code as TrackCode,
        levelNumber: (attempt.level.levelNumber ?? 1) as LevelNumber,
        status: 'EVALUATED' as AttemptStatus,
        autoSubmitted,
        integrityFlag: (attempt.integrityFlag ?? 'CLEAN') as IntegrityFlag,
        submittedAt: submittedAt.toISOString(),
        responses,
      },
    });

    try {
      const cached = await this.redis.get(`session:assessment:${attempt.id}`);
      if (cached) {
        const session = JSON.parse(cached) as AttemptSessionDto;
        if (session.studentId === user.sub) {
          session.status = 'EVALUATED';
          session.locked = true;
          session.serverRemainingSeconds = remainingSeconds;
          await this.saveRedisSession(session);
        }
      }
    } catch {
      // Session lock is best-effort; Postgres status is authoritative.
    }

    return {
      attemptId: body.attemptId,
      status: 'EVALUATED',
      evaluationJobId: null,
      estimatedResultSeconds: null,
      marksEarned,
      marksTotal,
      scorePercent,
      incomplete,
      claim: claimDto,
    };
  }

  private async scoreResponses(
    responses: readonly {
      id: string;
      answer: unknown;
      item: {
        id: string;
        itemType: string;
        stem: string;
        modelAnswer: unknown;
        options: readonly { id: string; isCorrect: boolean }[];
      };
    }[],
    attemptId: string,
  ): Promise<{
    marksEarned: number;
    marksTotal: number;
    scorePercent: number;
    incomplete: boolean;
  }> {
    const scored: { itemId: string; marksEarned: number; marksMax: number }[] = [];
    let incomplete = false;

    for (const response of responses) {
      const itemType = response.item.itemType as MarkWeightedItemType;
      const weight = (MARK_WEIGHTS as Record<string, number | undefined>)[itemType];
      if (weight === undefined) continue; // outside the INF-05 mark-weighted set (e.g. L3/L4/L5 items)

      const answer = response.answer as {
        kind?: unknown;
        selectedOptionIds?: unknown;
        text?: unknown;
      } | null;

      if (itemType === 'MCQ_SINGLE' || itemType === 'MCQ_MULTI' || itemType === 'NUMERIC_ENTRY') {
        const selected = new Set(
          answer?.kind === 'MCQ' && Array.isArray(answer.selectedOptionIds)
            ? answer.selectedOptionIds.filter((id): id is string => typeof id === 'string')
            : [],
        );
        const correctIds = new Set(
          response.item.options.filter((o) => o.isCorrect).map((o) => o.id),
        );
        const isCorrect =
          selected.size > 0 &&
          selected.size === correctIds.size &&
          [...selected].every((id) => correctIds.has(id));
        scored.push({
          itemId: response.item.id,
          marksEarned: isCorrect ? weight : 0,
          marksMax: weight,
        });
        continue;
      }

      if (itemType === 'SHORT_ANSWER' || itemType === 'SCENARIO_RESPONSE') {
        const candidateResponse =
          answer?.kind === 'TEXT' && typeof answer.text === 'string' ? answer.text : '';
        const modelAnswer =
          typeof response.item.modelAnswer === 'string'
            ? response.item.modelAnswer
            : JSON.stringify(response.item.modelAnswer ?? '');
        const promptRef =
          itemType === 'SHORT_ANSWER' ? 'proficiency-short-answer@1' : 'proficiency-long-answer@1';

        const completion = await this.aiGateway.complete(
          this.buildProficiencyCompletionRequest(promptRef, response.id, attemptId, {
            prompt: response.item.stem,
            modelAnswer,
            candidateResponse,
          }),
        );
        const grade = RubricGradeSchema.parse(completion.output);
        scored.push({
          itemId: response.item.id,
          marksEarned: Math.min(Math.max(grade.marksAwarded, 0), weight),
          marksMax: weight,
        });
        continue;
      }

      // CODE_TASK / SQL_TASK: no automated test-runner yet (sandbox module is
      // an unimplemented scaffold). Count the marks as available but unearned,
      // and flag the attempt incomplete rather than silently under-scoring it.
      incomplete = true;
      scored.push({ itemId: response.item.id, marksEarned: 0, marksMax: weight });
    }

    if (scored.length === 0) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Attempt has no scoreable responses (MCQ/short/long-answer/coding).',
        statusCode: 400,
      });
    }

    const result = Effect.runSync(Effect.either(computeMarkWeightedScore(scored)));
    if (Either.isLeft(result)) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: result.left.message,
        statusCode: 400,
      });
    }

    return { ...result.right, incomplete };
  }

  private async settleSkillClaim(
    user: RequestUser,
    body: CompleteAttemptRequest,
    trackCode: TrackCode,
    marksEarned: number,
    marksTotal: number,
    scorePercent: number,
  ): Promise<SkillClaimDto> {
    const claim = await this.prisma.skillClaim.findUnique({
      where: { id: body.claimId },
      include: { skill: true },
    });
    if (!claim || claim.studentId !== user.sub) {
      throw new NotFoundException({
        error: 'not_found',
        message: `Skill claim ${String(body.claimId)} not found.`,
        statusCode: 404,
      });
    }

    const thresholds = passThresholdsFor(trackCode, claim.skill.name)[claim.proficiency];
    const assessmentPassed = scorePercent / 100 >= thresholds.assessmentPass;
    const interviewRequired = thresholds.interviewPass !== null;
    const genuinePass = assessmentPassed && (!interviewRequired || body.interviewPassed === true);

    const lastFailure = await this.prisma.skillVerificationAttempt.findFirst({
      where: { claimId: claim.id, passed: false, technicalFailure: false },
      orderBy: { createdAt: 'desc' },
    });

    const snapshot: SkillClaimSnapshot = {
      status: claim.status as SkillClaimStatus,
      proficiency: claim.proficiency as SkillProficiency,
      strikes: claim.strikes,
      lockedUntil: claim.lockedUntil,
      verifiedUntil: claim.verifiedUntil,
    };
    const event: SkillClaimEvent = body.technicalFailure
      ? { type: 'TECHNICAL_FAILURE' }
      : genuinePass
        ? { type: 'GENUINE_PASS' }
        : { type: 'GENUINE_FAIL' };

    const transition = applySkillClaimTransition({
      claim: snapshot,
      event,
      now: new Date(),
      lastGenuineFailureAt: lastFailure?.createdAt ?? null,
    });

    if (!transition.accepted) {
      throw new ForbiddenException({
        error: 'skill_claim_blocked',
        message: `Cannot settle skill claim: ${String(transition.blockReason)}.`,
        statusCode: 403,
        blockReason: transition.blockReason,
      });
    }

    const [updatedClaim] = await this.prisma.$transaction([
      this.prisma.skillClaim.update({
        where: { id: claim.id },
        data: {
          status: transition.next.status,
          proficiency: transition.next.proficiency,
          strikes: transition.next.strikes,
          lockedUntil: transition.next.lockedUntil,
          verifiedUntil: transition.next.verifiedUntil,
          lastAttemptId: body.attemptId,
        },
        include: { skill: { select: { code: true } } },
      }),
      this.prisma.skillVerificationAttempt.create({
        data: {
          claimId: claim.id,
          assessmentAttemptId: body.attemptId,
          claimedProficiency: claim.proficiency,
          technicalFailure: body.technicalFailure,
          passed: body.technicalFailure ? null : genuinePass,
          explanation:
            body.explanation ??
            (assessmentPassed
              ? 'Assessment score cleared the pass bar.'
              : 'Assessment score did not clear the pass bar.'),
          marksEarned,
          marksTotal,
          scorePercent,
        },
      }),
    ]);

    const [mapped] = await this.mapSkillClaims([updatedClaim]);
    if (!mapped) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Settled skill claim could not be loaded.',
        statusCode: 404,
      });
    }
    return mapped;
  }

  private buildProficiencyCompletionRequest(
    promptRef: AiCompletionRequest['promptRef'],
    responseId: string,
    attemptId: string,
    variables: Record<string, unknown>,
  ): AiCompletionRequest {
    return {
      promptRef,
      modelRole: 'PRIMARY_REASONING',
      priority: 'P2_ASYNC_EVAL',
      variables,
      correlation: { responseId, attemptId },
      maxOutputTokens: 1_024,
      temperature: 0,
    };
  }

  async saveDraft(studentId: string, dto: SaveDraftRequest): Promise<SaveDraftResponse> {
    const session = await this.getSession(studentId, dto.attemptId);

    if (session.locked || session.serverRemainingSeconds <= 0) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Assessment session is locked or expired.',
        statusCode: 403,
      });
    }

    const draftKey = `draft:assessment:${dto.attemptId}:${dto.itemId}`;
    const draftsSetKey = `drafts:set:${dto.attemptId}`;

    let isRedisAvailable = true;
    let existingDraft: StoredDraft | null = null;

    try {
      const raw = await this.redis.get(draftKey);
      if (raw) {
        existingDraft = JSON.parse(raw) as StoredDraft;
      }
    } catch (err) {
      isRedisAvailable = false;
      this.logger.warn(
        { err, attemptId: dto.attemptId, itemId: dto.itemId },
        'Redis down during draft read — falling back to PostgreSQL',
      );
    }

    if (isRedisAvailable) {
      if (existingDraft && existingDraft.clientSequence >= dto.clientSequence) {
        const answeredCount = await this.getAnsweredItemsCount(dto.attemptId);
        this.logger.log(
          {
            attemptId: dto.attemptId,
            itemId: dto.itemId,
            clientSequence: dto.clientSequence,
            existingSequence: existingDraft.clientSequence,
            superseded: true,
          },
          'assessment.draft-superseded',
        );
        return {
          accepted: false,
          superseded: true,
          answeredItems: answeredCount,
          serverRemainingSeconds: session.serverRemainingSeconds,
        };
      }

      const newDraft: StoredDraft = {
        attemptId: dto.attemptId,
        itemId: dto.itemId,
        answer: dto.answer,
        clientSequence: dto.clientSequence,
        updatedAt: new Date().toISOString(),
      };

      try {
        await this.redis.setex(draftKey, SESSION_TTL_SECONDS, JSON.stringify(newDraft));
        await this.redis.sadd(draftsSetKey, dto.itemId);
        await this.redis.expire(draftsSetKey, SESSION_TTL_SECONDS);
        await this.redis.sadd('drafts:dirty', `${dto.attemptId}:${dto.itemId}`);
      } catch (err) {
        isRedisAvailable = false;
        this.logger.warn(
          { err, attemptId: dto.attemptId, itemId: dto.itemId },
          'Redis write failed — falling back to PostgreSQL direct write',
        );
      }

      if (isRedisAvailable) {
        draftsSaved?.inc({
          track_code: session.trackCode,
          level_number: String(session.levelNumber),
        });

        this.logger.log(
          {
            attemptId: dto.attemptId,
            itemId: dto.itemId,
            clientSequence: dto.clientSequence,
            superseded: false,
          },
          'assessment.draft-saved',
        );

        const answeredCount = await this.getAnsweredItemsCount(dto.attemptId);
        return {
          accepted: true,
          superseded: false,
          answeredItems: answeredCount,
          serverRemainingSeconds: session.serverRemainingSeconds,
        };
      }
    }

    // Redis Degradation Fallback Path to PostgreSQL
    const existingDb = await this.prisma.response.findUnique({
      where: { attemptId_itemId: { attemptId: dto.attemptId, itemId: dto.itemId } },
    });

    if (existingDb && existingDb.answer && typeof existingDb.answer === 'object') {
      const dbSeq = (existingDb.answer as Record<string, unknown>)._clientSequence;
      if (typeof dbSeq === 'number' && dbSeq >= dto.clientSequence) {
        const dbAnswered = await this.prisma.response.count({
          where: { attemptId: dto.attemptId },
        });
        return {
          accepted: false,
          superseded: true,
          answeredItems: dbAnswered,
          serverRemainingSeconds: session.serverRemainingSeconds,
        };
      }
    }

    const answerPayloadWithSeq =
      typeof dto.answer === 'object' && dto.answer !== null
        ? { ...(dto.answer as Record<string, unknown>), _clientSequence: dto.clientSequence }
        : dto.answer;

    await this.prisma.response.upsert({
      where: { attemptId_itemId: { attemptId: dto.attemptId, itemId: dto.itemId } },
      update: { answer: answerPayloadWithSeq as Prisma.InputJsonValue },
      create: {
        attemptId: dto.attemptId,
        itemId: dto.itemId,
        answer: answerPayloadWithSeq as Prisma.InputJsonValue,
      },
    });

    draftsSaved?.inc({
      track_code: session.trackCode,
      level_number: String(session.levelNumber),
    });

    this.logger.warn(
      {
        attemptId: dto.attemptId,
        itemId: dto.itemId,
        clientSequence: dto.clientSequence,
        degraded: true,
      },
      'assessment.draft-saved-postgres-fallback',
    );

    const dbAnsweredCount = await this.prisma.response.count({
      where: { attemptId: dto.attemptId },
    });

    return {
      accepted: true,
      superseded: false,
      answeredItems: dbAnsweredCount,
      serverRemainingSeconds: session.serverRemainingSeconds,
    };
  }

  private async getAnsweredItemsCount(attemptId: string): Promise<number> {
    try {
      const count = await this.redis.scard(`drafts:set:${attemptId}`);
      if (count > 0) return count;
    } catch {
      // Fall through to DB
    }
    return this.prisma.response.count({
      where: { attemptId },
    });
  }

  async startAttempt(studentId: string, dto: StartAttemptRequest): Promise<AttemptSessionDto> {
    const level = await this.prisma.level.findFirst({
      where: {
        levelNumber: dto.levelNumber,
        track: { code: dto.trackCode },
      },
      include: { track: true },
    });

    if (!level) {
      throw new NotFoundException(`Level ${dto.levelNumber} for track ${dto.trackCode} not found.`);
    }

    const existingOutcome = await this.resumeOrCloseStaleAttempt(studentId, level.id);
    if (existingOutcome !== 'create') {
      return existingOutcome;
    }

    // Level Unlock Rule: Level 2+ requires preceding level cleared with BRONZE or higher
    if (level.levelNumber > 1) {
      const prevLevel = await this.prisma.level.findFirst({
        where: {
          trackId: level.trackId,
          levelNumber: level.levelNumber - 1,
        },
      });

      if (!prevLevel) {
        throw new ForbiddenException({
          error: 'level_locked',
          message: `Preceding level ${dto.levelNumber - 1} does not exist.`,
          statusCode: 403,
        });
      }

      const prevResult = await this.prisma.levelResult.findFirst({
        where: {
          attempt: { userId: studentId },
          levelId: prevLevel.id,
        },
        orderBy: { issuedAt: 'desc' },
      });

      const allowedTiers: Tier[] = ['GOLD', 'SILVER', 'BRONZE'];
      if (!prevResult || !allowedTiers.includes(prevResult.tierAwarded as Tier)) {
        throw new ForbiddenException({
          error: 'level_locked',
          message: `Level ${dto.levelNumber} is locked. Cleared BRONZE or higher on Level ${dto.levelNumber - 1} required.`,
          statusCode: 403,
        });
      }
    }

    // Pick parallel form Code
    let formCode = 'A';
    try {
      const selected = await this.rotation.selectForm(level.id);
      formCode = selected.formCode;
      if (selected.items.length > 0) {
        await this.rotation.recordExposure(selected.items.map((i) => i.id));
      }
    } catch {
      // Fall back to default form 'A' if item rotation bank is unseeded / empty
      formCode = 'A';
    }

    const startedAt = new Date();
    const durationMinutes = level.durationMinutes ?? 60;
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    const attempt = await this.prisma.attempt.create({
      data: {
        userId: studentId,
        levelId: level.id,
        formCode,
        status: 'IN_PROGRESS',
        integrityFlag: 'CLEAN',
        startedAt,
        expiresAt,
      },
      include: {
        level: { include: { track: true } },
        responses: true,
      },
    });

    const sessionDto = this.buildSessionDto(attempt);
    await this.saveRedisSession(sessionDto);

    // Increment metric ONLY for newly created attempts
    attemptsStarted.inc({
      track_code: dto.trackCode,
      level_number: String(dto.levelNumber),
    });

    return sessionDto;
  }

  async getSession(studentId: string, attemptId: string): Promise<AttemptSessionDto> {
    const redisKey = `session:assessment:${attemptId}`;
    try {
      const cached = await this.redis.get(redisKey);
      if (cached) {
        const session = JSON.parse(cached) as AttemptSessionDto;
        if (session.studentId !== studentId) {
          throw new ForbiddenException({
            error: 'forbidden',
            message: 'You cannot access another student session.',
            statusCode: 403,
          });
        }
        const expiresAtMs = new Date(session.expiresAt).getTime();
        session.serverRemainingSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
        session.locked = session.status !== 'IN_PROGRESS' || session.serverRemainingSeconds <= 0;
        session.locked = session.locked || (await this.proctorLocked(attemptId));
        return session;
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      // Fail open to Postgres DB read if Redis throws or misses
    }

    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        level: { include: { track: true } },
        responses: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Assessment attempt ${attemptId} not found.`);
    }

    if (attempt.userId !== studentId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You cannot access another student session.',
        statusCode: 403,
      });
    }

    const sessionDto = this.buildSessionDto(attempt);
    sessionDto.locked = sessionDto.locked || (await this.proctorLocked(attemptId));
    await this.saveRedisSession(sessionDto);
    return sessionDto;
  }

  /**
   * Idempotent start: resume a live attempt, or atomically close a stale one.
   * `updateMany` + status filter so only one concurrent start wins the close.
   * The loser re-reads and resumes the winner's new IN_PROGRESS row.
   */
  private async resumeOrCloseStaleAttempt(
    studentId: string,
    levelId: string,
  ): Promise<AttemptSessionDto | 'create'> {
    const existingAttempt = await this.prisma.attempt.findFirst({
      where: {
        userId: studentId,
        levelId,
        status: 'IN_PROGRESS',
      },
      include: {
        level: { include: { track: true } },
        responses: true,
      },
    });

    if (!existingAttempt) {
      return 'create';
    }

    const stillOpen = existingAttempt.expiresAt.getTime() > Date.now();
    const lockedByProctor = stillOpen && (await this.proctorLocked(existingAttempt.id));
    if (stillOpen && !lockedByProctor) {
      return this.getSession(studentId, existingAttempt.id);
    }

    const closed = await this.prisma.attempt.updateMany({
      where: { id: existingAttempt.id, status: 'IN_PROGRESS' },
      data: { status: 'AUTO_SUBMITTED', completedAt: new Date() },
    });

    if (closed.count === 0) {
      const winner = await this.prisma.attempt.findFirst({
        where: {
          userId: studentId,
          levelId,
          status: 'IN_PROGRESS',
        },
      });
      if (winner) {
        const winnerOpen = winner.expiresAt.getTime() > Date.now();
        const winnerLocked = winnerOpen && (await this.proctorLocked(winner.id));
        if (winnerOpen && !winnerLocked) {
          return this.getSession(studentId, winner.id);
        }
      }
      return 'create';
    }

    try {
      await this.redis.del(`session:assessment:${existingAttempt.id}`);
      await this.redis.del(`proctor:lock:${existingAttempt.id}`);
      await this.redis.del(`proctor:warn:${existingAttempt.id}`);
    } catch {
      // Fail open — Postgres is the source of truth after auto-submit.
    }
    return 'create';
  }

  private async proctorLocked(attemptId: string): Promise<boolean> {
    if (!env.PROCTORING_FULL) return false;
    try {
      return (await this.redis.exists(`proctor:lock:${attemptId}`)) === 1;
    } catch {
      return false;
    }
  }

  async getNextItem(
    studentId: string,
    attemptId: string,
    requestedIndex?: number,
  ): Promise<NextItemDto> {
    const session = await this.getSession(studentId, attemptId);

    if (session.locked || session.serverRemainingSeconds <= 0) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Assessment session is locked or expired.',
        statusCode: 403,
      });
    }

    if (requestedIndex !== undefined) {
      if (!Number.isInteger(requestedIndex) || requestedIndex < 0) {
        throw new BadRequestException({
          error: 'invalid_index',
          message: 'Item index must be a non-negative integer.',
          statusCode: 400,
        });
      }
      session.currentItemIndex = requestedIndex;
    }

    const currentItemIndex = session.currentItemIndex ?? 0;

    if (session.totalItems > 0 && currentItemIndex >= session.totalItems) {
      await this.persistSessionIndex(session, currentItemIndex);
      return {
        attemptId: session.attemptId,
        item: null,
        index: currentItemIndex,
        totalItems: session.totalItems,
        serverRemainingSeconds: session.serverRemainingSeconds,
      };
    }

    const itemBankKey = `items:form:${session.trackCode}:${session.levelNumber}:${session.formId}`;
    let items: DeliverableItemDto[] = [];

    try {
      const cachedItemsJson = await this.redis.get(itemBankKey);
      if (cachedItemsJson) {
        items = JSON.parse(cachedItemsJson) as DeliverableItemDto[];
        cacheOperations.inc({ namespace: 'items_form', result: 'hit' });
      }
    } catch {
      // Fail open to DB query if Redis throws
    }

    if (items.length === 0) {
      cacheOperations.inc({ namespace: 'items_form', result: 'miss' });
      const dbItems = await this.prisma.item.findMany({
        where: {
          level: {
            levelNumber: session.levelNumber,
            track: { code: session.trackCode },
          },
          formCode: session.formId,
          active: true,
        },
        include: {
          competency: true,
          options: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!dbItems || dbItems.length === 0) {
        throw new NotFoundException(`Item bank for form ${session.formId} is empty.`);
      }

      items = dbItems.map((item) => ({
        itemId: item.id,
        competencyId: item.competencyId,
        domainCode: (item.competency?.domainCode ?? 'A') as DomainCode,
        itemType: item.itemType as ItemType,
        difficulty: item.difficultyTag as DifficultyTag,
        promptText: item.stem,
        options:
          item.options && item.options.length > 0
            ? item.options.map((opt) => ({
                optionId: opt.id,
                label: opt.text ? `${opt.label}. ${opt.text}` : opt.label,
              }))
            : undefined,
        itemWeight: 1,
      }));

      try {
        await this.redis.setex(itemBankKey, ITEM_BANK_TTL_SECONDS, JSON.stringify(items));
      } catch {
        // Fail open
      }
    }

    if (currentItemIndex >= items.length) {
      await this.persistSessionIndex(session, currentItemIndex);
      return {
        attemptId: session.attemptId,
        item: null,
        index: currentItemIndex,
        totalItems: session.totalItems || items.length,
        serverRemainingSeconds: session.serverRemainingSeconds,
      };
    }

    const deliverableItem = items[currentItemIndex] ?? null;
    let savedDraft: unknown = undefined;

    if (deliverableItem) {
      const draftKey = `draft:assessment:${attemptId}:${deliverableItem.itemId}`;
      try {
        const rawDraft = await this.redis.get(draftKey);
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft) as StoredDraft;
          savedDraft = parsed.answer;
        }
      } catch {
        // Fail open
      }

      if (!savedDraft) {
        const dbResponse = await this.prisma.response.findUnique({
          where: { attemptId_itemId: { attemptId, itemId: deliverableItem.itemId } },
        });
        if (dbResponse?.answer) {
          const answerObj = dbResponse.answer as Record<string, unknown>;
          if (answerObj && typeof answerObj === 'object' && '_clientSequence' in answerObj) {
            const { _clientSequence, ...cleanAnswer } = answerObj;
            savedDraft = cleanAnswer;
          } else {
            savedDraft = dbResponse.answer;
          }
        }
      }
    }

    this.logger.log(
      {
        attemptId,
        formCode: session.formId,
        index: currentItemIndex,
        totalItems: session.totalItems || items.length,
      },
      'assessment.next-item-served',
    );

    await this.persistSessionIndex(session, currentItemIndex);

    return {
      attemptId: session.attemptId,
      item: deliverableItem,
      index: currentItemIndex,
      totalItems: session.totalItems || items.length,
      savedDraft,
      serverRemainingSeconds: session.serverRemainingSeconds,
    };
  }

  private buildSessionDto(attempt: AttemptWithLevelAndResponses): AttemptSessionDto {
    const expiresAtMs = attempt.expiresAt.getTime();
    const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
    const isLocked = attempt.status !== 'IN_PROGRESS' || remainingSeconds <= 0;

    return {
      attemptId: attempt.id,
      studentId: attempt.userId,
      trackCode: attempt.level.track.code as TrackCode,
      levelNumber: attempt.level.levelNumber as LevelNumber,
      levelFormat: attempt.level.format as LevelFormat,
      status: attempt.status as AttemptStatus,
      formId: attempt.formCode,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt.toISOString(),
      serverRemainingSeconds: remainingSeconds,
      totalItems: attempt.level.itemCount ?? 0,
      answeredItems: attempt.responses?.length ?? 0,
      currentItemIndex: 0,
      integrityFlag: attempt.integrityFlag as IntegrityFlag,
      locked: isLocked,
    };
  }

  private async persistSessionIndex(
    session: AttemptSessionDto,
    currentItemIndex: number,
  ): Promise<void> {
    session.currentItemIndex = currentItemIndex;
    await this.saveRedisSession(session);
  }

  private async saveRedisSession(session: AttemptSessionDto): Promise<void> {
    try {
      const redisKey = `session:assessment:${session.attemptId}`;
      await this.redis.setex(redisKey, SESSION_TTL_SECONDS, JSON.stringify(session));
    } catch {
      // Fail open
    }
  }

  /** Maps a persisted `IntegrityEvent` row (best-effort) into a scorer input. */
  private toStoredViolation(event: { detail: unknown; createdAt: Date }): StoredViolation | null {
    const detail = event.detail as { kind?: string; severity?: string } | null;
    if (!detail?.kind || !detail?.severity) return null;
    return {
      kind: detail.kind as ProctoringViolationKind,
      severity: detail.severity as ProctoringSeverity,
      ts: event.createdAt.getTime(),
    };
  }

  /**
   * `ProctoringService.record()` persists both genuine violations and
   * transient technical noise (NETWORK_LOSS, HEARTBEAT_LOST, CAMERA_STATIC,
   * TECHNICAL_INTERRUPTION — see TECHNICAL_VIOLATION_KINDS) into the same
   * `IntegrityEvent` table, tagging each row's `detail.classified` as
   * `'INTEGRITY'` or `'TECHNICAL'`. Only the former should ever surface as
   * evidence to an admin or feed the severity score.
   */
  private isClassifiedIntegrityEvent(event: { detail: unknown }): boolean {
    const detail = event.detail as { classified?: string } | null;
    return detail?.classified === 'INTEGRITY';
  }

  /**
   * True (uncapped) count of classified `INTEGRITY` events per attempt.
   *
   * `listIntegrityQueue`/`resolveIntegrity` only fetch the 50 most recent
   * `IntegrityEvent` rows per attempt (see `toIntegrityQueueItem`) to keep
   * `risk.ts`'s O(n^2) pairwise scoring bounded — see the comment on
   * `toIntegrityQueueItem` for why that cap is kept for scoring. The "+N
   * more" count shown to admins must not inherit that cap, so it is sourced
   * from this separate, uncapped `count`/`groupBy` query instead.
   */
  private async classifiedIntegrityEventCounts(attemptIds: string[]): Promise<Map<string, number>> {
    if (attemptIds.length === 0) return new Map();
    const counts = await this.prisma.integrityEvent.groupBy({
      by: ['attemptId'],
      where: {
        attemptId: { in: attemptIds },
        detail: { path: ['classified'], equals: 'INTEGRITY' },
      },
      _count: { _all: true },
    });
    return new Map(counts.map((c) => [c.attemptId, c._count._all]));
  }

  private async classifiedIntegrityEventCount(attemptId: string): Promise<number> {
    return this.prisma.integrityEvent.count({
      where: { attemptId, detail: { path: ['classified'], equals: 'INTEGRITY' } },
    });
  }

  private toIntegrityQueueItem(
    row: AttemptWithUserAndEvents,
    totalClassifiedEventCount: number,
  ): IntegrityQueueItemDto {
    // Filter to classified INTEGRITY events only: a technical event landing
    // first (e.g. NETWORK_LOSS) must never become the "evidence hint" an
    // admin reads before choosing Escalate or Confirm, and it must not
    // inflate the severity score either.
    const classifiedEvents = row.events.filter((event) => this.isClassifiedIntegrityEvent(event));
    // Scoring intentionally still uses only the capped (take: 50, most
    // recent) slice of classified events fetched by the caller, not the
    // uncapped `totalClassifiedEventCount`. risk.ts's integrityScore() does
    // pairwise O(n^2) comparisons across the event set, so scoring against
    // every historical event for attempts with hundreds/thousands of them
    // would be a real performance risk, and the 50 most recent events are
    // the most relevant signal for a *current* severity read anyway. This
    // is a deliberate tradeoff, not an oversight.
    const violations = classifiedEvents
      .map((event) => this.toStoredViolation(event))
      .filter((v): v is StoredViolation => v !== null);
    const latestEvent = classifiedEvents[0]?.detail as { kind?: string } | null;
    const moreCount = Math.max(0, totalClassifiedEventCount - (latestEvent ? 1 : 0));
    const flagReason = latestEvent?.kind
      ? moreCount > 0
        ? `${latestEvent.kind} (+${moreCount} more)`
        : latestEvent.kind
      : null;
    return {
      attemptId: row.id,
      userId: row.userId,
      studentName: row.user.fullName,
      studentEmail: row.user.email,
      integrityFlag: row.integrityFlag,
      status: row.status,
      startedAt: row.startedAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      severity: bandForScore(integrityScore(violations)),
      flagReason,
    };
  }

  /**
   * `status` picks which attempts show up:
   *  - `'PENDING'` (default): the original flagged/under-review queue, i.e.
   *    attempts still awaiting a Dismiss/Confirm/Escalate decision.
   *  - `'ESCALATED'`: attempts an admin has already escalated. Escalation
   *    has no dedicated RBAC route or notification (out of scope for
   *    S6-VV-64); this view is its durable destination so escalated cases
   *    stay visible/reviewable instead of vanishing from the queue exactly
   *    like Dismiss/Void do.
   */
  async listIntegrityQueue(
    status: IntegrityQueueStatus = 'PENDING',
  ): Promise<IntegrityQueueItemDto[]> {
    const integrityFlagFilter: IntegrityFlag[] =
      status === 'ESCALATED'
        ? ['ESCALATED']
        : [
            'FLAGGED_TIMING',
            'FLAGGED_PROCTOR',
            'FLAGGED_SIMILARITY',
            'FLAGGED_AUDIO',
            'UNDER_REVIEW',
          ];
    const rows = await this.prisma.attempt.findMany({
      where: {
        status: { not: 'VOIDED' },
        integrityFlag: { in: integrityFlagFilter },
      },
      include: {
        user: true,
        events: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    const counts = await this.classifiedIntegrityEventCounts(rows.map((row) => row.id));
    return rows.map((row) => this.toIntegrityQueueItem(row, counts.get(row.id) ?? 0));
  }

  async resolveIntegrity(
    attemptId: string,
    body: { resolution: 'CLEAR' | 'VOID' | 'ESCALATE'; reason: string },
    actorId: string,
  ): Promise<IntegrityQueueItemDto> {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { user: true },
    });
    if (!attempt) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Attempt not found.',
        statusCode: 404,
      });
    }
    const data =
      body.resolution === 'VOID'
        ? { status: 'VOIDED' as const }
        : body.resolution === 'ESCALATE'
          ? { integrityFlag: 'ESCALATED' as const }
          : { integrityFlag: 'CLEARED' as const };
    const updated = await this.prisma.attempt.update({
      where: { id: attemptId },
      data,
      include: {
        user: true,
        events: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    const action =
      body.resolution === 'VOID'
        ? 'integrity.voided'
        : body.resolution === 'ESCALATE'
          ? 'integrity.escalated'
          : 'integrity.cleared';
    await this.auditPublisher.record({
      actorId,
      action,
      resourceType: 'attempt',
      resourceId: attemptId,
      reasonCode: body.reason,
    });
    const totalClassifiedEventCount = await this.classifiedIntegrityEventCount(attemptId);
    return this.toIntegrityQueueItem(updated, totalClassifiedEventCount);
  }
}
