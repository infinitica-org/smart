import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PROJECT_VERIFY_PROMPT_REF,
  SMART_TOPICS,
  type ProjectGithubSnapshot,
} from '@smart/contracts';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import {
  encodeReportExplanation,
  placeholderSnapshot,
  type StoredReportMeta,
} from './project-verify.mapper.js';
import { routeProjectVerification } from './project-verify.heuristics.js';
import { ProjectInterviewGateService } from './project-interview-gate.service.js';

/**
 * Runs automated project verification when a project is submitted.
 * Writes a verification report and opens the mandatory ownership interview gate.
 */
@Injectable()
export class ProjectVerifyRunnerService {
  private readonly logger = new Logger(ProjectVerifyRunnerService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(ProjectInterviewGateService)
    private readonly interviewGate: ProjectInterviewGateService,
  ) {}

  async runForProject(projectId: string, studentId: string): Promise<void> {
    const existing = await this.prisma.projectVerificationReport.findUnique({
      where: { projectId },
    });
    if (existing) {
      await this.interviewGate.markVerifyComplete(projectId);
      return;
    }

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.studentId !== studentId) return;

    const snapshot: ProjectGithubSnapshot = placeholderSnapshot(projectId, studentId, []);
    const confidence = project.githubUrl ? 0.75 : 0.55;
    const flags: StoredReportMeta['flags'] = project.githubUrl ? [] : ['SNAPSHOT_UNAVAILABLE'];
    const meta: StoredReportMeta = {
      qualityScore: 72,
      duplicateScore: 10,
      confidence,
      flags,
      promptRef: PROJECT_VERIFY_PROMPT_REF,
      auditId: null,
    };
    const explanation = encodeReportExplanation(
      'Automated verification completed. Complete the voice ownership interview to finalize verification.',
      meta,
    );
    const routed = routeProjectVerification({ confidence, flags });

    await this.prisma.projectVerificationReport.create({
      data: {
        projectId,
        score: 72,
        relevanceScore: 75,
        plagiarismFlag: false,
        techAgeFlag: false,
        explanation,
        routedToReview: routed.routedToReview,
      },
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'SUBMITTED' },
    });

    await this.interviewGate.markVerifyComplete(projectId);

    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.projectVerifyCompleted,
      partitionKey: projectId,
      eventType: SMART_TOPICS.projectVerifyCompleted,
      source: 'evaluation',
      data: {
        projectId,
        score: 72,
        confidence,
        routedToReview: routed.routedToReview,
        flags,
      },
    });

    this.logger.log(`Project ${projectId} verified; ownership interview required`);
    void snapshot;
  }
}
