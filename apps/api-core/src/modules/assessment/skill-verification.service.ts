import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  CompleteSkillVerifyRequestSchema,
  CompleteSkillVerifyResponseSchema,
  CompleteSkillVerifyInterviewRequestSchema,
  StartSkillVerifyInterviewRequestSchema,
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
  normalizeTracePrompt,
  resolveSkillFocus,
  retryAvailableAtForFocus,
  skillClaimVerificationInProgress,
  skillFocusFromMetadata,
  upsertFocusProgress,
  withSkillVerificationPending,
  withoutSkillVerificationPending,
  sdeV4FormCodeForCatalogSkill,
  getSkillBlueprint,
  SKILL_VERIFICATION_DISCOVERY_TARGET,
  type AssessmentResult,
  type SkillEvidenceContext,
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
import {
  claimProficiencyFromDemonstrated,
  hasDemonstratedProficiency,
} from './verified-proficiency.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { env } from '../../platform/config/env.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import {
  EvaluationService,
  SKILL_INTERVIEW_EXAMINER_PROMPT_REF,
} from '../evaluation/evaluation.service.js';
import { VerificationOrchestratorService } from '../evidence/verification-orchestrator.service.js';
import { ProfileCompletionService } from '../users/profile-completion.service.js';
import { AssessmentIntelligenceService } from './assessment-intelligence.service.js';
import { applySkillClaimTransition, type SkillClaimEvent } from './skill-claim-state-machine.js';
import { buildSkillPolymorphicSession } from './polymorphic-assessment-session.mapper.js';
import { SKILL_VERIFY_GRADE_QUEUE } from '../../platform/queue/queue.names.js';
import type { SkillVerifyGradeJobPayload } from './skill-verify-grade.processor.js';

/** Max LLM regens after the first cached question set for a pending verification session. */
const SKILL_VERIFY_INTERVIEW_MAX_REGENERATIONS = 2;

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
  interviewRegenerations?: number;
  interviewExaminerPromptRef?: string;
  interviewGraderPromptRef?: string | null;
  evidenceContext?: SkillEvidenceContext;
  gradingStatus?: 'QUEUED' | 'PROCESSING' | 'FAILED';
  gradingStartedAt?: string;
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

function normalizeInterviewText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function withSeT02InterviewAudit(
  result: AssessmentResult | null | undefined,
  stored: StoredSession,
): AssessmentResult | null | undefined {
  if (!result) return result;
  const examiner = stored.interviewExaminerPromptRef;
  const grader = stored.interviewGraderPromptRef;
  if (!examiner && !grader) return result;
  return {
    ...result,
    seT02Interview: {
      examinerPromptRef: examiner ?? SKILL_INTERVIEW_EXAMINER_PROMPT_REF,
      graderPromptRef: grader ?? null,
    },
  };
}

function bindInterviewAnswers(
  storedQuestions: Array<{ index: number; text: string }>,
  requestItems: Array<{ index: number; question?: string; answer: string }>,
): Array<{ index: number; question: string; answer: string }> {
  if (storedQuestions.length < 3) {
    throw new BadRequestException({
      error: 'interview_not_started',
      message: 'Start the defense interview before submitting answers.',
      statusCode: 400,
    });
  }

  const storedByIndex = new Map(storedQuestions.map((question) => [question.index, question.text]));

  return requestItems.map((item) => {
    const expectedQuestion = storedByIndex.get(item.index);
    if (!expectedQuestion) {
      throw new BadRequestException({
        error: 'interview_question_mismatch',
        message: `Interview answer index ${item.index} does not match the active interview.`,
        statusCode: 400,
      });
    }
    if (
      item.question !== undefined &&
      normalizeInterviewText(item.question) !== normalizeInterviewText(expectedQuestion)
    ) {
      throw new BadRequestException({
        error: 'interview_question_mismatch',
        message: 'Interview answers must correspond to the server-generated questions.',
        statusCode: 400,
      });
    }
    return {
      index: item.index,
      question: expectedQuestion,
      answer: item.answer,
    };
  });
}

