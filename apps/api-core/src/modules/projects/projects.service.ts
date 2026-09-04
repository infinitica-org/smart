import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CreateProjectRequestSchema,
  ProjectDtoSchema,
  ProjectSubmittedDataSchema,
  SMART_TOPICS,
  UuidSchema,
  type ListMyProjectsResponse,
  type ProjectDto,
} from '@smart/contracts';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

interface ProjectRow {
  id: string;
  studentId: string;
  title: string;
  problem: string;
  approach: string;
  stack: string;
  outcome: string;
  loomUrl: string | null;
  githubUrl: string | null;
  liveUrl: string | null;
  status: string;
  createdAt: Date;
}

@Injectable()
export class ProjectsService {
  readonly owner = 'Vishal V';
  readonly purpose = 'CN-T08 project create + SE-T03 queue via smart.project.submitted.';
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
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

    this.logger.log(`Project ${row.id} queued on ${SMART_TOPICS.projectSubmitted}`);
    return toProjectDto(row);
  }

  async listMine(studentId: string): Promise<ListMyProjectsResponse> {
    const rows = await this.prisma.project.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    return { projects: rows.map((row) => toProjectDto(row)) };
  }

  async getForStudent(studentId: string, projectId: string): Promise<ProjectDto> {
    const id = UuidSchema.parse(projectId);
    const row = await this.prisma.project.findUnique({ where: { id } });
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
    return toProjectDto(row);
  }
}

export function toProjectDto(row: ProjectRow): ProjectDto {
  return ProjectDtoSchema.parse({
    projectId: row.id,
    studentId: row.studentId,
    title: row.title,
    problem: row.problem,
    approach: row.approach,
    stack: row.stack,
    outcome: row.outcome,
    loomUrl: row.loomUrl,
    githubUrl: row.githubUrl,
    liveUrl: row.liveUrl,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    report: null,
  });
}
