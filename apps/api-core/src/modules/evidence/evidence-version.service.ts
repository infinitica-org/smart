import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  EvidenceRecordVersionDto,
  EvidenceRecordVersionRedactedDto,
  EvidenceSource,
  EvidenceVerificationStatus,
  ListEvidenceRecordVersionsRedactedResponse,
  ListEvidenceRecordVersionsResponse,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import {
  buildEvidenceSnapshot,
  evidenceContentEquals,
  hashEvidenceContent,
  redactEvidenceSnapshot,
  type EvidenceRecordRow,
} from './evidence-version.snapshot.js';
import { toEvidenceRecordVersionDto } from './evidence.mapper.js';
import { assertCanReadCandidateEvidenceVersions } from './evidence-version-auth.helper.js';

export interface EvidenceVersionWriteContext {
  mutationKey: string;
  actorId: string | null;
  organizationId: string | null;
  source: EvidenceSource | 'SYSTEM';
  priorVerificationStatus: EvidenceVerificationStatus | null;
  newVerificationStatus: EvidenceVerificationStatus;
}

export type EvidenceVersionWriteResult = 'created' | 'duplicate';

@Injectable()
export class EvidenceVersionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService)
    private readonly auditPublisher?: AuditPublisherService,
  ) {}

  hashContent(row: EvidenceRecordRow): string {
    return hashEvidenceContent(row);
  }

  contentEquals(left: EvidenceRecordRow, right: EvidenceRecordRow): boolean {
    return evidenceContentEquals(left, right);
  }

  buildSnapshot(row: EvidenceRecordRow) {
    return buildEvidenceSnapshot(row);
  }

  async resolveStudentOrganizationId(studentId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { institutionId: true },
    });
    return user?.institutionId ?? null;
  }

  async createInitialVersion(
    tx: Prisma.TransactionClient,
    row: EvidenceRecordRow,
    context: EvidenceVersionWriteContext,
  ): Promise<EvidenceVersionWriteResult> {
    return this.insertVersion(tx, row, 1, context);
  }

  async appendVersion(
    tx: Prisma.TransactionClient,
    row: EvidenceRecordRow,
    context: EvidenceVersionWriteContext,
  ): Promise<EvidenceVersionWriteResult> {
    const latest = await tx.evidenceRecordVersion.findFirst({
      where: { evidenceId: row.id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersion = (latest?.versionNumber ?? 0) + 1;
    return this.insertVersion(tx, row, nextVersion, context);
  }

  private async insertVersion(
    tx: Prisma.TransactionClient,
    row: EvidenceRecordRow,
    versionNumber: number,
    context: EvidenceVersionWriteContext,
  ): Promise<EvidenceVersionWriteResult> {
    try {
      const created = await tx.evidenceRecordVersion.create({
        data: {
          evidenceId: row.id,
          versionNumber,
          snapshot: buildEvidenceSnapshot(row) as Prisma.InputJsonValue,
          mutationKey: context.mutationKey,
          actorId: context.actorId,
          organizationId: context.organizationId,
          source: context.source,
          priorVerificationStatus: context.priorVerificationStatus,
          newVerificationStatus: context.newVerificationStatus,
        },
      });

      if (this.auditPublisher) {
        await this.auditPublisher.record({
          actorId: context.actorId,
          action: 'evidence.version_created',
          resourceType: 'evidence_record',
          resourceId: row.id,
          reasonCode: null,
          metadata: {
            evidenceId: row.id,
            versionNumber: created.versionNumber,
            priorVerificationStatus: context.priorVerificationStatus,
            newVerificationStatus: context.newVerificationStatus,
            source: context.source,
            actorId: context.actorId,
            organizationId: context.organizationId,
            mutationKey: context.mutationKey,
          },
        });
      }

      return 'created';
    } catch (error) {
      if (isUniqueViolation(error)) {
        return 'duplicate';
      }
      throw error;
    }
  }

  async listStudentEvidenceVersions(
    studentId: string,
    evidenceId: string,
  ): Promise<ListEvidenceRecordVersionsResponse> {
    await this.assertStudentOwnsEvidence(studentId, evidenceId);
    const rows = await this.prisma.evidenceRecordVersion.findMany({
      where: { evidenceId },
      orderBy: { versionNumber: 'asc' },
    });
    return {
      evidenceId,
      total: rows.length,
      items: rows.map(toEvidenceRecordVersionDto),
    };
  }

  async getStudentEvidenceVersion(
    studentId: string,
    evidenceId: string,
    versionNumber: number,
  ): Promise<EvidenceRecordVersionDto> {
    await this.assertStudentOwnsEvidence(studentId, evidenceId);
    const row = await this.prisma.evidenceRecordVersion.findFirst({
      where: { evidenceId, versionNumber },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Evidence version not found.',
        statusCode: 404,
      });
    }
    return toEvidenceRecordVersionDto(row);
  }

  async listCandidateEvidenceVersions(
    caller: RequestUser,
    studentId: string,
    evidenceId: string,
  ): Promise<ListEvidenceRecordVersionsResponse | ListEvidenceRecordVersionsRedactedResponse> {
    const access = await assertCanReadCandidateEvidenceVersions(this.prisma, caller, studentId);
    await this.assertEvidenceBelongsToStudent(studentId, evidenceId);

    const rows = await this.prisma.evidenceRecordVersion.findMany({
      where: { evidenceId },
      orderBy: { versionNumber: 'asc' },
    });

    if (access.redacted) {
      return {
        evidenceId,
        total: rows.length,
        items: rows.map((row) => toRedactedVersionDto(row)),
      };
    }

    return {
      evidenceId,
      total: rows.length,
      items: rows.map(toEvidenceRecordVersionDto),
    };
  }

  async getCandidateEvidenceVersion(
    caller: RequestUser,
    studentId: string,
    evidenceId: string,
    versionNumber: number,
  ): Promise<EvidenceRecordVersionDto | EvidenceRecordVersionRedactedDto> {
    const access = await assertCanReadCandidateEvidenceVersions(this.prisma, caller, studentId);
    await this.assertEvidenceBelongsToStudent(studentId, evidenceId);

    const row = await this.prisma.evidenceRecordVersion.findFirst({
      where: { evidenceId, versionNumber },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Evidence version not found.',
        statusCode: 404,
      });
    }

    return access.redacted ? toRedactedVersionDto(row) : toEvidenceRecordVersionDto(row);
  }

  private async assertStudentOwnsEvidence(studentId: string, evidenceId: string): Promise<void> {
    await this.assertEvidenceBelongsToStudent(studentId, evidenceId);
  }

  private async assertEvidenceBelongsToStudent(
    studentId: string,
    evidenceId: string,
  ): Promise<void> {
    const record = await this.prisma.evidenceRecord.findFirst({
      where: { id: evidenceId, studentId },
      select: { id: true },
    });
    if (!record) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Evidence not found.',
        statusCode: 404,
      });
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

function toRedactedVersionDto(
  row: Parameters<typeof toEvidenceRecordVersionDto>[0],
): EvidenceRecordVersionRedactedDto {
  const dto = toEvidenceRecordVersionDto(row);
  return {
    ...dto,
    snapshot: redactEvidenceSnapshot(dto.snapshot),
  };
}