@Injectable()
export class SkillVerificationService {
  private readonly logger = new Logger(SkillVerificationService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(EvaluationService) private readonly evaluation: EvaluationService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(AssessmentIntelligenceService)
    private readonly intelligence: AssessmentIntelligenceService,
    @Inject(VerificationOrchestratorService)
    private readonly verification: VerificationOrchestratorService,
    @Inject(ProfileCompletionService)
    private readonly profileCompletion: ProfileCompletionService,
    @Optional()
    @InjectQueue(SKILL_VERIFY_GRADE_QUEUE)
    private readonly gradeQueue?: Queue<SkillVerifyGradeJobPayload>,
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
    await this.profileCompletion.assertCompleteForSkillVerification(userId);
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
    const evidenceContext = await this.verification.loadEvidenceContext(user.sub, claim.skill.code);
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
      evidenceContext,
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
      evidenceContext,
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
    const evidenceContext =
      stored?.evidenceContext ??
      (await this.verification.loadEvidenceContext(user.sub, claim.skill.code));
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
      evidenceContext,
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

    if (
      stored.gradingStatus === 'QUEUED' ||
      stored.gradingStatus === 'PROCESSING' ||
      stored.gradingStatus === 'FAILED'
    ) {
      await this.persistSession(stored);
      await this.enqueueBackgroundGrading(sessionId, user.sub);
      const mapped = await this.markClaimVerificationInProgress(
        claim,
        sessionId,
        progress,
        selected,
      );
      return this.buildGradingAcceptedResponse(mapped);
    }

    if (!this.gradeQueue) {
      return this.executeFormGrading({
        user,
        sessionId,
        stored,
        claim,
        progress,
        selected,
        explanation: request.explanation,
      });
    }

    stored.gradingStatus = 'QUEUED';
    await this.persistSession(stored);
    await this.enqueueBackgroundGrading(sessionId, user.sub);
    const mapped = await this.markClaimVerificationInProgress(claim, sessionId, progress, selected);
    return this.buildGradingAcceptedResponse(mapped);
  }

