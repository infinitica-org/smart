import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AbandonProjectDefenseResponseSchema,
  CompleteProjectDefenseRequestSchema,
  CompleteProjectDefenseResponseSchema,
  PROJECT_DEFENSE_GRADER_PROMPT_REF,
  PROJECT_DEFENSE_EXAMINER_PROMPT_REF,
  PROJECT_DEFENSE_MAX_DURATION_SECONDS,
  PROJECT_DEFENSE_RUBRIC_WEIGHTS,
  PROJECT_DEFENSE_SESSION_TTL_SECONDS,
  ProjectDefenseAudioUploadRequestSchema,
  ProjectDefenseAudioUploadResponseSchema,
  ProjectDefenseContextSchema,
  ProjectDefenseReplyRequestSchema,
  ProjectDefenseReplyResponseSchema,
  ProjectDefenseSessionDtoSchema,
  ProjectDefenseGradeSchema,
  SMART_TOPICS,
  PrepareProjectDefenseResponseSchema,
  StartProjectDefenseResponseSchema,
  UuidSchema,
  type CompleteProjectDefenseResponse,
  type ProjectDefenseAudioUploadResponse,
  type ProjectDefenseContext,
  type ProjectDefenseReplyResponse,
  type ProjectDefenseSessionDto,
  type PrepareProjectDefenseResponse,
  type StartProjectDefenseResponse,
} from '@smart/contracts';
import {
  ProjectDefenseGradeOutputSchema,
  projectDefenseExaminerTemplate,
  projectDefenseGraderTemplate,
} from '@smart/prompts';
import { computeDefenseScore } from '@smart/scoring-engine';
import { Effect } from 'effect';
import { z } from 'zod';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import { projectDefenseSttMode, SpeechService } from '../speech/speech.service.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import {
  decodeReportMeta,
  snapshotDigest,
  toReportDto,
  type ProjectRow,
} from './project-verify.mapper.js';
import { ProctoringService } from '../proctoring/proctoring.service.js';
import { ProjectInterviewGateService } from './project-interview-gate.service.js';
import { resolveInterviewFinalTurn } from './project-defense-interview-policy.js';
import {
  stubExaminerTurn,
  stubGraderOutput,
  stubOpeningQuestion,
} from './project-defense-dev-stub.js';
import { env } from '../../platform/config/env.js';

const ExaminerTurnSchema = z.object({
  question: z.string().min(10).max(1_000),
  probes: z.enum([
    'SKILLS_APPLICATION',
    'DEPTH',
    'OWNERSHIP',
    'TRADEOFFS',
    'FAILURE_MODES',
    'CLOSING',
  ]),
  isFinalTurn: z.boolean(),
});

type StoredDefenseSession = {
  sessionId: string;
  projectId: string;
  userId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  context: ProjectDefenseContext;
  turns: ProjectDefenseSessionDto['turns'];
  /** Null until proctoring onboarding finishes and the student enters the kiosk. */
  startedAt: string | null;
  maxDurationSeconds: number;
  expiresAt: string;
  candidateTurnsSubmitted: number;
};

function secondsRemainingForSession(session: StoredDefenseSession): number {
  if (!session.startedAt) return session.maxDurationSeconds;
  const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
  return Math.max(0, Math.floor(session.maxDurationSeconds - elapsedMs / 1000));
}

function isInterviewTimeExpired(session: StoredDefenseSession): boolean {
  if (!session.startedAt) return false;
  return secondsRemainingForSession(session) <= 0;
}

function sessionKey(sessionId: string): string {
  return `project:defense:session:${sessionId}`;
}

function activeProjectKey(projectId: string): string {
  return `project:defense:active:${projectId}`;
}

function defenseAudioKeyPrefix(projectId: string): string {
  return `project-defense/${projectId}/`;
}

function assertDefenseAudioKey(projectId: string, audioObjectKey: string): void {
  const prefix = defenseAudioKeyPrefix(projectId);
  if (!audioObjectKey.startsWith(prefix)) {
    throw new BadRequestException({
      error: 'invalid_audio_key',
      message: 'Audio must be uploaded for this project defense session.',
      statusCode: 400,
    });
  }
}

