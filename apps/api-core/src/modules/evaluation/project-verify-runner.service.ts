import { Inject, Injectable, Logger } from '@nestjs/common';
import { PROJECT_VERIFY_PROMPT_REF } from '@smart/contracts';
import { env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { GithubApiClient } from '../integrations/github/github-api.client.js';
import { QlixClient } from './qlix-client.js';
import { QlixPollService } from './qlix-poll.service.js';
import { buildProjectGithubSnapshot } from './project-github-snapshot.js';
import { buildQlixSmartContext } from './qlix-smart-context.js';
import { ProjectInterviewGateService } from './project-interview-gate.service.js';
import { encodeReportExplanation, type StoredReportMeta } from './project-verify.mapper.js';
import { EvidenceSyncService } from '../evidence/evidence-sync.service.js';

/**
 * Runs automated project verification when a project is submitted.
 * Submits to QLIX and enqueues polling — interview gate opens after QLIX pass.
 */
@Injectable()
export class ProjectVerifyRunnerService {
  private readonly logger = new Logger(ProjectVerifyRunnerService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(QlixClient) private readonly qlix: QlixClient,
    @Inject(QlixPollService) private readonly pollService: QlixPollService,
    @Inject(GithubApiClient) private readonly github: GithubApiClient,
    @Inject(ProjectInterviewGateService)
    private readonly interviewGate: ProjectInterviewGateService,
    @Inject(EvidenceSyncService) private readonly evidenceSync: EvidenceSyncService,
  ) {}

  async runForProject(projectId: string, studentId: string): Promise<void> {
    const existing = await this.prisma.projectVerificationReport.findUnique({
      where: { projectId },
    });
    if (existing) {
      await this.interviewGate.markVerifyComplete(projectId);
      return;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { skillMappings: true },
    });
    if (!project || project.studentId !== studentId) return;

    if (project.qlixCheckId) {
      this.logger.debug(`Project ${projectId} QLIX poll already in flight`);
      return;
    }

    if (!project.githubUrl) {
      await this.failWithoutGithub(projectId, studentId);
      return;
    }

    const { snapshot, snapshotSha } = await buildProjectGithubSnapshot({
      projectId,
      studentId,
      githubUrl: project.githubUrl,
      github: this.github,
      githubApiToken: env.GITHUB_API_TOKEN,
    });

    if (!snapshotSha) {
      await this.failSnapshotUnavailable(projectId, studentId);
      return;
    }

    await this.pollService.cacheSnapshot(projectId, snapshot);

    const idempotencyKey = `${projectId}:${snapshotSha}`;
    let checkId: string;
    try {
      const smartContext = buildQlixSmartContext({
        projectId: project.id,
        studentId: project.studentId,
        title: project.title,
        problem: project.problem,
        approach: project.approach,
        stack: project.stack,
        outcome: project.outcome,
        loomUrl: project.loomUrl,
        liveUrl: project.liveUrl,
        skillMappings: project.skillMappings,
      });
      const submitted = await this.qlix.submitCheck({
        githubUrl: project.githubUrl,
        title: project.title,
        idempotencyKey,
        smartContext,
      });
      checkId = submitted.checkId;
    } catch (error) {
      this.qlix.logUnavailable(error instanceof Error ? error.message : 'submit failed');
      await this.failQlixUnavailable(projectId, studentId);
      return;
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: { snapshotSha, qlixCheckId: checkId },
    });

    await this.pollService.enqueuePoll({
      projectId,
      studentId,
      checkId,
      startedAtMs: Date.now(),
    });

    this.logger.log(`Project ${projectId} submitted to QLIX check ${checkId}`);
  }

  private async writeReviewReport(
    projectId: string,
    studentId: string,
    meta: StoredReportMeta,
    explanation: string,
  ): Promise<void> {
    await this.prisma.projectVerificationReport.upsert({
      where: { projectId },
      create: {
        projectId,
        score: 0,
        relevanceScore: 0,
        plagiarismFlag: false,
        techAgeFlag: false,
        explanation: encodeReportExplanation(explanation, meta),
        routedToReview: true,
      },
      update: {
        explanation: encodeReportExplanation(explanation, meta),
        routedToReview: true,
      },
    });
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'UNDER_REVIEW' },
    });
    await this.evidenceSync.syncProjectEvidenceRecord(studentId, projectId);
  }

  private async failWithoutGithub(projectId: string, studentId: string): Promise<void> {
    await this.writeReviewReport(
      projectId,
      studentId,
      {
        qualityScore: 0,
        duplicateScore: 0,
        confidence: 0.2,
        flags: ['SNAPSHOT_UNAVAILABLE'],
        promptRef: PROJECT_VERIFY_PROMPT_REF,
        auditId: null,
        exclusionReason: 'VERIFICATION_INCOMPLETE',
        qlixStatus: 'FAILED',
      },
      'GitHub URL is required for automated project verification.',
    );
  }

  private async failSnapshotUnavailable(projectId: string, studentId: string): Promise<void> {
    await this.writeReviewReport(
      projectId,
      studentId,
      {
        qualityScore: 0,
        duplicateScore: 0,
        confidence: 0.2,
        flags: ['SNAPSHOT_UNAVAILABLE'],
        promptRef: PROJECT_VERIFY_PROMPT_REF,
        auditId: null,
        exclusionReason: 'VERIFICATION_INCOMPLETE',
        qlixStatus: 'FAILED',
      },
      'Could not pin a GitHub snapshot for this repository.',
    );
  }

  private async failQlixUnavailable(projectId: string, studentId: string): Promise<void> {
    await this.writeReviewReport(
      projectId,
      studentId,
      {
        qualityScore: 0,
        duplicateScore: 0,
        confidence: 0.2,
        flags: ['LLM_UNAVAILABLE'],
        promptRef: PROJECT_VERIFY_PROMPT_REF,
        auditId: null,
        exclusionReason: 'VERIFICATION_INCOMPLETE',
        qlixStatus: 'FAILED',
      },
      'Automated integrity verification could not be completed.',
    );
  }
}
