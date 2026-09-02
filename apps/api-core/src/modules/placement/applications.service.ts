import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ApplicationStageChangedDataSchema,
  SMART_TOPICS,
  type ApplicationDto,
  type CreateApplicationRequest,
  type ListApplicationsResponse,
  type PatchApplicationStageRequest,
} from '@smart/contracts';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
  ) {}

  async createApplication(
    institutionId: string,
    body: CreateApplicationRequest,
  ): Promise<ApplicationDto> {
    const opening = await this.prisma.jobOpening.findFirst({
      where: { id: body.openingId, institutionId },
    });
    if (!opening) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Job opening not found.',
        statusCode: 404,
      });
    }

    const student = await this.prisma.user.findFirst({
      where: { id: body.studentId, institutionId, role: 'STUDENT' },
    });
    if (!student) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Student not found in this institution.',
        statusCode: 404,
      });
    }

    const existing = await this.prisma.application.findUnique({
      where: {
        openingId_studentId: {
          openingId: body.openingId,
          studentId: body.studentId,
        },
      },
    });
    if (existing) {
      throw new ConflictException({
        error: 'conflict',
        message: 'This student already has an application for the opening.',
        statusCode: 409,
      });
    }

    const row = await this.prisma.application.create({
      data: {
        openingId: body.openingId,
        studentId: body.studentId,
        stage: body.stage,
        matchScore: body.matchScore ?? null,
      },
    });

    await this.publishStageChanged({
      applicationId: row.id,
      openingId: body.openingId,
      studentId: body.studentId,
      fromStage: null,
      toStage: body.stage,
    });

    return toApplicationDto(row);
  }

  async patchStage(
    institutionId: string,
    applicationId: string,
    body: PatchApplicationStageRequest,
  ): Promise<ApplicationDto> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        opening: true,
        student: true,
      },
    });
    if (!application || application.opening.institutionId !== institutionId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Application not found.',
        statusCode: 404,
      });
    }
    if (application.stage === body.stage) {
      return toApplicationDto(application);
    }

    const fromStage = application.stage;
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.application.update({
        where: { id: applicationId },
        data: { stage: body.stage },
      });
      await tx.applicationStageEvent.create({
        data: {
          applicationId,
          fromStage,
          toStage: body.stage,
        },
      });
      return next;
    });

    await this.publishStageChanged({
      applicationId,
      openingId: application.openingId,
      studentId: application.studentId,
      fromStage,
      toStage: body.stage,
    });

    return toApplicationDto(updated);
  }

  async listForStudent(studentId: string): Promise<ListApplicationsResponse> {
    const rows = await this.prisma.application.findMany({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
    });
    return { applications: rows.map(toApplicationDto) };
  }

  private async publishStageChanged(params: {
    applicationId: string;
    openingId: string;
    studentId: string;
    fromStage: string | null;
    toStage: string;
  }): Promise<void> {
    const eventData = ApplicationStageChangedDataSchema.parse({
      applicationId: params.applicationId,
      openingId: params.openingId,
      studentId: params.studentId,
      fromStage: params.fromStage,
      toStage: params.toStage,
      changedAt: new Date().toISOString(),
    });
    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.applicationStageChanged,
      partitionKey: params.applicationId,
      eventType: SMART_TOPICS.applicationStageChanged,
      source: 'placement',
      data: eventData,
    });
  }
}

function toApplicationDto(row: {
  id: string;
  openingId: string;
  studentId: string;
  stage: string;
  matchScore: { toString(): string } | null;
  createdAt: Date;
  updatedAt: Date;
}): ApplicationDto {
  return {
    applicationId: row.id,
    openingId: row.openingId,
    studentId: row.studentId,
    stage: row.stage as ApplicationDto['stage'],
    matchScore: row.matchScore ? Number(row.matchScore) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