@Injectable()
export class ProjectDefenseService {
  private readonly logger = new Logger(ProjectDefenseService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(AiGatewayService) private readonly gateway: AiGatewayService,
    @Inject(SpeechService) private readonly speech: SpeechService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(ProjectInterviewGateService)
    private readonly interviewGate: ProjectInterviewGateService,
    @Inject(ProctoringService) private readonly proctoring: ProctoringService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
  ) {}

  async prepare(projectId: string, userId: string): Promise<PrepareProjectDefenseResponse> {
    await this.assertInterviewAllowed(projectId, userId);

    const existingSessionId = await this.redis.get(activeProjectKey(projectId));
    if (existingSessionId) {
      const existing = await this.loadSession(existingSessionId);
      if (
        existing &&
        existing.userId === userId &&
        existing.status === 'ACTIVE' &&
        !existing.startedAt
      ) {
        return PrepareProjectDefenseResponseSchema.parse({ sessionId: existing.sessionId });
      }
    }

    await this.clearActiveDefenseSession(projectId, userId);

    const project = await this.loadOwnedProject(projectId, userId);
    const report = this.reportDtoFromProject(project);
    const context = this.buildContext(project, report);
    const sessionId = randomUUID();
    const expiresAt = new Date(
      Date.now() + PROJECT_DEFENSE_SESSION_TTL_SECONDS * 1000,
    ).toISOString();
    const stored: StoredDefenseSession = {
      sessionId,
      projectId,
      userId,
      status: 'ACTIVE',
      context,
      turns: [],
      startedAt: null,
      maxDurationSeconds: PROJECT_DEFENSE_MAX_DURATION_SECONDS,
      expiresAt,
      candidateTurnsSubmitted: 0,
    };

    await this.persistSession(stored);
    await this.redis.set(
      activeProjectKey(projectId),
      sessionId,
      'EX',
      PROJECT_DEFENSE_SESSION_TTL_SECONDS,
    );

    return PrepareProjectDefenseResponseSchema.parse({ sessionId });
  }

  /** Discards the current attempt so the student can start again from scratch. */
  async abandon(projectId: string, userId: string) {
    await this.loadOwnedProject(projectId, userId);
    await this.clearActiveDefenseSession(projectId, userId);
    return AbandonProjectDefenseResponseSchema.parse({ abandoned: true });
  }

  /** Activates the interview clock after proctoring onboarding. */
  async start(projectId: string, userId: string): Promise<StartProjectDefenseResponse> {
    await this.assertInterviewAllowed(projectId, userId);

    const existingSessionId = await this.redis.get(activeProjectKey(projectId));
    let stored: StoredDefenseSession | null = null;
    if (existingSessionId) {
      stored = await this.loadSession(existingSessionId);
      if (!stored) {
        await this.reconcileMissingActiveSession(projectId, existingSessionId);
      }
    }

    if (!stored || stored.status !== 'ACTIVE') {
      if (this.requiresPreparedSession()) {
        throw new BadRequestException({
          error: 'prepare_required',
          message: 'Reserve a defense session with prepare before starting.',
          statusCode: 400,
        });
      }
      stored = await this.createDefenseSession(projectId, userId, new Date().toISOString());
      await this.interviewGate.markInProgress(projectId);
    } else if (!stored.startedAt) {
      await this.proctoring.assertInterviewReady(userId, stored.sessionId);
      stored.startedAt = new Date().toISOString();
      await this.persistSession(stored);
      await this.interviewGate.markInProgress(projectId);
    }

    const prompt = await this.resolvePromptForStart(stored);
    return StartProjectDefenseResponseSchema.parse({
      session: this.toSessionDto(stored),
      openingPromptText: prompt.text,
      openingPromptAudioUrl: prompt.audioUrl,
      sttMode: projectDefenseSttMode(),
    });
  }

