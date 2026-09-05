import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CompleteSkillVerifyRequestSchema,
  CompleteSkillVerifyResponseSchema,
  REDIS_TTL_SECONDS,
  SKILL_VERIFICATION_STATUSES,
  SMART_TOPICS,
  SaveSkillVerifyRequestSchema,
  SkillClaimDtoSchema,
  SkillVerificationCompletedDataSchema,
  SkillVerifyPrepareDtoSchema,
  SkillVerifySessionDtoSchema,
  StartSkillVerifyRequestSchema,
  hydrateFocusProgress,
  focusProgressFor,
  mergeFocusProgressIntoMetadata,
  resolveSkillFocus,
  skillFocusFromMetadata,
  upsertFocusProgress,
  sdeV4FormCodeForCatalogSkill,
  type CompleteSkillVerifyResponse,
  type SkillClaimDto,
  type SkillClaimStatus,
  type SkillProficiency,
  type SkillVerifyPrepareDto,
  type SkillVerifySessionDto,
} from '@smart/contracts';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { EvaluationService } from '../evaluation/evaluation.service.js';
import {
  applySkillClaimTransition,
  type SkillClaimEvent,
  type SkillClaimSnapshot,
} from './skill-claim-state-machine.js';

function skillVerifyRedisKey(sessionId: string): string {
  return `session:skill-verify:${sessionId}`;
}

type StoredAnswer = { index: number; selectedKey?: string; text?: string };

type StoredSession = {
  sessionId: string;
  userId: string;
  claimId: string;
  catalogSkillCode: string;
  skillName: string;
  sdeSkillCode: string;
  proficiency: SkillProficiency;
  skillFocus: string | null;
  scoringToken: string;
  items: SkillVerifySessionDto['items'];
  timeMinutes: number;
  passMarkPercent: number;
  expiresAt: string;
  answers: StoredAnswer[];
};

function ttlSeconds(expiresAt: string): number {
  return Math.max(
    1,
    Math.min(
      REDIS_TTL_SECONDS.assessmentSession,
      Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000),
    ),
  );
}

