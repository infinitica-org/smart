import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CertVerifyPrepareDtoSchema,
  CertVerifySessionDtoSchema,
  CompleteCertVerifyRequestSchema,
  CompleteCertVerifyResponseSchema,
  REDIS_TTL_SECONDS,
  SaveCertVerifyRequestSchema,
  StartCertVerifyRequestSchema,
  SKILL_DEFINITIONS,
  skillsClaimedSnapshotWhenVerified,
  type CertVerifyPrepareDto,
  type CertVerifySessionDto,
  type CompleteCertVerifyResponse,
  type PolymorphicAssessmentSessionDto,
} from '@smart/contracts';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { publishCredentialVerified } from '../candidate-certificates/verification/credential-verified-publisher.js';
import { EvaluationService } from '../evaluation/evaluation.service.js';
import {
  applyCertAssessmentTransition,
  certRetryAvailableAt,
  type CertAssessmentEvent,
} from './cert-assessment-state-machine.js';
import { buildCertificationPolymorphicSession } from './polymorphic-assessment-session.mapper.js';
import type {
  CandidateCertificate,
  CandidateCertificateSkill,
} from '../../generated/prisma/index.js';

function certVerifyRedisKey(sessionId: string): string {
  return `session:cert-verify:${sessionId}`;
}

type StoredAnswer = { index: number; selectedKey?: string; text?: string };

type StoredCertSession = {
  sessionId: string;
  userId: string;
  certificateId: string;
  title: string;
  issuer: string;
  scoringToken: string;
  items: CertVerifySessionDto['items'];
  timeMinutes: number;
  passMarkPercent: number;
  expiresAt: string;
  answers: StoredAnswer[];
};

type CertificateRow = CandidateCertificate & { skills: CandidateCertificateSkill[] };

