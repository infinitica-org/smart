import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/index.js';
import {
  PROJECT_VERIFY_PROMPT_REF,
  SMART_TOPICS,
  type ProjectGithubSnapshot,
} from '@smart/contracts';
import type { Queue } from 'bullmq';
import { env } from '../../platform/config/env.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { QLIX_POLL_QUEUE } from '../../platform/queue/queue.names.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { QlixClient, type QlixCheckResult } from './qlix-client.js';
import { ProjectInterviewGateService } from './project-interview-gate.service.js';
import { routeQlixResult } from './project-verify.heuristics.js';
import {
  decodeReportMeta,
  encodeReportExplanation,
  type StoredReportMeta,
} from './project-verify.mapper.js';
import { EvidenceSyncService } from '../evidence/evidence-sync.service.js';

export interface QlixPollJobPayload {
  projectId: string;
  studentId: string;
  checkId: string;
  startedAtMs: number;
}

function snapshotKey(projectId: string): string {
  return `project:github-snapshot:${projectId}`;
}

@Injectable()
export class QlixPollService {
  private readonly logger = new Logger(QlixPollService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(QlixClient) private readonly qlix: QlixClient,
    @Inject(ProjectInterviewGateService)
    private readonly interviewGate: ProjectInterviewGateService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(RedisService) private readonly redis: RedisService,
    @InjectQueue(QLIX_POLL_QUEUE) private readonly pollQueue: Queue<QlixPollJobPayload>,
    @Inject(EvidenceSyncService) private readonly evidenceSync: EvidenceSyncService,
  ) {}

  async cacheSnapshot(projectId: string, snapshot: ProjectGithubSnapshot): Promise<void> {
    await this.redis.set(snapshotKey(projectId), JSON.stringify(snapshot), 'EX', 60 * 60 * 24 * 7);
  }

  async enqueuePoll(payload: QlixPollJobPayload): Promise<void> {
    await this.pollQueue.add('poll', payload, {
      delay: env.QLIX_POLL_INTERVAL_MS,
      jobId: `qlix-poll-${payload.projectId}`,
      removeOnComplete: true,
    });
  }

  async handlePoll(payload: QlixPollJobPayload): Promise<void> {
    const existing = await this.prisma.projectVerificationReport.findUnique({
      where: { projectId: payload.projectId },
    });
    if (existing) {
      if (existing.explanation) {
        const { meta } = decodeReportMeta(existing.explanation);
        if (meta?.qlixStatus === 'COMPLETED' || meta?.qlixStatus === 'TIMEOUT') {
          return;
        }
      }
      await this.prisma.projectVerificationReport.delete({
        where: { projectId: payload.projectId },
      });
    }

    const elapsed = Date.now() - payload.startedAtMs;
    if (elapsed >= env.QLIX_POLL_HARD_CAP_MS) {
      await this.finalizeTimeout(payload);
      return;
    }

    let result;
    try {
      result = await this.qlix.getCheck(payload.checkId);
    } catch (error) {
      this.qlix.logUnavailable(error instanceof Error ? error.message : 'poll failed');
      await this.requeue(payload);
      return;
    }

    if (!this.qlix.isTerminal(result)) {
      await this.requeue(payload);
      return;
    }

    if (!this.qlix.isPublishable(result) && result.status !== 'failed') {
      await this.requeue(payload);
      return;
    }

    await this.finalizeCheck(payload, result);
  }

  private async requeue(payload: QlixPollJobPayload): Promise<void> {
    await this.pollQueue.add('poll', payload, {
      delay: env.QLIX_POLL_INTERVAL_MS,
      jobId: `qlix-poll-${payload.projectId}-${Date.now()}`,
      removeOnComplete: true,
    });
  }

  private async finalizeTimeout(payload: QlixPollJobPayload): Promise<void> {
    await this.finalizeCheck(
      payload,
      {
        checkId: payload.checkId,
        status: 'failed',
        similarityIndex: null,
        aiLikelihood: null,
      },
      true,
    );
  }

