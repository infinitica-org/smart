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
  CompleteSkillVerifyInterviewRequestSchema,
  SkillVerifyInterviewDtoSchema,
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
  readFocusProgress,
  focusProgressFor,
  mergeFocusProgressIntoMetadata,
  resolveSkillFocus,
  retryAvailableAtForFocus,
  skillFocusFromMetadata,
  upsertFocusProgress,
  sdeV4FormCodeForCatalogSkill,
  type AssessmentResult,
  type AssessmentStage,
  type CompleteSkillVerifyResponse,
  type GradeSdeSkillFormResponse,
  type PolymorphicAssessmentSessionDto,
  type RecommendedNextStep,
  type SkillClaimDto,
  type SkillClaimStatus,
  type SkillProficiency,
  type SkillVerifyPrepareDto,
  type SkillVerifySessionDto,
} from '@smart/contracts';
import { competencyIdsNeedingTargetedAssessment } from '@smart/scoring-engine';
import { assessmentMeetsTarget, claimProficiencyFromDemonstrated } from './verified-proficiency.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { env } from '../../platform/config/env.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { EvaluationService } from '../evaluation/evaluation.service.js';
import { VerificationOrchestratorService } from '../evidence/verification-orchestrator.service.js';
import { AssessmentIntelligenceService } from './assessment-intelligence.service.js';
import { applySkillClaimTransition, type SkillClaimEvent } from './skill-claim-state-machine.js';
import { buildSkillPolymorphicSession } from './polymorphic-assessment-session.mapper.js';

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
  passMarkPercent?: number;
  expiresAt: string;
  answers: StoredAnswer[];
  intelligenceEnabled?: boolean;
  stage?: AssessmentStage;
  diagnosticScoringToken?: string;
  diagnosticItems?: SkillVerifySessionDto['items'];
  diagnosticAnswers?: StoredAnswer[];
  diagnosticGrade?: GradeSdeSkillFormResponse;
  pendingCompetencyIds?: string[];
  pendingAssessmentResult?: AssessmentResult;
  pendingGrade?: GradeSdeSkillFormResponse;
  verificationStep?: RecommendedNextStep;
  interviewPassed?: boolean;
  interviewExplanation?: string;
  interviewQuestions?: Array<{ index: number; text: string }>;
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
    @Inject(AssessmentIntelligenceService)
    private readonly intelligence: AssessmentIntelligenceService,
    @Inject(VerificationOrchestratorService)
    private readonly verification: VerificationOrchestratorService,
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

    const { progress, selected } = this.progressForClaim(
      claim,
      skillFocusFromMetadata(claim.sourceMetadata),
    );
    let lastSit = selected.lastGenuineFailureAt ? new Date(selected.lastGenuineFailureAt) : null;
    if (!lastSit && progress.length === 0) {
      const lastAttempt = await this.prisma.skillVerificationAttempt.findFirst({
        where: { claimId: claim.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      lastSit = lastAttempt?.createdAt ?? null;
    }
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
      lastGenuineFailureAt: lastSit,
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
      expiresAt,
      answers: [],
      intelligenceEnabled: env.ASSESSMENT_INTELLIGENCE_V1,
      stage: env.ASSESSMENT_INTELLIGENCE_V1 ? 'DIAGNOSTIC' : undefined,
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

    const intelligenceEnabled = env.ASSESSMENT_INTELLIGENCE_V1;
    const form = await this.evaluation.generateSkillForm(
      {
        skillCode: sdeSkillCode,
        proficiency: claim.proficiency,
        attemptId: stored?.sessionId ?? randomUUID(),
        skillFocus:
          resolveSkillFocus(claim.skill.code, skillFocusFromMetadata(claim.sourceMetadata)) ??
          undefined,
        stage: intelligenceEnabled ? 'DIAGNOSTIC' : 'FULL',
        catalogSkillCode: intelligenceEnabled ? claim.skill.code : undefined,
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
      skillFocus: resolveSkillFocus(
        claim.skill.code,
        stored?.skillFocus ?? skillFocusFromMetadata(claim.sourceMetadata),
      ),
      scoringToken: form.scoringToken,
      items: form.items,
      timeMinutes: form.timeMinutes,
      passMarkPercent: form.passMarkPercent,
      expiresAt,
      answers: stored?.answers ?? [],
      intelligenceEnabled,
      stage: intelligenceEnabled ? 'DIAGNOSTIC' : undefined,
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

  async getPolymorphicSession(
    user: RequestUser,
    sessionId: string,
  ): Promise<PolymorphicAssessmentSessionDto> {
    this.assertStudent(user);
    const stored = await this.loadSession(user.sub, sessionId);
    const claim = await this.loadOwnClaim(user.sub, stored.claimId);
    const selected = this.progressForClaim(claim, stored.skillFocus).selected;
    const lockedUntil = selected.lockedUntil ? new Date(selected.lockedUntil) : null;
    const retryAvailableAt = selected.retryAvailableAt ? new Date(selected.retryAvailableAt) : null;

    return buildSkillPolymorphicSession({
      sessionId: stored.sessionId,
      claimId: stored.claimId,
      status: selected.status,
      hasActiveSession: true,
      retryAvailableAt,
      lockedUntil,
      expiresAt: stored.expiresAt,
      serverRemainingSeconds: ttlSeconds(stored.expiresAt),
    });
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
    const { progress, selected } = this.progressForClaim(
      claim,
      stored.skillFocus ?? skillFocusFromMetadata(claim.sourceMetadata),
    );

    const integrityTerminated =
      request.integrityTerminated === true ||
      (await this.redis.exists(`proctor:lock:${sessionId}`)) === 1;
    const technicalFailure = request.technicalFailure === true && !integrityTerminated;

    if (technicalFailure || integrityTerminated) {
      return this.finalizeAttempt({
        user,
        sessionId,
        stored,
        claim,
        progress,
        selected,
        technicalFailure,
        integrityTerminated,
        grade: null,
        assessmentResult: null,
        explanation: request.explanation,
      });
    }

    this.assertNotExpired(stored);
    const stageGrade = await this.gradeStoredItems(stored, user.sub);

    if (stored.intelligenceEnabled && stored.stage === 'DIAGNOSTIC') {
      stored.diagnosticScoringToken = stored.scoringToken;
      stored.diagnosticItems = stored.items;
      stored.diagnosticAnswers = stored.answers;
      stored.diagnosticGrade = stageGrade;
      const blueprint = this.intelligence.resolveBlueprint(stored.catalogSkillCode);
      const competencyIdsByIndex = this.competencyMapFromItems(stored.items);
      const partialResult = this.intelligence.buildAssessmentResult({
        catalogSkillCode: stored.catalogSkillCode,
        attemptId: sessionId,
        blueprint,
        targetProficiency: stored.proficiency,
        grade: stageGrade,
        competencyIdsByIndex,
      });

      if (partialResult.recommendedNextStep === 'TARGETED_ASSESSMENT') {
        const pendingIds = competencyIdsNeedingTargetedAssessment(partialResult.competencyResults);
        const targetedForm = await this.evaluation.generateSkillForm(
          {
            skillCode: stored.sdeSkillCode,
            proficiency: stored.proficiency,
            attemptId: sessionId,
            skillFocus: stored.skillFocus ?? undefined,
            stage: 'TARGETED',
            catalogSkillCode: stored.catalogSkillCode,
            targetCompetencyIds: pendingIds.slice(0, 3),
          },
          user.sub,
        );
        stored.stage = 'TARGETED';
        stored.pendingCompetencyIds = pendingIds;
        stored.scoringToken = targetedForm.scoringToken;
        const indexOffset = stored.diagnosticItems?.length ?? 0;
        stored.items = targetedForm.items.map((item) => ({
          ...item,
          index: item.index + indexOffset,
        }));
        stored.answers = [];
        stored.timeMinutes = targetedForm.timeMinutes;
        stored.expiresAt = new Date(Date.now() + targetedForm.timeMinutes * 60_000).toISOString();
        await this.persistSession(stored);
        return CompleteSkillVerifyResponseSchema.parse({
          claim: this.mapClaim(claim),
          technicalFailure: false,
          grade: stageGrade,
          assessmentResult: partialResult,
          sessionContinues: true,
          session: this.toDto(stored, partialResult.uncertainties),
        });
      }
    }

    const mergedGrade =
      stored.intelligenceEnabled && stored.diagnosticGrade
        ? this.mergeGrades(stored.diagnosticGrade, stageGrade)
        : stageGrade;

    const blueprint = stored.intelligenceEnabled
      ? this.intelligence.resolveBlueprint(stored.catalogSkillCode)
      : null;
    const competencyIdsByIndex = stored.intelligenceEnabled
      ? this.competencyMapFromItems([...(stored.diagnosticItems ?? []), ...stored.items])
      : new Map<number, readonly string[]>();
    const assessmentResult =
      blueprint && stored.intelligenceEnabled
        ? this.intelligence.buildAssessmentResult({
            catalogSkillCode: stored.catalogSkillCode,
            attemptId: sessionId,
            blueprint,
            targetProficiency: stored.proficiency,
            grade: mergedGrade,
            competencyIdsByIndex,
          })
        : null;

    let genuinePass = mergedGrade.passed;
    let verifiedProficiency: SkillProficiency | undefined;
    if (assessmentResult) {
      const gate = await this.verification.evaluateClaimVerification({
        studentId: user.sub,
        claimId: claim.id,
        catalogSkillCode: stored.catalogSkillCode,
        targetProficiency: stored.proficiency,
        supportedProficiency: assessmentResult.highestAssessmentSupportedProficiency,
        recommendedNextStep: assessmentResult.recommendedNextStep,
        confidence: assessmentResult.confidence,
        interviewPassed: stored.interviewPassed,
      });
      assessmentResult.recommendedNextStep = gate.recommendedNextStep;
      assessmentResult.requiresInterview = gate.requiresInterview;
      const meetsTarget = assessmentMeetsTarget(
        assessmentResult.highestAssessmentSupportedProficiency,
        stored.proficiency,
      );
      if (meetsTarget && !gate.canFinalizeClaim) {
        stored.pendingAssessmentResult = assessmentResult;
        stored.pendingGrade = mergedGrade;
        stored.verificationStep = gate.recommendedNextStep;
        stored.stage = 'COMPLETE';
        await this.persistSession(stored);
        return CompleteSkillVerifyResponseSchema.parse({
          claim: this.mapClaim(claim),
          technicalFailure: false,
          grade: mergedGrade,
          assessmentResult,
          pendingVerification: true,
          session: this.toDto(stored),
        });
      }
      genuinePass = meetsTarget && gate.canFinalizeClaim;
      if (genuinePass) {
        verifiedProficiency = claimProficiencyFromDemonstrated(
          assessmentResult.highestAssessmentSupportedProficiency,
        );
      }
    }

    return this.finalizeAttempt({
      user,
      sessionId,
      stored,
      claim,
      progress,
      selected,
      technicalFailure: false,
      integrityTerminated: false,
      grade: mergedGrade,
      assessmentResult,
      genuinePassOverride: assessmentResult ? genuinePass : undefined,
      verifiedProficiency,
      explanation: request.explanation,
    });
  }

  async startInterview(user: RequestUser, sessionId: string) {
    this.assertStudent(user);
    const stored = await this.loadSession(user.sub, sessionId);
    if (!stored.pendingAssessmentResult) {
      throw new BadRequestException({
        error: 'verification_not_pending',
        message: 'Complete the assessment before starting the defense interview.',
        statusCode: 400,
      });
    }
    const interviewProficiency = this.interviewProficiency(stored.proficiency);
    const interview = await this.evaluation.generateSkillInterview({
      skillCode: stored.catalogSkillCode,
      proficiency: interviewProficiency,
    });
    stored.interviewQuestions = interview.questions;
    await this.persistSession(stored);
    return SkillVerifyInterviewDtoSchema.parse({
      sessionId: stored.sessionId,
      skillCode: stored.catalogSkillCode,
      proficiency: interviewProficiency,
      questions: interview.questions,
    });
  }

  async completeInterview(user: RequestUser, sessionId: string, body: unknown) {
    this.assertStudent(user);
    const request = CompleteSkillVerifyInterviewRequestSchema.parse(body ?? {});
    const stored = await this.loadSession(user.sub, sessionId);
    if (!stored.pendingAssessmentResult) {
      throw new BadRequestException({
        error: 'verification_not_pending',
        message: 'No pending verification session.',
        statusCode: 400,
      });
    }
    const interviewProficiency = this.interviewProficiency(stored.proficiency);
    const grade = await this.evaluation.gradeSkillInterview({
      skillCode: stored.catalogSkillCode,
      proficiency: interviewProficiency,
      items: request.items,
    });
    stored.interviewPassed = grade.passed;
    stored.interviewExplanation = grade.explanation;
    await this.persistSession(stored);
    if (!grade.passed) {
      const claim = await this.loadOwnClaim(user.sub, stored.claimId);
      const { progress, selected } = this.progressForClaim(
        claim,
        stored.skillFocus ?? skillFocusFromMetadata(claim.sourceMetadata),
      );
      return this.finalizeAttempt({
        user,
        sessionId,
        stored,
        claim,
        progress,
        selected,
        technicalFailure: false,
        integrityTerminated: false,
        grade: stored.pendingGrade ?? null,
        assessmentResult: stored.pendingAssessmentResult,
        genuinePassOverride: false,
        explanation: grade.explanation,
      });
    }
    return this.finalizeVerification(user, sessionId);
  }

  async finalizeVerification(
    user: RequestUser,
    sessionId: string,
  ): Promise<CompleteSkillVerifyResponse> {
    this.assertStudent(user);
    const stored = await this.loadSession(user.sub, sessionId);
    if (!stored.pendingAssessmentResult || !stored.pendingGrade) {
      throw new BadRequestException({
        error: 'verification_not_pending',
        message: 'No pending verification to finalize.',
        statusCode: 400,
      });
    }
    const claim = await this.loadOwnClaim(user.sub, stored.claimId);
    const gate = await this.verification.evaluateClaimVerification({
      studentId: user.sub,
      claimId: claim.id,
      catalogSkillCode: stored.catalogSkillCode,
      targetProficiency: stored.proficiency,
      supportedProficiency: stored.pendingAssessmentResult.highestAssessmentSupportedProficiency,
      recommendedNextStep: stored.pendingAssessmentResult.recommendedNextStep,
      confidence: stored.pendingAssessmentResult.confidence,
      interviewPassed: stored.interviewPassed,
    });
    stored.verificationStep = gate.recommendedNextStep;
    if (!gate.canFinalizeClaim) {
      await this.persistSession(stored);
      return CompleteSkillVerifyResponseSchema.parse({
        claim: this.mapClaim(claim),
        technicalFailure: false,
        grade: stored.pendingGrade,
        assessmentResult: {
          ...stored.pendingAssessmentResult,
          recommendedNextStep: gate.recommendedNextStep,
          requiresInterview: gate.requiresInterview,
        },
        pendingVerification: true,
        session: this.toDto(stored),
      });
    }
    const { progress, selected } = this.progressForClaim(
      claim,
      stored.skillFocus ?? skillFocusFromMetadata(claim.sourceMetadata),
    );
    return this.finalizeAttempt({
      user,
      sessionId,
      stored,
      claim,
      progress,
      selected,
      technicalFailure: false,
      integrityTerminated: false,
      grade: stored.pendingGrade,
      assessmentResult: stored.pendingAssessmentResult,
      genuinePassOverride: true,
      verifiedProficiency: claimProficiencyFromDemonstrated(
        stored.pendingAssessmentResult.highestAssessmentSupportedProficiency,
      ),
    });
  }

  private interviewProficiency(_claimProficiency: SkillProficiency): 'ADVANCED' | 'PROFESSIONAL' {
    return 'ADVANCED';
  }

  private async finalizeAttempt(input: {
    user: RequestUser;
    sessionId: string;
    stored: StoredSession;
    claim: Awaited<ReturnType<SkillVerificationService['loadOwnClaim']>>;
    progress: ReturnType<SkillVerificationService['progressForClaim']>['progress'];
    selected: ReturnType<SkillVerificationService['progressForClaim']>['selected'];
    technicalFailure: boolean;
    integrityTerminated: boolean;
    grade: GradeSdeSkillFormResponse | null;
    assessmentResult: AssessmentResult | null;
    genuinePassOverride?: boolean;
    verifiedProficiency?: SkillProficiency;
    explanation?: string;
  }): Promise<CompleteSkillVerifyResponse> {
    const genuinePass =
      input.genuinePassOverride ??
      (input.grade?.passed === true && !input.technicalFailure && !input.integrityTerminated);

    const event: SkillClaimEvent = input.integrityTerminated
      ? { type: 'GENUINE_FAIL' }
      : input.technicalFailure
        ? { type: 'TECHNICAL_FAILURE' }
        : genuinePass
          ? { type: 'GENUINE_PASS', verifiedProficiency: input.verifiedProficiency }
          : { type: 'GENUINE_FAIL' };

    const transition = applySkillClaimTransition({
      claim: {
        status: input.selected.status,
        proficiency: input.claim.proficiency,
        strikes: input.selected.strikes,
        lockedUntil: input.selected.lockedUntil ? new Date(input.selected.lockedUntil) : null,
        verifiedUntil: null,
      },
      event,
      now: new Date(),
      lastGenuineFailureAt: input.selected.lastGenuineFailureAt
        ? new Date(input.selected.lastGenuineFailureAt)
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
      input.explanation ??
      (input.integrityTerminated
        ? 'Proctoring warning limit reached; attempt recorded as a fail.'
        : input.technicalFailure
          ? 'Technical failure recorded; claim status unchanged.'
          : input.assessmentResult
            ? this.buildAssessmentExplanation(input.assessmentResult, genuinePass)
            : genuinePass
              ? 'SDE v4 form cleared the pass bar.'
              : 'SDE v4 form did not clear the pass bar.');

    const nowIso = new Date().toISOString();
    const lastGenuineFailureAt = event.type === 'GENUINE_PASS' ? null : nowIso;
    const nextLockedUntil = transition.next.lockedUntil?.toISOString() ?? null;
    const nextFocus = upsertFocusProgress(input.progress, {
      focus: input.selected.focus,
      status: transition.next.status,
      strikes: transition.next.strikes,
      lockedUntil: nextLockedUntil,
      lastAttemptId: input.sessionId,
      lastGenuineFailureAt,
      retryAvailableAt: retryAvailableAtForFocus(
        transition.next.status,
        nextLockedUntil,
        lastGenuineFailureAt,
      ),
    });
    const nextMetadata = mergeFocusProgressIntoMetadata(
      input.claim.sourceMetadata,
      input.selected.focus,
      nextFocus,
    );

    const [updatedClaim] = await this.prisma.$transaction([
      this.prisma.skillClaim.update({
        where: { id: input.claim.id },
        data: {
          status: transition.next.status,
          proficiency: transition.next.proficiency,
          strikes: transition.next.strikes,
          lockedUntil: transition.next.lockedUntil,
          verifiedUntil: transition.next.verifiedUntil,
          lastAttemptId: input.sessionId,
          sourceMetadata: nextMetadata as never,
        },
        include: { skill: { select: { code: true, name: true } } },
      }),
      this.prisma.skillVerificationAttempt.create({
        data: {
          claimId: input.claim.id,
          assessmentAttemptId: null,
          claimedProficiency: input.claim.proficiency,
          technicalFailure: input.technicalFailure,
          passed: input.technicalFailure ? null : genuinePass,
          explanation,
          marksEarned: input.grade?.marksEarned ?? null,
          marksTotal: input.grade?.marksTotal ?? null,
          scorePercent: input.grade?.scorePercent ?? null,
          assessmentResultJson: input.assessmentResult as never,
        },
      }),
    ]);

    await this.redis.del(skillVerifyRedisKey(input.sessionId));

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
          userId: input.user.sub,
          skillName: input.stored.skillName,
          status: kafkaStatus,
          detail: explanation,
        }),
      });
    }

    return CompleteSkillVerifyResponseSchema.parse({
      claim: mapped,
      technicalFailure: input.technicalFailure,
      grade: input.grade,
      assessmentResult: input.assessmentResult,
      sessionContinues: false,
      session: null,
    });
  }

  private buildAssessmentExplanation(result: AssessmentResult, passed: boolean): string {
    if (passed) {
      return `Competency assessment supports ${result.highestAssessmentSupportedProficiency} with ${result.confidence.toLowerCase()} confidence.`;
    }
    if (result.uncertainties.length > 0) {
      return `Assessment supported ${result.highestAssessmentSupportedProficiency}. Gaps remain in: ${result.uncertainties.join(', ')}.`;
    }
    return `Assessment supported ${result.highestAssessmentSupportedProficiency}; target ${result.targetProficiency} not verified.`;
  }

  private async gradeStoredItems(
    stored: StoredSession,
    userId: string,
  ): Promise<GradeSdeSkillFormResponse> {
    const responses = stored.items.map((item) => {
      const answer = stored.answers.find((row) => row.index === item.index);
      return {
        index:
          stored.stage === 'TARGETED' && stored.diagnosticItems
            ? item.index - stored.diagnosticItems.length
            : item.index,
        selectedKey: answer?.selectedKey,
        text: answer?.text,
      };
    });
    return this.evaluation.gradeSkillForm(
      {
        skillCode: stored.sdeSkillCode,
        proficiency: stored.proficiency,
        scoringToken: stored.scoringToken,
        responses,
      },
      userId,
    );
  }

  private mergeGrades(
    diagnostic: GradeSdeSkillFormResponse,
    targeted: GradeSdeSkillFormResponse,
  ): GradeSdeSkillFormResponse {
    const offset = diagnostic.itemResults.length;
    const itemResults = [
      ...diagnostic.itemResults,
      ...targeted.itemResults.map((row) => ({ ...row, index: row.index + offset })),
    ];
    const marksEarned = itemResults.reduce((sum, row) => sum + row.marksEarned, 0);
    const marksTotal = itemResults.reduce((sum, row) => sum + row.marksMax, 0);
    return {
      ...targeted,
      marksEarned,
      marksTotal,
      scorePercent: marksTotal > 0 ? (marksEarned / marksTotal) * 100 : 0,
      itemResults,
      mcqCorrect: diagnostic.mcqCorrect + targeted.mcqCorrect,
      mcqTotal: diagnostic.mcqTotal + targeted.mcqTotal,
      traceCorrect: diagnostic.traceCorrect + targeted.traceCorrect,
      traceTotal: diagnostic.traceTotal + targeted.traceTotal,
      passed: targeted.passed,
    };
  }

  private competencyMapFromItems(
    items: SkillVerifySessionDto['items'],
  ): Map<number, readonly string[]> {
    return new Map(items.map((item) => [item.index, item.competencyIds ?? []] as const));
  }

  private async persistSession(stored: StoredSession): Promise<void> {
    await this.redis.setex(
      skillVerifyRedisKey(stored.sessionId),
      ttlSeconds(stored.expiresAt),
      JSON.stringify(stored),
    );
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

  private toDto(stored: StoredSession, pendingCompetencies?: string[]): SkillVerifySessionDto {
    const remaining = Math.max(0, Math.floor((Date.parse(stored.expiresAt) - Date.now()) / 1000));
    const stageLabel =
      stored.stage === 'DIAGNOSTIC'
        ? 'Short diagnostic'
        : stored.stage === 'TARGETED'
          ? 'Targeted verification'
          : undefined;
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
      stage: stored.stage,
      intelligenceEnabled: stored.intelligenceEnabled,
      stageLabel,
      pendingCompetencies,
      pendingVerification: Boolean(stored.pendingAssessmentResult),
      verificationStep: stored.verificationStep,
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
    const requested = skillFocusFromMetadata(row.sourceMetadata);
    const progress = hydrateFocusProgress({
      skillCode: row.skill.code,
      metadata: row.sourceMetadata,
      status: row.status,
      strikes: row.strikes,
      lockedUntil: row.lockedUntil?.toISOString() ?? null,
      lastAttemptId: row.lastAttemptId,
      lastGenuineFailureAt: null,
    });
    const skillFocus = resolveSkillFocus(row.skill.code, requested);
    const selected =
      (skillFocus ? focusProgressFor(progress, skillFocus) : null) ??
      (requested ? focusProgressFor(progress, requested) : null);
    const retryAvailableAt = selected
      ? retryAvailableAtForFocus(
          selected.status,
          selected.lockedUntil,
          selected.lastGenuineFailureAt,
        )
      : null;
    return SkillClaimDtoSchema.parse({
      claimId: row.id,
      studentId: row.studentId,
      skillCode: row.skill.code,
      proficiency: row.proficiency,
      status: selected?.status ?? row.status,
      strikes: selected?.strikes ?? row.strikes,
      lockedUntil: selected?.lockedUntil ?? row.lockedUntil?.toISOString() ?? null,
      lastAttemptId: selected?.lastAttemptId ?? row.lastAttemptId,
      skillFocus,
      focusProgress: progress,
      retryAvailableAt,
    });
  }

  private progressForClaim(
    claim: {
      proficiency: SkillProficiency;
      status: string;
      strikes: number;
      lockedUntil: Date | null;
      lastAttemptId: string | null;
      sourceMetadata?: unknown;
      skill: { code: string };
    },
    requested: string | null | undefined,
  ) {
    const fromMeta = skillFocusFromMetadata(claim.sourceMetadata);
    const focus = resolveSkillFocus(claim.skill.code, requested ?? fromMeta);
    const progress = readFocusProgress(claim.sourceMetadata);
    const selected =
      (focus ? focusProgressFor(progress, focus) : null) ??
      (requested ? focusProgressFor(progress, requested) : null) ??
      (fromMeta ? focusProgressFor(progress, fromMeta) : null);
    return {
      progress,
      selected: selected ?? {
        focus: focus ?? 'default',
        status: claim.status as SkillClaimStatus,
        strikes: claim.strikes,
        lockedUntil: claim.lockedUntil?.toISOString() ?? null,
        lastAttemptId: claim.lastAttemptId,
        lastGenuineFailureAt: null,
        retryAvailableAt: null,
      },
    };
  }
}
