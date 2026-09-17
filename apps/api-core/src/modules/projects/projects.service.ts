import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CreateProjectRequestSchema,
  ProjectSubmittedDataSchema,
  SMART_TOPICS,
  UuidSchema,
  type ListMyProjectsResponse,
  type ProjectDto,
} from '@smart/contracts';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { ProjectInterviewGateService } from '../evaluation/project-interview-gate.service.js';
import { ProjectVerifyRunnerService } from '../evaluation/project-verify-runner.service.js';
import { toProjectDto, type ProjectRow } from '../evaluation/project-verify.mapper.js';

@Injectable()
export class ProjectsService {
  readonly owner = 'Vishal V';
  readonly purpose = 'CN-T08 project create + SE-T03 queue via smart.project.submitted.';
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(ProjectVerifyRunnerService) private readonly verifyRunner: ProjectVerifyRunnerService,
    @Inject(ProjectInterviewGateService)
    private readonly interviewGate: ProjectInterviewGateService,
  ) {}

  async create(studentId: string, body: unknown): Promise<ProjectDto> {
    const request = CreateProjectRequestSchema.parse(body);
    const githubUrl = request.githubUrl ?? request.githubRepos[0]?.htmlUrl ?? null;

    const row = await this.prisma.project.create({
      data: {
        studentId,
        title: request.title,
        problem: request.problem,
        approach: request.approach,
        stack: request.stack,
        outcome: request.outcome,
        loomUrl: request.loomUrl ?? null,
        githubUrl,
        liveUrl: request.liveUrl ?? null,
        status: 'SUBMITTED',
      },
    });

    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.projectSubmitted,
      partitionKey: row.id,
      eventType: SMART_TOPICS.projectSubmitted,
      source: 'platform',
      data: ProjectSubmittedDataSchema.parse({ projectId: row.id, studentId }),
    });

    // Sync fallback when Kafka consumer is not running (local dev).
    await this.verifyRunner.runForProject(row.id, studentId);

    this.logger.log(`Project ${row.id} queued on ${SMART_TOPICS.projectSubmitted}`);
    const refreshed = await this.loadRow(row.id);
    return this.toDtoWithInterview(refreshed ?? { ...row, report: null });
  }

  async listMine(studentId: string): Promise<ListMyProjectsResponse> {
    const rows = await this.prisma.project.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { report: true },
    });
    const projects = await Promise.all(rows.map((row) => this.toDtoWithInterview(row)));
    return { projects };
  }

  async getForStudent(studentId: string, projectId: string): Promise<ProjectDto> {
    const id = UuidSchema.parse(projectId);
    const row = await this.loadRow(id);
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Project not found.',
        statusCode: 404,
      });
    }
    if (row.studentId !== studentId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You can only view your own projects.',
        statusCode: 403,
      });
    }
    if (!row.report && row.status === 'SUBMITTED') {
      await this.verifyRunner.runForProject(row.id, studentId);
      const refreshed = await this.loadRow(id);
      if (refreshed) return this.toDtoWithInterview(refreshed);
    }
    return this.toDtoWithInterview(row);
  }

  private async loadRow(id: string): Promise<ProjectRow | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: { report: true },
    });
  }

  private async toDtoWithInterview(row: ProjectRow): Promise<ProjectDto> {
    const interview = await this.interviewGate.getState(row.id);
    return toProjectDto(row, interview);
  }
}
