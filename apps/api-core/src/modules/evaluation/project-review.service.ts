import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListProjectReviewQueueResponseSchema,
  ProjectReviewDetailDtoSchema,
  ProjectDefenseAppealRequestSchema,
  ProjectDefenseAppealResponseSchema,
  ResolveProjectReviewRequestSchema,
  ResolveProjectReviewResponseSchema,
  UuidSchema,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { ProjectDefenseRecordService } from './project-defense-record.service.js';
import {
  decodeReportMeta,
  toQueueItem,
  toReportDto,
  type ProjectRow,
} from './project-verify.mapper.js';

@Injectable()
export class ProjectReviewService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProjectDefenseRecordService) private readonly records: ProjectDefenseRecordService,
  ) {}

  async listQueue() {
    const rows = await this.prisma.project.findMany({
      where: {
        OR: [{ status: 'UNDER_REVIEW' }, { report: { routedToReview: true } }],
      },
      include: { report: true, student: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const items = rows.map((row) =>
      toQueueItem(row as ProjectRow & { student: { fullName: string } }),
    );
    return ListProjectReviewQueueResponseSchema.parse({ items });
  }

  async getDetail(projectId: string) {
    const id = UuidSchema.parse(projectId);
    const row = await this.prisma.project.findUnique({
      where: { id },
      include: { report: true, student: { select: { fullName: true } } },
    });
    if (!row || !row.report) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Project not in review.',
        statusCode: 404,
      });
    }
    const record = await this.records.load(id);
    if (!record) {
      throw new NotFoundException({
        error: 'defense_record_missing',
        message: 'Defense record not found for this project.',
        statusCode: 404,
      });
    }
    const report = toReportDto(row.report);
    const { meta } = decodeReportMeta(row.report.explanation);
    const capabilities = await this.prisma.studentCapability.findMany({
      where: { projectId: id },
      take: 30,
    });

    return ProjectReviewDetailDtoSchema.parse({
      queue: toQueueItem(row as ProjectRow & { student: { fullName: string } }),
      transcript: record.transcript,
      grade: record.grade,
      verificationExplanation: report.explanation,
      qlixReportDigest: meta?.qlixReportDigest ?? null,
      capabilities: capabilities.map((cap) => ({
        capabilityLabel: cap.capabilityLabel,
        category: cap.category,
        proficiency: cap.proficiency,
        confidenceScore: cap.confidenceScore,
        evidenceRefs: cap.evidenceRefs,
      })),
    });
  }

  async resolve(projectId: string, body: unknown, reviewerId: string) {
    const id = UuidSchema.parse(projectId);
    const request = ResolveProjectReviewRequestSchema.parse(body);
    const row = await this.prisma.project.findUnique({
      where: { id },
      include: { report: true },
    });
    if (!row || !row.report) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Project not found.',
        statusCode: 404,
      });
    }
    if (row.status === 'VERIFIED' && request.resolution === 'APPROVE') {
      return ResolveProjectReviewResponseSchema.parse({ projectId: id, status: 'VERIFIED' });
    }
    if (row.status === 'REJECTED' && request.resolution === 'REJECT') {
      return ResolveProjectReviewResponseSchema.parse({ projectId: id, status: 'REJECTED' });
    }

    const priorStatus = row.status as 'VERIFIED' | 'UNDER_REVIEW' | 'REJECTED';
    const newStatus = request.resolution === 'APPROVE' ? 'VERIFIED' : 'REJECTED';

    await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id },
        data: { status: newStatus },
      }),
      this.prisma.projectVerificationReport.update({
        where: { projectId: id },
        data: { routedToReview: false },
      }),
    ]);

    try {
      await this.records.appendResolution(id, {
        resolution: request.resolution,
        reason: request.reason,
        reviewedBy: reviewerId,
        reviewedAt: new Date().toISOString(),
        priorStatus,
        newStatus,
      });
    } catch {
      throw new BadRequestException({
        error: 'defense_record_missing',
        message: 'Cannot resolve without a stored defense record.',
        statusCode: 400,
      });
    }

    return ResolveProjectReviewResponseSchema.parse({ projectId: id, status: newStatus });
  }

  async submitAppeal(projectId: string, studentId: string, body: unknown) {
    const id = UuidSchema.parse(projectId);
    const { reason } = ProjectDefenseAppealRequestSchema.parse(body);

    const row = await this.prisma.project.findUnique({ where: { id } });
    if (!row || row.studentId !== studentId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Project not found.',
        statusCode: 404,
      });
    }
    if (row.status !== 'UNDER_REVIEW' && row.status !== 'REJECTED') {
      throw new ConflictException({
        error: 'appeal_not_allowed',
        message: 'Appeals are only allowed when the project is under review or rejected.',
        statusCode: 409,
      });
    }

    const record = await this.records.load(id);
    if (!record) {
      throw new BadRequestException({
        error: 'defense_record_missing',
        message: 'Complete the defense interview before appealing.',
        statusCode: 400,
      });
    }
    if (record.appeals.some((a) => a.status === 'OPEN')) {
      throw new ConflictException({
        error: 'appeal_open',
        message: 'An appeal is already open for this project.',
        statusCode: 409,
      });
    }

    const { appealId } = await this.records.appendAppeal(id, reason);
    await this.prisma.project.update({
      where: { id },
      data: { status: 'UNDER_REVIEW' },
    });
    await this.prisma.projectVerificationReport.updateMany({
      where: { projectId: id },
      data: { routedToReview: true },
    });

    return ProjectDefenseAppealResponseSchema.parse({
      projectId: id,
      projectStatus: 'UNDER_REVIEW',
      appealId,
    });
  }
}