const SKILL_NAME_BY_CODE = new Map(SKILL_DEFINITIONS.map((skill) => [skill.code, skill.name]));

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
export class CertVerificationAssessmentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(EvaluationService) private readonly evaluation: EvaluationService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
  ) {}

  async start(
    user: RequestUser,
    certificateId: string,
    body?: unknown,
  ): Promise<CertVerifySessionDto | CertVerifyPrepareDto> {
    this.assertStudent(user);
    const request = StartCertVerifyRequestSchema.parse(body ?? {});
    if (request.prepareOnly === true) {
      return this.prepare(user, certificateId);
    }
    return this.generate(user, certificateId, request.sessionId);
  }

  private async assertStartAllowed(userId: string, certificateId: string) {
    const cert = await this.loadOwnedOrThrow(userId, certificateId);
    if (cert.sourceStatus !== 'source_verified') {
      throw new ForbiddenException({
        error: 'source_not_verified',
        message: 'Certificate source must be verified before the assessment.',
        statusCode: 403,
      });
    }
    if (!cert.trackCode || cert.agendaLines.length === 0) {
      throw new BadRequestException({
        error: 'agenda_missing',
        message: 'Submit a track and agenda before starting the assessment.',
        statusCode: 400,
      });
    }

    const snapshot = this.toAssessmentSnapshot(cert);
    const startResult = applyCertAssessmentTransition({
      snapshot,
      event: { type: 'START' },
      now: new Date(),
      sourceVerified: cert.sourceStatus === 'source_verified',
    });
    if (!startResult.accepted) {
      throw new ForbiddenException({
        error: 'cert_assessment_blocked',
        message: `Cannot start certificate assessment: ${String(startResult.blockReason)}.`,
        statusCode: 403,
        blockReason: startResult.blockReason,
      });
    }
    return cert;
  }

  private async prepare(user: RequestUser, certificateId: string): Promise<CertVerifyPrepareDto> {
    await this.assertStartAllowed(user.sub, certificateId);
    const sessionId = randomUUID();
    const expiresAt = new Date(
      Date.now() + REDIS_TTL_SECONDS.assessmentSession * 1000,
    ).toISOString();
    const stored: StoredCertSession = {
      sessionId,
      userId: user.sub,
      certificateId,
      title: '',
      issuer: '',
      scoringToken: '',
      items: [],
      timeMinutes: 1,
      passMarkPercent: 80,
      expiresAt,
      answers: [],
    };
    await this.redis.setex(
      certVerifyRedisKey(sessionId),
      ttlSeconds(expiresAt),
      JSON.stringify(stored),
    );
    return CertVerifyPrepareDtoSchema.parse({
      sessionId,
      certificateId,
      expiresAt,
    });
  }

  private async generate(
    user: RequestUser,
    certificateId: string,
    sessionId?: string,
  ): Promise<CertVerifySessionDto> {
    const cert = await this.assertStartAllowed(user.sub, certificateId);

    let stored: StoredCertSession | null = null;
    if (sessionId) {
      stored = await this.loadSession(user.sub, sessionId);
      if (stored.certificateId !== cert.id) {
        throw new BadRequestException({
          error: 'session_certificate_mismatch',
          message: 'Prepared session does not match this certificate.',
          statusCode: 400,
        });
      }
      if (stored.items.length > 0) {
        this.assertNotExpired(stored);
        return this.toDto(stored);
      }
    }

    const paper = await this.evaluation.generateCertAgendaVerifyPaper(
      {
        trackCode: cert.trackCode,
        agendaLines: cert.agendaLines,
      },
      user.sub,
      cert.id,
    );

    const nextId = stored?.sessionId ?? randomUUID();
    const expiresAt = new Date(Date.now() + paper.timeMinutes * 60_000).toISOString();
    const next: StoredCertSession = {
      sessionId: nextId,
      userId: user.sub,
      certificateId: cert.id,
      title: cert.title,
      issuer: cert.issuer,
      scoringToken: paper.scoringToken,
      items: paper.items,
      timeMinutes: paper.timeMinutes,
      passMarkPercent: paper.passMarkPercent,
      expiresAt,
      answers: stored?.answers ?? [],
    };

    await this.prisma.candidateCertificate.update({
      where: { id: cert.id },
      data: {
        taxonomyVersionSnapshot: paper.taxonomyVersionSnapshot,
        status: 'IN_VERIFICATION',
      },
    });

    await this.redis.setex(certVerifyRedisKey(nextId), ttlSeconds(expiresAt), JSON.stringify(next));
    return this.toDto(next);
  }

  async getSession(user: RequestUser, sessionId: string): Promise<CertVerifySessionDto> {
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
    const cert = await this.loadOwnedOrThrow(user.sub, stored.certificateId);
    const retryAvailableAt = certRetryAvailableAt(this.toAssessmentSnapshot(cert));

    return buildCertificationPolymorphicSession({
      sessionId: stored.sessionId,
      certificateId: stored.certificateId,
      status: cert.status,
      hasActiveSession: true,
      retryAvailableAt,
      lockedUntil: cert.assessmentLockedUntil,
      expiresAt: stored.expiresAt,
      serverRemainingSeconds: ttlSeconds(stored.expiresAt),
    });
  }

  async save(user: RequestUser, sessionId: string, body: unknown): Promise<CertVerifySessionDto> {
    this.assertStudent(user);
    const request = SaveCertVerifyRequestSchema.parse(body);
    const stored = await this.loadSession(user.sub, sessionId);
    this.assertNotExpired(stored);
    stored.answers = this.mergeAnswers(stored.answers, request.responses);
    await this.redis.setex(
      certVerifyRedisKey(sessionId),
      ttlSeconds(stored.expiresAt),
      JSON.stringify(stored),
    );
    return this.toDto(stored);
  }

  async complete(
    user: RequestUser,
    sessionId: string,
    body: unknown,
  ): Promise<CompleteCertVerifyResponse> {
    this.assertStudent(user);
    const request = CompleteCertVerifyRequestSchema.parse(body ?? {});
    const stored = await this.loadSession(user.sub, sessionId);
    if (request.responses?.length) {
      stored.answers = this.mergeAnswers(stored.answers, request.responses);
    }

    const cert = await this.loadOwnedOrThrow(user.sub, stored.certificateId);
    const snapshot = this.toAssessmentSnapshot(cert);

    const integrityTerminated =
      request.integrityTerminated === true ||
      (await this.redis.exists(`proctor:lock:${sessionId}`)) === 1;
    const technicalFailure = request.technicalFailure === true && !integrityTerminated;
    let grade: CompleteCertVerifyResponse['grade'] = null;
    let genuinePass = false;

    if (!technicalFailure && !integrityTerminated) {
      this.assertNotExpired(stored);
      grade = await this.evaluation.gradeCertAgendaPaper(
        {
          certificateId: stored.certificateId,
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

    const event: CertAssessmentEvent = integrityTerminated
      ? { type: 'GENUINE_FAIL' }
      : technicalFailure
        ? { type: 'TECHNICAL_FAILURE' }
        : genuinePass
          ? { type: 'GENUINE_PASS' }
          : { type: 'GENUINE_FAIL' };

    const transition = applyCertAssessmentTransition({
      snapshot,
      event,
      now: new Date(),
      sourceVerified: cert.sourceStatus === 'source_verified',
    });
    if (!transition.accepted) {
      throw new ForbiddenException({
        error: 'cert_assessment_blocked',
        message: `Cannot settle certificate assessment: ${String(transition.blockReason)}.`,
        statusCode: 403,
        blockReason: transition.blockReason,
      });
    }

    const explanation =
      request.explanation ??
      (integrityTerminated
        ? 'Proctoring warning limit reached; attempt recorded as a fail.'
        : technicalFailure
          ? 'Technical failure recorded; certificate status unchanged.'
          : genuinePass
            ? 'Agenda-based assessment cleared the pass bar.'
            : 'Agenda-based assessment did not clear the pass bar.');

    const nextStatus = transition.becomesVerified
      ? 'VERIFIED'
      : transition.next.rejected
        ? 'REJECTED'
        : cert.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.candidateCertificate.update({
        where: { id: cert.id },
        data: {
          status: nextStatus,
          assessmentStrikes: transition.next.strikes,
          assessmentLockedUntil: transition.next.lockedUntil,
          lastGenuineFailureAt: transition.next.lastGenuineFailureAt,
          verificationMethod: transition.becomesVerified ? 'ASSESSMENT' : cert.verificationMethod,
        },
        include: { skills: true },
      });
      await tx.candidateCertificateVerificationAttempt.create({
        data: {
          candidateCertificateId: cert.id,
          technicalFailure,
          passed: technicalFailure ? null : genuinePass,
          explanation,
          marksEarned: grade?.marksEarned ?? null,
          marksTotal: grade?.marksTotal ?? null,
          scorePercent: grade?.scorePercent ?? null,
        },
      });
      await tx.certificateVerificationEvent.create({
        data: {
          candidateCertificateId: cert.id,
          status: nextStatus,
          message: explanation,
        },
      });
      return row;
    });

    await this.redis.del(certVerifyRedisKey(sessionId));

    if (transition.becomesVerified) {
      await publishCredentialVerified(this.outbox, 'assessment', {
        userId: user.sub,
        sourceId: 'EXTERNALCERT',
        entityId: updated.id,
      });
    }

    return CompleteCertVerifyResponseSchema.parse({
      certificate: await this.toCertificateDto(updated),
      technicalFailure,
      grade,
    });
  }

  private assertStudent(user: RequestUser): void {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Student role required for certificate assessment.',
        statusCode: 403,
      });
    }
  }

  private async loadOwnedOrThrow(
    candidateId: string,
    certificateId: string,
  ): Promise<CertificateRow> {
    const row = await this.prisma.candidateCertificate.findUnique({
      where: { id: certificateId },
      include: { skills: true },
    });
    if (!row || row.candidateId !== candidateId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Certificate not found.',
        statusCode: 404,
      });
    }
    return row;
  }

  private async loadSession(userId: string, sessionId: string): Promise<StoredCertSession> {
    const raw = await this.redis.get(certVerifyRedisKey(sessionId));
    if (!raw) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Certificate verification session not found.',
        statusCode: 404,
      });
    }
    const stored = JSON.parse(raw) as StoredCertSession;
    if (stored.userId !== userId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You cannot access another candidate’s verification session.',
        statusCode: 403,
      });
    }
    return stored;
  }

  private assertNotExpired(stored: StoredCertSession): void {
    if (Date.parse(stored.expiresAt) <= Date.now()) {
      throw new ForbiddenException({
        error: 'session_expired',
        message: 'Certificate assessment time has ended.',
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

  private toDto(stored: StoredCertSession): CertVerifySessionDto {
    const remaining = Math.max(0, Math.floor((Date.parse(stored.expiresAt) - Date.now()) / 1000));
    return CertVerifySessionDtoSchema.parse({
      sessionId: stored.sessionId,
      certificateId: stored.certificateId,
      title: stored.title,
      issuer: stored.issuer,
      timeMinutes: stored.timeMinutes,
      passMarkPercent: stored.passMarkPercent,
      expiresAt: stored.expiresAt,
      serverRemainingSeconds: remaining,
      items: stored.items,
      answers: stored.answers,
    });
  }

  private toAssessmentSnapshot(cert: CertificateRow) {
    return {
      strikes: cert.assessmentStrikes,
      lockedUntil: cert.assessmentLockedUntil,
      lastGenuineFailureAt: cert.lastGenuineFailureAt,
      verified: cert.status === 'VERIFIED',
      rejected: cert.status === 'REJECTED',
    };
  }

  private async toCertificateDto(row: CertificateRow) {
    const retryAvailableAt = certRetryAvailableAt(this.toAssessmentSnapshot(row));
    return {
      certificateId: row.id,
      candidateId: row.candidateId,
      title: row.title,
      issuer: row.issuer,
      status: row.status,
      sourceStatus: row.sourceStatus,
      certificateNumber: row.certificateNumber,
      verificationUrl: row.verificationUrl,
      verificationMethod: row.verificationMethod,
      certificateFileUrl: row.certificateFileUrl
        ? await this.storage.getSignedDownloadUrl(row.certificateFileUrl)
        : null,
      certificateFileName: row.certificateFileName,
      fileMimeType: row.fileMimeType,
      fileSizeBytes: row.fileSizeBytes,
      learningDescription: row.learningDescription,
      tools: row.tools,
      practicalApplied: row.practicalApplied,
      practicalDescription: row.practicalDescription,
      skills: row.skills.map((skill) => ({
        skillCode: skill.skillCode,
        skillName: SKILL_NAME_BY_CODE.get(skill.skillCode) ?? skill.skillCode,
        selfAssessedProficiency: skill.selfAssessedProficiency,
      })),
      skillsClaimedSnapshot: skillsClaimedSnapshotWhenVerified(
        row.status,
        row.skills.map((skill) => skill.skillCode),
      ),
      trackCode: row.trackCode,
      agendaLines: row.agendaLines,
      expiryDate: row.expiryDate ?? null,
      retryAvailableAt: retryAvailableAt?.toISOString() ?? null,
      lockedUntil: row.assessmentLockedUntil?.toISOString() ?? null,
      taxonomyVersionSnapshot: row.taxonomyVersionSnapshot,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
