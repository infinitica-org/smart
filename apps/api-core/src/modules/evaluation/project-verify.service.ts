import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CreateProjectRequestSchema,
  GithubConnectionStatusDtoSchema,
  GithubRepoListDtoSchema,
  PROJECT_VERIFY_PROMPT_REF,
  ProjectGithubSnapshotSchema,
  ProjectVerifyCompletedDataSchema,
  ProjectVerifyLlmOutputSchema,
  ResolveProjectReviewRequestSchema,
  SMART_TOPICS,
  type ProjectDto,
  type ProjectGithubSnapshot,
  type ProjectReviewQueueItemDto,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import {
  collectFlags,
  compositeProjectScore,
  duplicateScore,
  routeProjectVerification,
  stackLanguageMismatch,
  techAgeFlag,
} from './project-verify.heuristics.js';
import {
  publicSimilarityDigest,
  searchPublicProjectMatches,
} from './project-verify.web-similarity.js';
import {
  encodeReportExplanation,
  placeholderSnapshot,
  snapshotDigest,
  toProjectDto,
  toQueueItem,
  type StoredReportMeta,
} from './project-verify.mapper.js';

@Injectable()
export class ProjectVerifyService {
  private readonly logger = new Logger(ProjectVerifyService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AiGatewayService) private readonly gateway: AiGatewayService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  githubStatus() {
    return GithubConnectionStatusDtoSchema.parse({
      connected: false,
      githubLogin: null,
      scopes: [],
    });
  }

  githubRepos() {
    return GithubRepoListDtoSchema.parse({ connected: false, repos: [] });
  }