@Injectable()
export class SkillVerificationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(EvaluationService) private readonly evaluation: EvaluationService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
  ) {}

  async start(
    user: RequestUser,
    claimId: string,
    body?: unknown,
  ): Promise<SkillVerifySessionDto | SkillVerifyPrepareDto> {
    this.assertStudent(user);
    const request = StartSkillVerifyRequestSchema.parse(body ?? {});
    if (request.prepareOnly === true) {
      return this.prepare(user, claimId);
    }
    return this.generate(user, claimId, request.sessionId);
  }

  private async assertStartAllowed(userId: string, claimId: string) {
    const claim = await this.loadOwnClaim(userId, claimId);
    const sdeSkillCode = sdeV4FormCodeForCatalogSkill(claim.skill.code);
    if (!sdeSkillCode) {
      throw new BadRequestException({
        error: 'skill_not_in_sde_v4',
        message: 'This catalog skill has no SDE v4 verification form.',
        statusCode: 400,
      });
    }

    const focus = resolveSkillFocus(claim.skill.code, skillFocusFromMetadata(claim.sourceMetadata));
    const progress = hydrateFocusProgress({
      skillCode: claim.skill.code,
      metadata: claim.sourceMetadata,
      status: claim.status as SkillClaimStatus,
      strikes: claim.strikes,
      lockedUntil: claim.lockedUntil?.toISOString() ?? null,
      lastAttemptId: claim.lastAttemptId,
      lastGenuineFailureAt: null,
    });
    const selected = (focus ? focusProgressFor(progress, focus) : null) ?? {
      focus: focus ?? 'default',
      status: 'DECLARED' as const,
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: null,
      lastGenuineFailureAt: null,
      retryAvailableAt: null,
    };
    const startResult = applySkillClaimTransition({
      claim: {
        status: selected.status,
        proficiency: claim.proficiency,
        strikes: selected.strikes,
        lockedUntil: selected.lockedUntil ? new Date(selected.lockedUntil) : null,
        verifiedUntil: null,
      },
      event: { type: 'START' },
      now: new Date(),
      lastGenuineFailureAt: selected.lastGenuineFailureAt
        ? new Date(selected.lastGenuineFailureAt)
        : null,
    });
    if (!startResult.accepted) {
      throw new ForbiddenException({
        error: 'skill_claim_blocked',
        message: `Cannot start skill verification: ${String(startResult.blockReason)}.`,
        statusCode: 403,
        blockReason: startResult.blockReason,
      });
    }
    return { claim, sdeSkillCode };
  }

  private async prepare(user: RequestUser, claimId: string): Promise<SkillVerifyPrepareDto> {
    const { claim, sdeSkillCode } = await this.assertStartAllowed(user.sub, claimId);
    const sessionId = randomUUID();
    const expiresAt = new Date(
      Date.now() + REDIS_TTL_SECONDS.assessmentSession * 1000,
    ).toISOString();
    const stored: StoredSession = {
      sessionId,
      userId: user.sub,
      claimId: claim.id,
      catalogSkillCode: claim.skill.code,
      skillName: claim.skill.name,
      sdeSkillCode,
      proficiency: claim.proficiency,
      skillFocus: resolveSkillFocus(claim.skill.code, skillFocusFromMetadata(claim.sourceMetadata)),
      scoringToken: '',
      items: [],
      timeMinutes: 1,
      passMarkPercent: 80,
      expiresAt,
      answers: [],
    };
    await this.redis.setex(
      skillVerifyRedisKey(sessionId),
      ttlSeconds(expiresAt),
      JSON.stringify(stored),
    );
    return SkillVerifyPrepareDtoSchema.parse({
      sessionId,
      claimId: claim.id,
      expiresAt,
    });
  }

  private async generate(
    user: RequestUser,
    claimId: string,
    sessionId?: string,
  ): Promise<SkillVerifySessionDto> {
    const { claim, sdeSkillCode } = await this.assertStartAllowed(user.sub, claimId);

    let stored: StoredSession | null = null;
    if (sessionId) {
      stored = await this.loadSession(user.sub, sessionId);
      if (stored.claimId !== claim.id) {
        throw new BadRequestException({
          error: 'session_claim_mismatch',
          message: 'Prepared session does not match this skill claim.',
          statusCode: 400,
        });
      }
      if (stored.items.length > 0) {
        this.assertNotExpired(stored);
        return this.toDto(stored);
      }
    }

    const form = await this.evaluation.generateSkillForm(
      {
        skillCode: sdeSkillCode,
        proficiency: claim.proficiency,
        attemptId: stored?.sessionId ?? randomUUID(),
        skillFocus:
          resolveSkillFocus(claim.skill.code, skillFocusFromMetadata(claim.sourceMetadata)) ??
          undefined,
      },
      user.sub,
    );

    const nextId = stored?.sessionId ?? randomUUID();
    const expiresAt = new Date(Date.now() + form.timeMinutes * 60_000).toISOString();
    const next: StoredSession = {
      sessionId: nextId,
      userId: user.sub,
      claimId: claim.id,
      catalogSkillCode: claim.skill.code,
      skillName: claim.skill.name,
      sdeSkillCode,
      proficiency: claim.proficiency,
      skillFocus:
        stored?.skillFocus ??
        resolveSkillFocus(claim.skill.code, skillFocusFromMetadata(claim.sourceMetadata)),
      scoringToken: form.scoringToken,
      items: form.items,
      timeMinutes: form.timeMinutes,
      passMarkPercent: form.passMarkPercent,
      expiresAt,
      answers: stored?.answers ?? [],
    };
    await this.redis.setex(
      skillVerifyRedisKey(nextId),
      ttlSeconds(expiresAt),
      JSON.stringify(next),
    );
    return this.toDto(next);
  }

  async getSession(user: RequestUser, sessionId: string): Promise<SkillVerifySessionDto> {
    this.assertStudent(user);
    const stored = await this.loadSession(user.sub, sessionId);
    this.assertNotExpired(stored);
    return this.toDto(stored);
  }

  async save(user: RequestUser, sessionId: string, body: unknown): Promise<SkillVerifySessionDto> {
    this.assertStudent(user);
    const request = SaveSkillVerifyRequestSchema.parse(body);
    const stored = await this.loadSession(user.sub, sessionId);
    this.assertNotExpired(stored);
    stored.answers = this.mergeAnswers(stored.answers, request.responses);
    await this.redis.setex(
      skillVerifyRedisKey(sessionId),
      ttlSeconds(stored.expiresAt),
      JSON.stringify(stored),
    );
    return this.toDto(stored);
  }

  async complete(
    user: RequestUser,
    sessionId: string,
    body: unknown,
  ): Promise<CompleteSkillVerifyResponse> {
    this.assertStudent(user);
    const request = CompleteSkillVerifyRequestSchema.parse(body ?? {});
    const stored = await this.loadSession(user.sub, sessionId);
    if (request.responses?.length) {
      stored.answers = this.mergeAnswers(stored.answers, request.responses);
    }

    const claim = await this.loadOwnClaim(user.sub, stored.claimId);
    const focus =
      stored.skillFocus ??
      resolveSkillFocus(claim.skill.code, skillFocusFromMetadata(claim.sourceMetadata));
    const progress = hydrateFocusProgress({
      skillCode: claim.skill.code,
      metadata: claim.sourceMetadata,
      status: claim.status as SkillClaimStatus,
      strikes: claim.strikes,
      lockedUntil: claim.lockedUntil?.toISOString() ?? null,
      lastAttemptId: claim.lastAttemptId,
      lastGenuineFailureAt: null,
    });
    const selected = (focus ? focusProgressFor(progress, focus) : null) ?? {
      focus: focus ?? 'default',
      status: 'DECLARED' as const,
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: null,
      lastGenuineFailureAt: null,
      retryAvailableAt: null,
    };

    const technicalFailure = request.technicalFailure === true;
    let grade: CompleteSkillVerifyResponse['grade'] = null;
    let genuinePass = false;

    if (!technicalFailure) {
      this.assertNotExpired(stored);
      grade = await this.evaluation.gradeSkillForm(
        {
          skillCode: stored.sdeSkillCode,
          proficiency: stored.proficiency,
          scoringToken: stored.scoringToken,
          responses: stored.items.map((item) => {
            const answer = stored.answers.find((row) => row.index === item.index);
            return {
              index: item.index,
              selectedKey: answer?.selectedKey,
              text: answer?.text,
            };
          }),
        },
        user.sub,
      );
      genuinePass = grade.passed;
    }

    const event: SkillClaimEvent = technicalFailure
      ? { type: 'TECHNICAL_FAILURE' }
      : genuinePass
        ? { type: 'GENUINE_PASS' }
        : { type: 'GENUINE_FAIL' };

    const transition = applySkillClaimTransition({
      claim: {
        status: selected.status,
        proficiency: claim.proficiency,
        strikes: selected.strikes,
        lockedUntil: selected.lockedUntil ? new Date(selected.lockedUntil) : null,
        verifiedUntil: null,
      },
      event,
      now: new Date(),
      lastGenuineFailureAt: selected.lastGenuineFailureAt
        ? new Date(selected.lastGenuineFailureAt)
        : null,
    });
    if (!transition.accepted) {
      throw new ForbiddenException({
        error: 'skill_claim_blocked',
        message: `Cannot settle skill claim: ${String(transition.blockReason)}.`,
        statusCode: 403,
        blockReason: transition.blockReason,
      });
    }

    const explanation =
      request.explanation ??
      (technicalFailure
        ? 'Technical failure recorded; claim status unchanged.'
        : genuinePass
          ? 'SDE v4 form cleared the pass bar (assessment-only, no interview).'
          : 'SDE v4 form did not clear the pass bar.');

    const nowIso = new Date().toISOString();
    const nextFocus = upsertFocusProgress(progress, {
      focus: selected.focus,
      status: transition.next.status,
      strikes: transition.next.strikes,
      lockedUntil: transition.next.lockedUntil?.toISOString() ?? null,
      lastAttemptId: sessionId,
      lastGenuineFailureAt:
        event.type === 'GENUINE_FAIL' ? nowIso : (selected.lastGenuineFailureAt ?? null),
      retryAvailableAt: null,
    });
    const nextMetadata = mergeFocusProgressIntoMetadata(
      claim.sourceMetadata,
      selected.focus,
      nextFocus,
    );

    const [updatedClaim] = await this.prisma.$transaction([
      this.prisma.skillClaim.update({
        where: { id: claim.id },
        data: {
          status: 'DECLARED',
          proficiency: transition.next.proficiency,
          strikes: 0,
          lockedUntil: null,
          verifiedUntil: transition.next.verifiedUntil,
          lastAttemptId: sessionId,
          sourceMetadata: nextMetadata as never,
        },
        include: { skill: { select: { code: true, name: true } } },
      }),
      this.prisma.skillVerificationAttempt.create({
        data: {
          claimId: claim.id,
          assessmentAttemptId: null,
          claimedProficiency: claim.proficiency,
          technicalFailure,
          passed: technicalFailure ? null : genuinePass,
          explanation,
          marksEarned: grade?.marksEarned ?? null,
          marksTotal: grade?.marksTotal ?? null,
          scorePercent: grade?.scorePercent ?? null,
        },
      }),
    ]);

    await this.redis.del(skillVerifyRedisKey(sessionId));

    const mapped = this.mapClaim(updatedClaim);
    const kafkaStatus = SKILL_VERIFICATION_STATUSES.find((status) => status === mapped.status);
    if (kafkaStatus) {
      await this.outbox.enqueueEnvelope({
        topic: SMART_TOPICS.skillVerificationCompleted,
        partitionKey: mapped.claimId,
        eventType: SMART_TOPICS.skillVerificationCompleted,
        source: 'assessment',
        data: SkillVerificationCompletedDataSchema.parse({
          claimId: mapped.claimId,
          userId: user.sub,
          skillName: stored.skillName,
          status: kafkaStatus,
          detail: explanation,
        }),
      });
    }

    return CompleteSkillVerifyResponseSchema.parse({
      claim: mapped,
      technicalFailure,
      grade,
    });
  }

  private assertStudent(user: RequestUser): void {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Student role required for skill verification.',
        statusCode: 403,
      });
    }
  }

  private snapshot(claim: {
    status: string;
    proficiency: string;
    strikes: number;
    lockedUntil: Date | null;
    verifiedUntil: Date | null;
  }): SkillClaimSnapshot {
    return {
      status: claim.status as SkillClaimStatus,
      proficiency: claim.proficiency as SkillProficiency,
      strikes: claim.strikes,
      lockedUntil: claim.lockedUntil,
      verifiedUntil: claim.verifiedUntil,
    };
  }

  private async loadOwnClaim(studentId: string, claimId: string) {
    const claim = await this.prisma.skillClaim.findUnique({
      where: { id: claimId },
      include: { skill: { select: { code: true, name: true } } },
    });
    if (!claim || claim.studentId !== studentId) {
      throw new NotFoundException({
        error: 'not_found',
        message: `Skill claim ${claimId} not found.`,
        statusCode: 404,
      });
    }
    return claim;
  }

  private async loadSession(userId: string, sessionId: string): Promise<StoredSession> {
    const raw = await this.redis.get(skillVerifyRedisKey(sessionId));
    if (!raw) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Skill verification session not found.',
        statusCode: 404,
      });
    }
    const stored = JSON.parse(raw) as StoredSession;
    if (stored.userId !== userId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You cannot access another candidate’s verification session.',
        statusCode: 403,
      });
    }
    return stored;
  }

  private assertNotExpired(stored: StoredSession): void {
    if (Date.parse(stored.expiresAt) <= Date.now()) {
      throw new ForbiddenException({
        error: 'session_expired',
        message: 'Skill verification time has ended.',
        statusCode: 403,
      });
    }
  }

  private mergeAnswers(existing: StoredAnswer[], incoming: StoredAnswer[]): StoredAnswer[] {
    const byIndex = new Map(existing.map((row) => [row.index, row]));
    for (const row of incoming) {
      byIndex.set(row.index, row);
    }
    return [...byIndex.values()].sort((a, b) => a.index - b.index);
  }

  private toDto(stored: StoredSession): SkillVerifySessionDto {
    const remaining = Math.max(0, Math.floor((Date.parse(stored.expiresAt) - Date.now()) / 1000));
    return SkillVerifySessionDtoSchema.parse({
      sessionId: stored.sessionId,
      claimId: stored.claimId,
      skillCode: stored.catalogSkillCode,
      proficiency: stored.proficiency,
      timeMinutes: stored.timeMinutes,
      passMarkPercent: stored.passMarkPercent,
      expiresAt: stored.expiresAt,
      serverRemainingSeconds: remaining,
      items: stored.items,
      answers: stored.answers,
    });
  }

  private mapClaim(row: {
    id: string;
    studentId: string;
    proficiency: SkillClaimDto['proficiency'];
    status: SkillClaimDto['status'];
    strikes: number;
    lockedUntil: Date | null;
    lastAttemptId: string | null;
    sourceMetadata?: unknown;
    skill: { code: string };
  }): SkillClaimDto {
    return SkillClaimDtoSchema.parse({
      claimId: row.id,
      studentId: row.studentId,
      skillCode: row.skill.code,
      proficiency: row.proficiency,
      status: row.status,
      strikes: row.strikes,
      lockedUntil: row.lockedUntil?.toISOString() ?? null,
      lastAttemptId: row.lastAttemptId,
      skillFocus: resolveSkillFocus(row.skill.code, skillFocusFromMetadata(row.sourceMetadata)),
    });
  }
}