  async createAudioUploadUrl(
    projectId: string,
    userId: string,
    body: unknown,
  ): Promise<ProjectDefenseAudioUploadResponse> {
    await this.loadOwnedProject(projectId, userId);
    const request = ProjectDefenseAudioUploadRequestSchema.parse(body);
    const objectKey = `${defenseAudioKeyPrefix(projectId)}${randomUUID()}-${request.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const uploadUrl = await this.storage.getSignedUploadUrl({
      objectKey,
      contentType: request.contentType,
    });
    return ProjectDefenseAudioUploadResponseSchema.parse({
      uploadUrl,
      objectKey,
      expiresInSeconds: 15 * 60,
    });
  }

  async reply(
    projectId: string,
    userId: string,
    body: unknown,
  ): Promise<ProjectDefenseReplyResponse> {
    const request = ProjectDefenseReplyRequestSchema.parse(body);
    const session = await this.loadSession(request.sessionId);
    if (!session || session.projectId !== projectId || session.userId !== userId) {
      await this.reconcileMissingActiveSession(projectId, request.sessionId);
      throw new NotFoundException({
        error: 'session_not_found',
        message: 'Defense session not found.',
        statusCode: 404,
      });
    }
    if (session.status !== 'ACTIVE') {
      throw new BadRequestException({
        error: 'session_inactive',
        message: 'This defense session is no longer active.',
        statusCode: 400,
      });
    }
    if (!session.startedAt) {
      throw new BadRequestException({
        error: 'interview_not_started',
        message: 'Complete proctoring setup before submitting your first answer.',
        statusCode: 400,
      });
    }
    if (isInterviewTimeExpired(session)) {
      throw new BadRequestException({
        error: 'time_limit',
        message: 'Interview time is up. Complete the interview to receive your grade.',
        statusCode: 400,
      });
    }

    await this.proctoring.assertInterviewReady(userId, session.sessionId);

    if (request.audioObjectKey) {
      assertDefenseAudioKey(projectId, request.audioObjectKey);
    }

    const transcript = await this.speech.transcribe({
      audioObjectKey: request.audioObjectKey,
      clientTranscript: request.transcript,
    });

    const now = new Date().toISOString();
    session.turns.push({
      turnIndex: session.turns.length,
      role: 'CANDIDATE',
      text: transcript,
      at: now,
    });
    session.candidateTurnsSubmitted += 1;

    const remaining = secondsRemainingForSession(session);
    let questionText: string | null = null;
    let questionAudioUrl: string | null = null;
    let isFinalTurn = remaining <= 0;

    if (remaining > 0) {
      const turn = await this.runExaminerTurn(session, remaining);
      questionText = turn.question;
      isFinalTurn = resolveInterviewFinalTurn({
        candidateTurnsSubmitted: session.candidateTurnsSubmitted,
        examinerWantsFinal: turn.isFinalTurn,
        secondsRemaining: secondsRemainingForSession(session),
        lastCandidateText: transcript,
      });
      session.turns.push({
        turnIndex: session.turns.length,
        role: 'EXAMINER',
        text: turn.question,
        at: new Date().toISOString(),
      });
      questionAudioUrl = await this.speech.synthesize(turn.question);
    }

    await this.persistSession(session);

    return ProjectDefenseReplyResponseSchema.parse({
      session: this.toSessionDto(session),
      questionText,
      questionAudioUrl,
      isFinalTurn,
    });
  }

  async complete(
    projectId: string,
    userId: string,
    body: unknown,
  ): Promise<CompleteProjectDefenseResponse> {
    const request = CompleteProjectDefenseRequestSchema.parse(body);
    const integrityTerminated = request.integrityTerminated === true;
    const session = await this.loadSession(request.sessionId);
    if (!session || session.projectId !== projectId || session.userId !== userId) {
      await this.reconcileMissingActiveSession(projectId, request.sessionId);
      throw new NotFoundException({
        error: 'session_not_found',
        message: 'Defense session not found.',
        statusCode: 404,
      });
    }
    if (session.status !== 'ACTIVE') {
      throw new BadRequestException({
        error: 'session_inactive',
        message: 'This defense session is already finished.',
        statusCode: 400,
      });
    }
    if (!integrityTerminated && session.candidateTurnsSubmitted < 1) {
      throw new BadRequestException({
        error: 'opening_required',
        message: 'Submit your opening response before completing the interview.',
        statusCode: 400,
      });
    }

    const interview = await this.interviewGate.getState(projectId);
    if (interview.interviewStatus === 'COMPLETED') {
      throw new BadRequestException({
        error: 'interview_completed',
        message: 'You have already completed the ownership interview for this project.',
        statusCode: 400,
      });
    }

    if (integrityTerminated) {
      const locked = await this.proctoring.isProctorLocked(session.sessionId);
      if (!locked) {
        throw new BadRequestException({
          error: 'proctor_not_locked',
          message: 'This session was not locked for integrity violations.',
          statusCode: 400,
        });
      }
    } else {
      await this.proctoring.assertInterviewReady(userId, session.sessionId);
    }

    const grade = integrityTerminated
      ? ProjectDefenseGradeSchema.parse({
          defenseScore: 0,
          ownershipConcern: true,
          ownershipConcernReason: 'Interview terminated due to proctoring integrity violations.',
          dimensions: {
            depthOfUnderstanding: 0,
            ownershipAndOriginality: 0,
            defenseQuality: 0,
          },
          routedToReview: true,
          promptRef: PROJECT_DEFENSE_GRADER_PROMPT_REF,
          auditId: null,
        })
      : await (async () => {
          const { parsed, auditId } = await this.runGrader(session);
          const defenseScore = Effect.runSync(
            computeDefenseScore(parsed.dimensions, PROJECT_DEFENSE_RUBRIC_WEIGHTS),
          );
          const routedToReview = parsed.ownershipConcern || session.context.verifyFlags.length > 0;
          return ProjectDefenseGradeSchema.parse({
            defenseScore,
            ownershipConcern: parsed.ownershipConcern,
            ownershipConcernReason: parsed.ownershipConcernReason,
            dimensions: parsed.dimensions,
            routedToReview,
            promptRef: PROJECT_DEFENSE_GRADER_PROMPT_REF,
            auditId,
          });
        })();

    const projectStatus = grade.routedToReview ? 'UNDER_REVIEW' : 'VERIFIED';

    session.status = 'COMPLETED';
    await this.persistSession(session);
    await this.redis.del(activeProjectKey(projectId));
    await this.interviewGate.markCompleted(projectId);

    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: projectStatus },
    });

    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.projectDefenseCompleted,
      partitionKey: projectId,
      eventType: SMART_TOPICS.projectDefenseCompleted,
      source: 'evaluation',
      data: {
        projectId,
        ownershipConcern: grade.ownershipConcern,
        routedToReview: grade.routedToReview,
        defenseScore: grade.defenseScore,
      },
    });

    this.logger.log(`Project ${projectId} defense completed → ${projectStatus}`);

    return CompleteProjectDefenseResponseSchema.parse({
      projectId,
      projectStatus,
      interviewStatus: 'COMPLETED',
      grade,
    });
  }

  private async resolvePromptForStart(
    session: StoredDefenseSession,
  ): Promise<{ text: string; audioUrl: string | null }> {
    const remaining = secondsRemainingForSession(session);
    const lastExaminer = [...session.turns].reverse().find((turn) => turn.role === 'EXAMINER');
    if (lastExaminer) {
      const audioUrl = await this.speech.synthesize(lastExaminer.text);
      return { text: lastExaminer.text, audioUrl };
    }

    const opening = await this.runOpeningTurn(session, remaining);
    session.turns.push({
      turnIndex: session.turns.length,
      role: 'EXAMINER',
      text: opening.question,
      at: new Date().toISOString(),
    });
    await this.persistSession(session);
    const audioUrl = await this.speech.synthesize(opening.question);
    return { text: opening.question, audioUrl };
  }

  private async clearActiveDefenseSession(projectId: string, userId: string): Promise<void> {
    const existingSessionId = await this.redis.get(activeProjectKey(projectId));
    if (!existingSessionId) return;

    const existing = await this.loadSession(existingSessionId);
    if (!existing || existing.userId !== userId) return;

    await this.redis.del(sessionKey(existingSessionId));
    await this.redis.del(activeProjectKey(projectId));

    const interview = await this.interviewGate.getState(projectId);
    if (interview.interviewStatus === 'IN_PROGRESS') {
      await this.interviewGate.markPending(projectId);
    }
  }

  private async runOpeningTurn(
    session: StoredDefenseSession,
    secondsRemaining: number,
  ): Promise<z.infer<typeof ExaminerTurnSchema>> {
    if (this.gateway.hasCallableProvider()) {
      const examiner = await this.gateway.complete({
        promptRef: PROJECT_DEFENSE_EXAMINER_PROMPT_REF,
        modelRole: projectDefenseExaminerTemplate.modelRole,
        priority: 'P1_REALTIME',
        variables: {
          projectTitle: session.context.projectTitle,
          projectSummary: session.context.projectSummary,
          stack: session.context.stack,
          declaredArtefacts: session.context.declaredArtefacts,
          verifyFlags: session.context.verifyFlags,
          verifyGaps: session.context.verifyGaps,
          snapshotDigest: session.context.snapshotDigest,
          qlixReportDigest: session.context.qlixReportDigest ?? null,
          transcript: [],
          secondsRemaining,
        },
        correlation: { responseId: session.projectId },
        maxOutputTokens: projectDefenseExaminerTemplate.maxOutputTokens,
        temperature: projectDefenseExaminerTemplate.temperature,
      });
      return ExaminerTurnSchema.parse(examiner.output);
    }
    if (!this.shouldUseDefenseStub()) {
      throw new ServiceUnavailableException({
        error: 'ai_unavailable',
        message:
          'AI interview is temporarily unavailable. Configure OPENROUTER_API_KEY or GOOGLE_AI_API_KEY on the server.',
        statusCode: 503,
      });
    }
    this.logger.warn('No AI provider configured — using local project-defense opening stub.');
    return stubOpeningQuestion(session.context);
  }

  private async runExaminerTurn(
    session: StoredDefenseSession,
    secondsRemaining: number,
  ): Promise<z.infer<typeof ExaminerTurnSchema>> {
    if (this.gateway.hasCallableProvider()) {
      const examiner = await this.gateway.complete({
        promptRef: PROJECT_DEFENSE_EXAMINER_PROMPT_REF,
        modelRole: projectDefenseExaminerTemplate.modelRole,
        priority: 'P1_REALTIME',
        variables: {
          projectTitle: session.context.projectTitle,
          projectSummary: session.context.projectSummary,
          stack: session.context.stack,
          declaredArtefacts: session.context.declaredArtefacts,
          verifyFlags: session.context.verifyFlags,
          verifyGaps: session.context.verifyGaps,
          snapshotDigest: session.context.snapshotDigest,
          qlixReportDigest: session.context.qlixReportDigest ?? null,
          transcript: session.turns.map((t) => ({ role: t.role, text: t.text })),
          secondsRemaining,
        },
        correlation: { responseId: session.projectId },
        maxOutputTokens: projectDefenseExaminerTemplate.maxOutputTokens,
        temperature: projectDefenseExaminerTemplate.temperature,
      });
      return ExaminerTurnSchema.parse(examiner.output);
    }
    if (!this.shouldUseDefenseStub()) {
      throw new ServiceUnavailableException({
        error: 'ai_unavailable',
        message:
          'AI interview is temporarily unavailable. Configure OPENROUTER_API_KEY or GOOGLE_AI_API_KEY on the server.',
        statusCode: 503,
      });
    }
    this.logger.warn('No AI provider configured — using local project-defense examiner stub.');
    return stubExaminerTurn(session, secondsRemaining);
  }

  private async runGrader(
    session: StoredDefenseSession,
  ): Promise<{ parsed: z.infer<typeof ProjectDefenseGradeOutputSchema>; auditId: string | null }> {
    if (this.gateway.hasCallableProvider()) {
      const gradeResult = await this.gateway.complete({
        promptRef: PROJECT_DEFENSE_GRADER_PROMPT_REF,
        modelRole: projectDefenseGraderTemplate.modelRole,
        priority: 'P2_ASYNC_EVAL',
        variables: {
          projectTitle: session.context.projectTitle,
          projectSummary: session.context.projectSummary,
          stack: session.context.stack,
          verifyFlags: session.context.verifyFlags,
          qlixReportDigest: session.context.qlixReportDigest ?? null,
          transcript: session.turns.map((t) => ({ role: t.role, text: t.text })),
          weights: PROJECT_DEFENSE_RUBRIC_WEIGHTS,
        },
        correlation: { responseId: session.projectId },
        maxOutputTokens: projectDefenseGraderTemplate.maxOutputTokens,
        temperature: 0,
      });
      return {
        parsed: ProjectDefenseGradeOutputSchema.parse(gradeResult.output),
        auditId: gradeResult.auditId ?? null,
      };
    }
    if (!this.shouldUseDefenseStub()) {
      throw new ServiceUnavailableException({
        error: 'ai_unavailable',
        message:
          'AI grading is temporarily unavailable. Configure OPENROUTER_API_KEY or GOOGLE_AI_API_KEY on the server.',
        statusCode: 503,
      });
    }
    this.logger.warn('No AI provider configured — using local project-defense grader stub.');
    return { parsed: stubGraderOutput(session), auditId: null };
  }

  /** Local/test fallback when no LLM keys are configured; never in production. */
  private shouldUseDefenseStub(): boolean {
    if (this.gateway.hasCallableProvider()) return false;
    if (env.NODE_ENV === 'production') return false;
    return env.NODE_ENV === 'test' || env.NODE_ENV === 'development';
  }

  /** Drop stale active pointer and unblock the student when Redis session TTL expired. */
  private async reconcileMissingActiveSession(projectId: string, sessionId: string): Promise<void> {
    const activeId = await this.redis.get(activeProjectKey(projectId));
    if (activeId !== sessionId) return;

    await this.redis.del(activeProjectKey(projectId));
    const interview = await this.interviewGate.getState(projectId);
    if (interview.interviewStatus === 'IN_PROGRESS') {
      await this.interviewGate.markPending(projectId);
      this.logger.warn(
        `Defense session ${sessionId} missing for project ${projectId}; gate reset to PENDING`,
      );
    }
  }

  /** Production with proctoring must go through prepare → onboarding → start. */
  private requiresPreparedSession(): boolean {
    return env.PROCTORING_FULL && env.NODE_ENV !== 'test';
  }

  private buildContext(
    project: ProjectRow,
    report: ReturnType<typeof toReportDto>,
  ): ProjectDefenseContext {
    const summary = [
      `Problem: ${project.problem}`,
      `Approach: ${project.approach}`,
      `Outcome: ${project.outcome}`,
    ].join('\n');
    const artefacts: string[] = [project.stack];
    if (project.githubUrl) artefacts.push(`GitHub: ${project.githubUrl}`);
    if (project.loomUrl) artefacts.push(`Loom walkthrough linked`);

    const explanationForMeta = project.report?.explanation ?? report.explanation;
    const { meta } = decodeReportMeta(explanationForMeta);
    const repos = meta?.snapshotRepos ?? [];
    const snapshotOk = repos.some((repo) => repo.ok);

    return ProjectDefenseContextSchema.parse({
      projectId: project.id,
      projectTitle: project.title,
      projectSummary: summary.slice(0, 4_000),
      stack: project.stack,
      declaredArtefacts: artefacts,
      verifyFlags: report.flags,
      verifyGaps: [],
      snapshotDigest: snapshotDigest(repos, snapshotOk),
      qlixReportDigest: meta?.qlixReportDigest ?? null,
    });
  }

  private async loadOwnedProject(projectId: string, userId: string): Promise<ProjectRow> {
    const id = UuidSchema.parse(projectId);
    const row = await this.prisma.project.findUnique({
      where: { id },
      include: { report: true },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Project not found.',
        statusCode: 404,
      });
    }
    if (row.studentId !== userId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You can only access your own projects.',
        statusCode: 403,
      });
    }
    return row;
  }

  private reportDtoFromProject(project: ProjectRow): ReturnType<typeof toReportDto> {
    const row = project.report;
    if (!row) {
      throw new BadRequestException({
        error: 'verify_pending',
        message: 'Automated verification must finish before the ownership interview.',
        statusCode: 400,
      });
    }
    return toReportDto(row);
  }

  private async assertInterviewAllowed(projectId: string, userId: string): Promise<void> {
    const project = await this.loadOwnedProject(projectId, userId);
    const interview = await this.interviewGate.getState(projectId);
    if (project.qlixCheckId && !project.report) {
      throw new ConflictException({
        error: 'verification_in_progress',
        message: 'Integrity verification is still running. Try again shortly.',
        statusCode: 409,
      });
    }
    if (!project.report) {
      throw new BadRequestException({
        error: 'verify_pending',
        message: 'Automated verification must finish before the ownership interview.',
        statusCode: 400,
      });
    }
    if (interview.interviewStatus === 'COMPLETED') {
      throw new BadRequestException({
        error: 'interview_completed',
        message: 'You have already completed the ownership interview for this project.',
        statusCode: 400,
      });
    }
    if (!interview.interviewRequired) {
      throw new BadRequestException({
        error: 'interview_not_required',
        message: 'Ownership interview is not required for this project.',
        statusCode: 400,
      });
    }
  }

  private async createDefenseSession(
    projectId: string,
    userId: string,
    startedAt: string,
  ): Promise<StoredDefenseSession> {
    const project = await this.loadOwnedProject(projectId, userId);
    const report = this.reportDtoFromProject(project);
    const context = this.buildContext(project, report);
    const sessionId = randomUUID();
    const expiresAt = new Date(
      Date.now() + PROJECT_DEFENSE_SESSION_TTL_SECONDS * 1000,
    ).toISOString();
    const stored: StoredDefenseSession = {
      sessionId,
      projectId,
      userId,
      status: 'ACTIVE',
      context,
      turns: [],
      startedAt,
      maxDurationSeconds: PROJECT_DEFENSE_MAX_DURATION_SECONDS,
      expiresAt,
      candidateTurnsSubmitted: 0,
    };

    await this.persistSession(stored);
    await this.redis.set(
      activeProjectKey(projectId),
      sessionId,
      'EX',
      PROJECT_DEFENSE_SESSION_TTL_SECONDS,
    );
    return stored;
  }

  private async loadSession(sessionId: string): Promise<StoredDefenseSession | null> {
    const raw = await this.redis.get(sessionKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredDefenseSession;
  }

  private async persistSession(session: StoredDefenseSession): Promise<void> {
    await this.redis.set(
      sessionKey(session.sessionId),
      JSON.stringify(session),
      'EX',
      PROJECT_DEFENSE_SESSION_TTL_SECONDS,
    );
    if (session.status === 'ACTIVE') {
      await this.redis.set(
        activeProjectKey(session.projectId),
        session.sessionId,
        'EX',
        PROJECT_DEFENSE_SESSION_TTL_SECONDS,
      );
    }
  }

  private toSessionDto(session: StoredDefenseSession): ProjectDefenseSessionDto {
    return ProjectDefenseSessionDtoSchema.parse({
      sessionId: session.sessionId,
      projectId: session.projectId,
      status: session.status,
      turns: session.turns,
      startedAt: session.startedAt ?? new Date().toISOString(),
      maxDurationSeconds: session.maxDurationSeconds,
      secondsRemaining: secondsRemainingForSession(session),
      expiresAt: session.expiresAt,
    });
  }
}