  async createProject(studentId: string, body: unknown): Promise<ProjectDto> {
    const request = CreateProjectRequestSchema.parse(body);
    const row = await this.prisma.project.create({
      data: {
        studentId,
        title: request.title,
        problem: request.problem,
        approach: request.approach,
        stack: request.stack,
        outcome: request.outcome,
        loomUrl: request.loomUrl,
        githubUrl: request.githubRepos[0]?.htmlUrl ?? null,
        status: 'SUBMITTED',
      },
      include: { report: true },
    });
    void this.verifyProject(
      row.id,
      placeholderSnapshot(row.id, studentId, request.githubRepos),
    ).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Project verify failed closed to review: ${message}`);
    });
    return toProjectDto(row);
  }

  async getProject(projectId: string, studentId: string): Promise<ProjectDto> {
    const row = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { report: true },
    });
    if (!row) throw new NotFoundException({ error: 'not_found', message: 'Project not found.' });
    if (row.studentId !== studentId) {
      throw new ForbiddenException({ error: 'forbidden', message: 'Not your project.' });
    }
    return toProjectDto(row);
  }

  async verifyProject(
    projectId: string,
    snapshotInput?: ProjectGithubSnapshot,
  ): Promise<ProjectDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { report: true },
    });
    if (!project)
      throw new NotFoundException({ error: 'not_found', message: 'Project not found.' });

    const snapshot = snapshotInput
      ? ProjectGithubSnapshotSchema.parse(snapshotInput)
      : placeholderSnapshot(project.id, project.studentId, []);

    const priors = await this.prisma.project.findMany({
      where: { studentId: project.studentId, id: { not: project.id } },
      select: { problem: true, approach: true, outcome: true },
    });
    const currentText = `${project.problem} ${project.approach} ${project.outcome} ${snapshot.repos.map((r) => r.readmeMarkdown).join(' ')}`;
    const dup = duplicateScore(
      currentText,
      priors.map((row) => `${row.problem} ${row.approach} ${row.outcome}`),
    );
    const repos = snapshot.repos;
    const snapshotOk = repos.length > 0 && repos.every((repo) => repo.ok);
    const web = await searchPublicProjectMatches({
      title: project.title,
      stack: project.stack,
      currentText,
      excludeFullNames: repos.map((repo) => `${repo.owner}/${repo.name}`),
      cache: this.redis,
    });
    const combinedDup = Math.max(dup, web.score);
    const digest = `${snapshotDigest(repos, snapshotOk)}\n${publicSimilarityDigest(web)}`;

    let llmFailed = false;
    let relevanceScore = 0;
    let qualityScore = 0;
    let confidence = 0;
    let explanation =
      'Verification agent unavailable. Routed to human review instead of auto-rejecting.';
    let auditId: string | null = null;

    try {
      const result = await this.gateway.complete({
        promptRef: PROJECT_VERIFY_PROMPT_REF,
        modelRole: 'PRIMARY_REASONING',
        priority: 'P2_ASYNC_EVAL',
        variables: {
          title: project.title,
          problem: project.problem,
          approach: project.approach,
          stack: project.stack,
          outcome: project.outcome,
          snapshotDigest: digest,
        },
        correlation: {},
        maxOutputTokens: 1_200,
        temperature: 0,
      });
      const parsed = ProjectVerifyLlmOutputSchema.parse(result.output);
      relevanceScore = parsed.relevanceScore;
      qualityScore = parsed.qualityScore;
      confidence = snapshotOk ? parsed.confidence : Math.min(parsed.confidence, 0.4);
      if (!web.ok) confidence = Math.min(confidence, 0.4);
      explanation = parsed.explanation;
      auditId = result.auditId ?? null;
    } catch (err) {
      llmFailed = true;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`project-verify LLM failed closed: ${message}`);
    }

    const flags = collectFlags({
      duplicate: dup,
      publicWeb: web.score,
      techAge: techAgeFlag(repos, new Date()),
      stackMismatch: stackLanguageMismatch(project.stack, repos),
      snapshotOk,
      llmFailed,
      confidence,
      webSearchFailed: !web.ok,
    });
    const score = compositeProjectScore({
      relevanceScore,
      qualityScore,
      duplicateScore: combinedDup,
    });
    const routing = routeProjectVerification({ confidence, flags });
    const meta: StoredReportMeta = {
      qualityScore,
      duplicateScore: combinedDup,
      confidence,
      flags,
      promptRef: PROJECT_VERIFY_PROMPT_REF,
      auditId,
    };

    await this.prisma.projectVerificationReport.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        score,
        plagiarismFlag: flags.includes('DUPLICATE_TEXT') || flags.includes('PUBLIC_WEB_SIMILARITY'),
        techAgeFlag: flags.includes('TECH_AGE'),
        relevanceScore,
        explanation: encodeReportExplanation(explanation, meta),
        routedToReview: routing.routedToReview,
      },
      update: {
        score,
        plagiarismFlag: flags.includes('DUPLICATE_TEXT') || flags.includes('PUBLIC_WEB_SIMILARITY'),
        techAgeFlag: flags.includes('TECH_AGE'),
        relevanceScore,
        explanation: encodeReportExplanation(explanation, meta),
        routedToReview: routing.routedToReview,
      },
    });
    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: { status: routing.status },
      include: { report: true },
    });
    const dto = toProjectDto(updated);
    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.projectVerifyCompleted,
      partitionKey: dto.projectId,
      eventType: SMART_TOPICS.projectVerifyCompleted,
      source: 'evaluation',
      data: ProjectVerifyCompletedDataSchema.parse({
        projectId: dto.projectId,
        score: dto.report?.score ?? score,
        confidence,
        routedToReview: routing.routedToReview,
        flags,
      }),
    });
    return dto;
  }

  async listReviewQueue(): Promise<ProjectReviewQueueItemDto[]> {
    const rows = await this.prisma.project.findMany({
      where: { status: 'UNDER_REVIEW' },
      include: { report: true, student: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => toQueueItem(row));
  }

  async resolveReview(projectId: string, body: unknown): Promise<ProjectReviewQueueItemDto> {
    const request = ResolveProjectReviewRequestSchema.parse(body);
    const row = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { report: true, student: true },
    });
    if (!row) throw new NotFoundException({ error: 'not_found', message: 'Project not found.' });
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: request.resolution === 'APPROVE' ? 'VERIFIED' : 'REJECTED' },
      include: { report: true, student: true },
    });
    return toQueueItem(updated);
  }
}