  private async finalizeCheck(
    payload: QlixPollJobPayload,
    result: QlixCheckResult,
    timedOut = false,
  ): Promise<void> {
    let skills = null;
    if (result.status === 'completed' && !timedOut) {
      try {
        skills = await this.qlix.getSkills(result.checkId);
      } catch (error) {
        this.qlix.logUnavailable(error instanceof Error ? error.message : 'skills fetch failed');
      }
    }

    const analyzedTokens = skills?.totals?.analyzedTokens ?? 0;
    const similarity = result.similarityIndex ?? 0;
    const aiLikelihood = result.aiLikelihood ?? null;
    const smart = result.smartAssessment ?? null;
    const routed = routeQlixResult({
      similarityIndex: similarity,
      aiLikelihood,
      analyzedTokens,
      failed: result.status === 'failed',
      timedOut,
      thresholds: {
        similarityHardFail: env.QLIX_SIMILARITY_HARD_FAIL,
        similarityBorderline: env.QLIX_SIMILARITY_BORDERLINE,
        aiLikelihoodFlag: env.QLIX_AI_LIKELIHOOD_FLAG,
      },
    });

    const snapshotRaw = await this.redis.get(snapshotKey(payload.projectId));
    let snapshotRepos: StoredReportMeta['snapshotRepos'];
    if (snapshotRaw) {
      try {
        const parsed = JSON.parse(snapshotRaw) as ProjectGithubSnapshot;
        snapshotRepos = parsed.repos;
      } catch {
        snapshotRepos = undefined;
      }
    }

    const qlixReportDigest = this.qlix.buildDigest(result);
    const skillsJson = skills
      ? (JSON.parse(JSON.stringify(skills)) as Prisma.InputJsonValue)
      : undefined;
    const smartAssessmentJson = smart
      ? (JSON.parse(JSON.stringify(smart)) as Prisma.InputJsonValue)
      : undefined;

    await this.prisma.qlixCheckResult.upsert({
      where: { projectId: payload.projectId },
      create: {
        projectId: payload.projectId,
        checkId: result.checkId,
        status: result.status,
        similarityIndex: result.similarityIndex ?? null,
        similarityExcludingCited: result.similarityExcludingCited ?? null,
        confidence: result.confidence ?? null,
        aiLikelihood: result.aiLikelihood ?? null,
        suspicionLevel: result.agentReview?.verdict?.suspicionLevel ?? null,
        agentSummary: result.agentReview?.verdict?.summary ?? null,
        skillsJson,
        smartAssessmentJson,
        appliedProficiencyCeiling: smart?.appliedProficiencyCeiling ?? null,
        qualityScore: smart?.qualityScore ?? null,
        authenticityScore: smart?.authenticityScore ?? null,
        relevanceScore: smart?.relevanceScore ?? null,
        gaps: smart?.gaps ?? [],
        analyzedTokens: analyzedTokens > 0 ? analyzedTokens : null,
      },
      update: {
        checkId: result.checkId,
        status: result.status,
        similarityIndex: result.similarityIndex ?? null,
        similarityExcludingCited: result.similarityExcludingCited ?? null,
        confidence: result.confidence ?? null,
        aiLikelihood: result.aiLikelihood ?? null,
        suspicionLevel: result.agentReview?.verdict?.suspicionLevel ?? null,
        agentSummary: result.agentReview?.verdict?.summary ?? null,
        skillsJson,
        smartAssessmentJson,
        appliedProficiencyCeiling: smart?.appliedProficiencyCeiling ?? null,
        qualityScore: smart?.qualityScore ?? null,
        authenticityScore: smart?.authenticityScore ?? null,
        relevanceScore: smart?.relevanceScore ?? null,
        gaps: smart?.gaps ?? [],
        analyzedTokens: analyzedTokens > 0 ? analyzedTokens : null,
      },
    });

    const duplicateScore = similarity;
    const qualityScore = Math.max(0, 100 - similarity);
    const confidence = routed.opensInterviewGate ? 0.85 : 0.45;
    const meta: StoredReportMeta = {
      qualityScore,
      duplicateScore,
      confidence,
      flags: routed.flags,
      promptRef: PROJECT_VERIFY_PROMPT_REF,
      auditId: null,
      qlixStatus: timedOut ? 'TIMEOUT' : result.status === 'failed' ? 'FAILED' : 'COMPLETED',
      qlixDigest: {
        similarityIndex: similarity,
        aiLikelihood,
        agentSummary: result.agentReview?.verdict?.summary ?? '',
        analyzedTokens,
      },
      qlixReportDigest,
      snapshotRepos,
      exclusionReason: routed.exclusionReason ?? undefined,
      reverifyCount: 0,
    };

    const explanation = encodeReportExplanation(
      routed.opensInterviewGate
        ? routed.routedToReview
          ? 'Integrity checks flagged concerns. Complete the voice ownership interview; final verification may require human review.'
          : 'Integrity verification completed. Complete the voice ownership interview to finalize verification.'
        : 'Automated verification could not be completed. Re-submit or contact support if this persists.',
      meta,
    );

    const score = Math.round((qualityScore * 0.4 + (100 - duplicateScore) * 0.6) * 100) / 100;

    await this.prisma.projectVerificationReport.create({
      data: {
        projectId: payload.projectId,
        score,
        relevanceScore: qualityScore,
        plagiarismFlag: similarity > env.QLIX_SIMILARITY_BORDERLINE,
        techAgeFlag: false,
        explanation,
        routedToReview: routed.routedToReview,
      },
    });

    await this.prisma.project.update({
      where: { id: payload.projectId },
      data: { status: routed.routedToReview ? 'UNDER_REVIEW' : 'SUBMITTED' },
    });

    await this.evidenceSync.syncProjectEvidenceRecord(payload.studentId, payload.projectId);

    if (routed.opensInterviewGate) {
      await this.interviewGate.markVerifyComplete(payload.projectId);
    }

    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.projectVerifyCompleted,
      partitionKey: payload.projectId,
      eventType: SMART_TOPICS.projectVerifyCompleted,
      source: 'evaluation',
      data: {
        projectId: payload.projectId,
        score,
        confidence,
        routedToReview: routed.routedToReview,
        flags: routed.flags,
      },
    });

    this.logger.log(
      `QLIX poll finished for ${payload.projectId}: interview=${routed.opensInterviewGate} review=${routed.routedToReview}`,
    );
  }
}