  /** Grades open items, settles claim, emits verification events (HTTP async + Bull worker). */
  async processQueuedComplete(sessionId: string, userId: string): Promise<void> {
    let stored: StoredSession;
    try {
      stored = await this.loadSession(userId, sessionId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        return;
      }
      throw err;
    }
    if (stored.gradingStatus === 'PROCESSING') {
      const startedMs = stored.gradingStartedAt ? Date.parse(stored.gradingStartedAt) : 0;
      const stale = !Number.isFinite(startedMs) || Date.now() - startedMs > 5 * 60_000;
      if (!stale) {
        return;
      }
      stored.gradingStatus = 'QUEUED';
    }
    if (stored.gradingStatus === 'FAILED') {
      stored.gradingStatus = 'QUEUED';
    }
    if (stored.gradingStatus !== 'QUEUED') {
      return;
    }
    stored.gradingStatus = 'PROCESSING';
    stored.gradingStartedAt = new Date().toISOString();
    await this.persistSession(stored);

    const claim = await this.loadOwnClaim(userId, stored.claimId);
    const user: RequestUser = { sub: userId, role: 'STUDENT', inst: null };
    const { progress, selected } = this.progressForClaim(
      claim,
      stored.skillFocus ?? skillFocusFromMetadata(claim.sourceMetadata),
    );

    try {
      await this.executeFormGrading({
        user,
        sessionId,
        stored,
        claim,
        progress,
        selected,
      });
    } catch (err) {
      stored.gradingStatus = 'FAILED';
      await this.persistSession(stored);
      this.logger.error(
        `Skill verify grading failed for ${sessionId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  private buildGradingAcceptedResponse(claim: SkillClaimDto) {
    return CompleteSkillVerifyResponseSchema.parse({
      claim,
      technicalFailure: false,
      grade: null,
      gradingAccepted: true,
    });
  }

  private async markClaimVerificationInProgress(
    claim: Awaited<ReturnType<SkillVerificationService['loadOwnClaim']>>,
    sessionId: string,
    progress: ReturnType<SkillVerificationService['progressForClaim']>['progress'],
    selected: ReturnType<SkillVerificationService['progressForClaim']>['selected'],
  ): Promise<SkillClaimDto> {
    const nextFocus = upsertFocusProgress(progress, {
      focus: selected.focus,
      status: selected.status,
      strikes: selected.strikes,
      lockedUntil: selected.lockedUntil,
      lastAttemptId: sessionId,
      lastGenuineFailureAt: selected.lastGenuineFailureAt ?? null,
      retryAvailableAt:
        selected.retryAvailableAt ??
        retryAvailableAtForFocus(
          selected.status,
          selected.lockedUntil,
          selected.lastGenuineFailureAt ?? null,
        ),
    });
    const nextMetadata = mergeFocusProgressIntoMetadata(
      withSkillVerificationPending(claim.sourceMetadata, sessionId),
      selected.focus,
      nextFocus,
    );
    const updated = await this.prisma.skillClaim.update({
      where: { id: claim.id },
      data: {
        lastAttemptId: sessionId,
        sourceMetadata: nextMetadata as never,
      },
      include: { skill: { select: { code: true, name: true } } },
    });
    return this.mapClaim(updated);
  }

  private async enqueueBackgroundGrading(sessionId: string, userId: string): Promise<void> {
    if (this.gradeQueue) {
      try {
        await this.gradeQueue.add(
          'grade',
          { sessionId, userId },
          { jobId: `skill-verify-grade:${sessionId}` },
        );
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Skill verify Bull enqueue skipped (${sessionId}): ${detail}`);
      }
    }
    this.scheduleBackgroundGrading(sessionId, userId);
  }

  private scheduleBackgroundGrading(sessionId: string, userId: string): void {
    void this.processQueuedComplete(sessionId, userId).catch((err) => {
      this.logger.error(
        `In-process skill verify grading failed for ${sessionId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  private async executeFormGrading(input: {
    user: RequestUser;
    sessionId: string;
    stored: StoredSession;
    claim: Awaited<ReturnType<SkillVerificationService['loadOwnClaim']>>;
    progress: ReturnType<SkillVerificationService['progressForClaim']>['progress'];
    selected: ReturnType<SkillVerificationService['progressForClaim']>['selected'];
    explanation?: string;
  }): Promise<CompleteSkillVerifyResponse> {
    const { user, sessionId, stored, claim, progress, selected } = input;
    const stageGrade = await this.gradeStoredItems(stored, user.sub);

    if (stored.intelligenceEnabled && stored.stage === 'DIAGNOSTIC') {
      stored.diagnosticScoringToken = stored.scoringToken;
      stored.diagnosticItems = stored.items;
      stored.diagnosticAnswers = stored.answers;
      stored.diagnosticGrade = stageGrade;
      stored.stage = 'COMPLETE';
    }

    const mergedGrade = stored.diagnosticGrade ?? stageGrade;

    const blueprint = stored.intelligenceEnabled
      ? this.intelligence.resolveBlueprint(stored.catalogSkillCode)
      : null;
    const intelligenceItems = stored.diagnosticItems ?? stored.items;
    const competencyIdsByIndex = stored.intelligenceEnabled
      ? this.competencyMapFromItems(intelligenceItems)
      : new Map<number, readonly string[]>();
    const assessmentResult =
      blueprint && stored.intelligenceEnabled
        ? this.intelligence.buildAssessmentResult({
            catalogSkillCode: stored.catalogSkillCode,
            attemptId: sessionId,
            blueprint,
            grade: mergedGrade,
            competencyIdsByIndex,
            allowUpwardProbe: false,
          })
        : null;

    let genuinePass = mergedGrade.passed;
    let provisionalSettlement = false;
    let verifiedProficiency: SkillProficiency | undefined;
    let verificationSettlement:
      { decision: 'VERIFIED' | 'PROVISIONAL'; confidence: number; reasons: string[] } | undefined;
    if (assessmentResult) {
      const demonstrated = assessmentResult.highestAssessmentSupportedProficiency;
      if (hasDemonstratedProficiency(demonstrated)) {
        const gate = await this.verification.evaluateClaimVerification({
          studentId: user.sub,
          claimId: claim.id,
          catalogSkillCode: stored.catalogSkillCode,
          targetProficiency: demonstrated,
          supportedProficiency: demonstrated,
          recommendedNextStep: assessmentResult.recommendedNextStep,
          confidence: assessmentResult.confidence,
          assessmentComplete: assessmentResult.assessmentComplete,
          interviewPassed: stored.interviewPassed,
        });
        assessmentResult.recommendedNextStep = gate.recommendedNextStep;
        assessmentResult.requiresInterview = gate.requiresInterview;
        assessmentResult.requiresEvidenceVerification = gate.requiresEvidence;
        if (gate.verificationDecision) {
          assessmentResult.verificationDecision = gate.verificationDecision;
          assessmentResult.claimConfidence = gate.claimConfidence;
        }
        const pendingVerification =
          assessmentResult.assessmentComplete &&
          (gate.recommendedNextStep === 'EVIDENCE_VERIFICATION' ||
            gate.recommendedNextStep === 'INTERVIEW');
        if (pendingVerification && !gate.canFinalizeClaim) {
          stored.pendingAssessmentResult = assessmentResult;
          stored.pendingGrade = mergedGrade;
          stored.verificationStep = gate.recommendedNextStep;
          stored.stage = 'COMPLETE';
          stored.gradingStatus = undefined;
          await this.persistSession(stored);
          const mapped = await this.markClaimVerificationInProgress(
            claim,
            sessionId,
            progress,
            selected,
          );
          return CompleteSkillVerifyResponseSchema.parse({
            claim: mapped,
            technicalFailure: false,
            grade: mergedGrade,
            assessmentResult,
            pendingVerification: true,
            session: this.toDto(stored),
          });
        }
        const assessmentPassed = this.intelligence.claimPassesFromAssessment(assessmentResult);
        genuinePass =
          assessmentPassed && gate.canFinalizeClaim && gate.verificationDecision === 'VERIFIED';
        provisionalSettlement =
          assessmentPassed && gate.canFinalizeClaim && gate.verificationDecision === 'PROVISIONAL';
        if (
          (genuinePass || provisionalSettlement) &&
          (gate.verificationDecision === 'VERIFIED' ||
            gate.verificationDecision === 'PROVISIONAL') &&
          gate.claimConfidence !== undefined
        ) {
          if (genuinePass) {
            verifiedProficiency = claimProficiencyFromDemonstrated(demonstrated);
          }
          verificationSettlement = {
            decision: gate.verificationDecision,
            confidence: gate.claimConfidence,
            reasons: gate.reasons,
          };
        }
      } else {
        genuinePass = false;
        assessmentResult.assessmentPassed = false;
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
      provisionalSettlement: assessmentResult ? provisionalSettlement : undefined,
      verifiedProficiency,
      verificationSettlement,
      explanation: input.explanation,
    });
  }

  async startInterview(user: RequestUser, sessionId: string, body: unknown = {}) {
    this.assertStudent(user);
    const request = StartSkillVerifyInterviewRequestSchema.parse(body ?? {});
    const stored = await this.loadSession(user.sub, sessionId);
    if (!stored.pendingAssessmentResult) {
      throw new BadRequestException({
        error: 'verification_not_pending',
        message: 'Complete the assessment before starting the defense interview.',
        statusCode: 400,
      });
    }
    const interviewProficiency = this.interviewProficiency(
      stored.pendingAssessmentResult.highestAssessmentSupportedProficiency,
    );

    if (stored.interviewQuestions?.length && !request.regenerate) {
      return SkillVerifyInterviewDtoSchema.parse({
        sessionId: stored.sessionId,
        skillCode: stored.catalogSkillCode,
        proficiency: interviewProficiency,
        questions: stored.interviewQuestions,
      });
    }

    if (request.regenerate) {
      const prior = stored.interviewRegenerations ?? 0;
      if (prior >= SKILL_VERIFY_INTERVIEW_MAX_REGENERATIONS) {
        throw new HttpException(
          {
            error: 'interview_regen_cap',
            message: 'Interview question regeneration limit reached for this session.',
            statusCode: 429,
            limit: SKILL_VERIFY_INTERVIEW_MAX_REGENERATIONS,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      stored.interviewRegenerations = prior + 1;
    }

    const interview = await this.evaluation.generateSkillInterview({
      skillCode: stored.catalogSkillCode,
      proficiency: interviewProficiency,
    });
    stored.interviewQuestions = interview.questions;
    stored.interviewExaminerPromptRef = interview.promptRef;
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
    const interviewProficiency = this.interviewProficiency(
      stored.pendingAssessmentResult.highestAssessmentSupportedProficiency,
    );
    const gradedItems = bindInterviewAnswers(stored.interviewQuestions ?? [], request.items);
    const grade = await this.evaluation.gradeSkillInterview({
      skillCode: stored.catalogSkillCode,
      proficiency: interviewProficiency,
      items: gradedItems,
    });
    stored.interviewPassed = grade.passed;
    stored.interviewExplanation = grade.explanation;
    stored.interviewGraderPromptRef = grade.promptRef;
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
    const demonstrated = stored.pendingAssessmentResult.highestAssessmentSupportedProficiency;
    if (!hasDemonstratedProficiency(demonstrated)) {
      throw new BadRequestException({
        error: 'verification_not_demonstrated',
        message: 'Assessment did not demonstrate a certifiable proficiency level.',
        statusCode: 400,
      });
    }
    const gate = await this.verification.evaluateClaimVerification({
      studentId: user.sub,
      claimId: claim.id,
      catalogSkillCode: stored.catalogSkillCode,
      targetProficiency: demonstrated,
      supportedProficiency: demonstrated,
      recommendedNextStep: stored.pendingAssessmentResult.recommendedNextStep,
      confidence: stored.pendingAssessmentResult.confidence,
      assessmentComplete: stored.pendingAssessmentResult.assessmentComplete,
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
          requiresEvidenceVerification: gate.requiresEvidence,
        },
        pendingVerification: true,
        session: this.toDto(stored),
      });
    }
    const { progress, selected } = this.progressForClaim(
      claim,
      stored.skillFocus ?? skillFocusFromMetadata(claim.sourceMetadata),
    );
    const settledAssessmentResult = {
      ...stored.pendingAssessmentResult,
      recommendedNextStep: gate.recommendedNextStep,
      requiresInterview: gate.requiresInterview,
      requiresEvidenceVerification: gate.requiresEvidence,
      ...(gate.verificationDecision
        ? {
            verificationDecision: gate.verificationDecision,
            claimConfidence: gate.claimConfidence,
          }
        : {}),
    };
    const assessmentPassed = this.intelligence.claimPassesFromAssessment(settledAssessmentResult);
    const canFinalize =
      assessmentPassed && gate.canFinalizeClaim && gate.verificationDecision === 'VERIFIED';
    const provisionalSettlement =
      assessmentPassed && gate.canFinalizeClaim && gate.verificationDecision === 'PROVISIONAL';
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
      assessmentResult: settledAssessmentResult,
      genuinePassOverride: canFinalize,
      provisionalSettlement,
      verifiedProficiency: canFinalize ? claimProficiencyFromDemonstrated(demonstrated) : undefined,
      verificationSettlement:
        (canFinalize || provisionalSettlement) &&
        (gate.verificationDecision === 'VERIFIED' || gate.verificationDecision === 'PROVISIONAL') &&
        gate.claimConfidence !== undefined
          ? {
              decision: gate.verificationDecision,
              confidence: gate.claimConfidence,
              reasons: gate.reasons,
            }
          : undefined,
    });
  }

  private interviewProficiency(
    demonstrated: AssessmentResult['highestAssessmentSupportedProficiency'],
  ): 'ADVANCED' | 'PROFESSIONAL' {
    return demonstrated === 'PROFESSIONAL' ? 'PROFESSIONAL' : 'ADVANCED';
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
    provisionalSettlement?: boolean;
    verifiedProficiency?: SkillProficiency;
    verificationSettlement?: {
      decision: 'VERIFIED' | 'PROVISIONAL';
      confidence: number;
      reasons: string[];
    };
    explanation?: string;
  }): Promise<CompleteSkillVerifyResponse> {
    const genuinePass =
      input.genuinePassOverride ??
      (input.grade?.passed === true && !input.technicalFailure && !input.integrityTerminated);
    const provisionalSettlement = input.provisionalSettlement === true;

    const refreshDays = this.resolveRefreshDays(input.stored.catalogSkillCode);
    const event: SkillClaimEvent = input.integrityTerminated
      ? { type: 'GENUINE_FAIL' }
      : input.technicalFailure
        ? { type: 'TECHNICAL_FAILURE' }
        : provisionalSettlement
          ? { type: 'PROVISIONAL_SETTLEMENT' }
          : genuinePass
            ? {
                type: 'GENUINE_PASS',
                verifiedProficiency: input.verifiedProficiency,
                refreshDays,
              }
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
            ? this.buildAssessmentExplanation(
                input.assessmentResult,
                genuinePass || provisionalSettlement,
              )
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
    const nextMetadata = {
      ...mergeFocusProgressIntoMetadata(
        withoutSkillVerificationPending(input.claim.sourceMetadata),
        input.selected.focus,
        nextFocus,
      ),
      ...(input.verificationSettlement
        ? {
            latestVerificationDecision: {
              decision: input.verificationSettlement.decision,
              confidence: input.verificationSettlement.confidence,
              decidedAt: nowIso,
            },
          }
        : {}),
    };

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
          finalProficiency: input.verifiedProficiency ?? transition.next.proficiency,
          claimConfidence: input.verificationSettlement?.confidence ?? null,
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
          passed: input.technicalFailure ? null : genuinePass || provisionalSettlement,
          explanation,
          marksEarned: input.grade?.marksEarned ?? null,
          marksTotal: input.grade?.marksTotal ?? null,
          scorePercent: input.grade?.scorePercent ?? null,
          assessmentResultJson: withSeT02InterviewAudit(
            input.assessmentResult,
            input.stored,
          ) as never,
        },
      }),
      ...(input.verificationSettlement && (genuinePass || provisionalSettlement)
        ? [
            this.prisma.verificationDecision.create({
              data: {
                claimId: input.claim.id,
                decision: input.verificationSettlement.decision,
                confidence: input.verificationSettlement.confidence,
                assessmentSummary: explanation,
                reasons: input.verificationSettlement.reasons,
              },
            }),
          ]
        : []),
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
      session: null,
    });
  }

  private buildAssessmentExplanation(result: AssessmentResult, passed: boolean): string {
    if (passed && result.highestAssessmentSupportedProficiency) {
      if (result.verificationDecision === 'PROVISIONAL') {
        return `Provisionally verified at ${result.highestAssessmentSupportedProficiency} with ${result.confidence.toLowerCase()} assessment confidence.`;
      }
      return `Competency assessment supports ${result.highestAssessmentSupportedProficiency} with ${result.confidence.toLowerCase()} confidence.`;
    }
    if (!result.highestAssessmentSupportedProficiency) {
      return 'Assessment did not demonstrate the minimum competency bar for this skill.';
    }
    if (result.uncertainties.length > 0) {
      return `Assessment supported ${result.highestAssessmentSupportedProficiency}. Gaps remain in: ${result.uncertainties.join(', ')}.`;
    }
    return `Assessment did not demonstrate a certifiable proficiency level for ${result.targetProficiency === SKILL_VERIFICATION_DISCOVERY_TARGET ? 'this skill' : `target ${result.targetProficiency}`}.`;
  }

  private async gradeStoredItems(
    stored: StoredSession,
    userId: string,
  ): Promise<GradeSdeSkillFormResponse> {
    const responses = stored.items.map((item) => {
      const answer = stored.answers.find((row) => row.index === item.index);
      return {
        index: item.index,
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

  private normalizeSessionItems(
    items: SkillVerifySessionDto['items'],
  ): SkillVerifySessionDto['items'] {
    return items.map((item) =>
      item.format === 'TRACE' ? { ...item, prompt: normalizeTracePrompt(item.prompt) } : item,
    );
  }

  private toDto(stored: StoredSession, pendingCompetencies?: string[]): SkillVerifySessionDto {
    const remaining = Math.max(0, Math.floor((Date.parse(stored.expiresAt) - Date.now()) / 1000));
    const stageLabel = stored.stage === 'DIAGNOSTIC' ? 'Short diagnostic' : undefined;
    return SkillVerifySessionDtoSchema.parse({
      sessionId: stored.sessionId,
      claimId: stored.claimId,
      skillCode: stored.catalogSkillCode,
      proficiency: stored.proficiency,
      timeMinutes: stored.timeMinutes,
      passMarkPercent: stored.passMarkPercent,
      expiresAt: stored.expiresAt,
      serverRemainingSeconds: remaining,
      items: this.normalizeSessionItems(stored.items),
      answers: stored.answers,
      stage: stored.stage,
      intelligenceEnabled: stored.intelligenceEnabled,
      stageLabel,
      pendingCompetencies,
      pendingVerification: Boolean(stored.pendingAssessmentResult),
      verificationStep: stored.verificationStep,
      evidenceContext: stored.evidenceContext,
    });
  }

  private resolveRefreshDays(catalogSkillCode: string): number | undefined {
    const blueprint = getSkillBlueprint(catalogSkillCode);
    return blueprint?.freshnessPolicy?.maxAgeDays;
  }

  private mapClaim(row: {
    id: string;
    studentId: string;
    proficiency: SkillClaimDto['proficiency'];
    status: SkillClaimDto['status'];
    strikes: number;
    lockedUntil: Date | null;
    lastAttemptId: string | null;
    claimConfidence?: { toNumber(): number } | number | null;
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
    const metadata = row.sourceMetadata as
      | {
          latestVerificationDecision?: {
            decision: 'VERIFIED' | 'PROVISIONAL' | 'FAILED';
            confidence: number;
          };
        }
      | null
      | undefined;
    const claimConfidence =
      row.claimConfidence !== null && row.claimConfidence !== undefined
        ? typeof row.claimConfidence === 'number'
          ? row.claimConfidence
          : row.claimConfidence.toNumber()
        : (metadata?.latestVerificationDecision?.confidence ?? null);
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
      retryAvailableAt,
      verificationDecision: metadata?.latestVerificationDecision?.decision ?? null,
      claimConfidence,
      verificationInProgress,
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
