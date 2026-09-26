import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CandidateEducationDocumentDto, CandidateEducationDto } from '@smart/contracts';
import {
  CandidateDegreeDetailsSchema,
  CandidateEducationDocumentSchema,
  CandidateEducationSchema,
  CreateCandidateEducationDocumentSchema,
  CreateCandidateEducationSchema,
  RejectCandidateEducationSchema,
  UpdateCandidateEducationSchema,
} from '@smart/contracts';
import { Prisma } from '../../generated/prisma/index.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { assertDataUriClean } from '../../platform/storage/file-scanner.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';

export function isEducationEligible(education: { status: string }): boolean {
  return education.status === 'verified';
}

@Injectable()
export class CandidateEducationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  private recordAudit(
    actorId: string,
    action: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    return this.auditPublisher.record({
      actorId,
      action,
      resourceType: 'candidate_education',
      resourceId,
      reasonCode: null,
      metadata,
    });
  }

  isEducationEligible(education: { status: string }): boolean {
    return isEducationEligible(education);
  }

  async listForStudent(userId: string): Promise<CandidateEducationDto[]> {
    const records = await this.prisma.candidateEducation.findMany({
      where: { studentId: userId },
      include: { documents: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });

    if (records.length > 0) {
      return records.map((r) => this.mapToDto(r));
    }

    // Auto-sync fallback from user.onboardingDetails if 0 records exist in DB
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.onboardingDetails) return [];

    const details = user.onboardingDetails as Record<string, unknown>;
    const rawEducations = Array.isArray(details.education) ? details.education : [];
    if (rawEducations.length === 0) return [];

    const created: CandidateEducationDto[] = [];
    for (const raw of rawEducations) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const instName = typeof item.institutionName === 'string' ? item.institutionName.trim() : '';
      if (!instName) continue;

      const newRow = await this.prisma.candidateEducation.create({
        data: {
          studentId: userId,
          institutionName: instName,
          degree: typeof item.degree === 'string' ? item.degree : null,
          fieldOfStudy: typeof item.fieldOfStudy === 'string' ? item.fieldOfStudy : null,
          startDate: typeof item.startDate === 'string' ? item.startDate : null,
          endDate: typeof item.endDate === 'string' ? item.endDate : null,
          current: Boolean(item.current),
          grade: typeof item.grade === 'string' ? item.grade : null,
          status: 'unverified',
          rejectionReason: null,
        },
      });
      created.push(this.mapToDto(newRow));
    }

    return created;
  }

  async getForStudent(userId: string, id: string): Promise<CandidateEducationDto> {
    const record = await this.prisma.candidateEducation.findUnique({
      where: { id },
      include: { documents: { orderBy: { createdAt: 'desc' } } },
    });
    if (!record) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Education entry not found.',
        statusCode: 404,
      });
    }
    if (record.studentId !== userId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Access denied.',
        statusCode: 403,
      });
    }
    return this.mapToDto(record);
  }

  async create(userId: string, body: unknown): Promise<CandidateEducationDto> {
    const parsed = CreateCandidateEducationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Invalid candidate education payload.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    const created = await this.prisma.candidateEducation.create({
      data: {
        studentId: userId,
        institutionName: parsed.data.institutionName,
        degree: parsed.data.degree || null,
        fieldOfStudy: parsed.data.fieldOfStudy || null,
        startDate: parsed.data.startDate || null,
        endDate: parsed.data.endDate || null,
        current: parsed.data.current ?? false,
        grade: parsed.data.grade || null,
        degreeDetails: this.parseDegreeDetailsForDb(parsed.data.degreeDetails),
        status: 'unverified',
        rejectionReason: null,
      },
    });

    await this.recordAudit(userId, 'candidate_education.created', created.id, {
      status: created.status,
    });
    return this.mapToDto(created);
  }

  async update(userId: string, id: string, body: unknown): Promise<CandidateEducationDto> {
    const before = await this.getForStudent(userId, id);
    const parsed = UpdateCandidateEducationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Invalid candidate education update payload.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    const updated = await this.prisma.candidateEducation.update({
      where: { id },
      data: {
        ...(parsed.data.institutionName !== undefined
          ? { institutionName: parsed.data.institutionName }
          : {}),
        ...(parsed.data.degree !== undefined ? { degree: parsed.data.degree || null } : {}),
        ...(parsed.data.fieldOfStudy !== undefined
          ? { fieldOfStudy: parsed.data.fieldOfStudy || null }
          : {}),
        ...(parsed.data.startDate !== undefined
          ? { startDate: parsed.data.startDate || null }
          : {}),
        ...(parsed.data.endDate !== undefined ? { endDate: parsed.data.endDate || null } : {}),
        ...(parsed.data.current !== undefined ? { current: parsed.data.current } : {}),
        ...(parsed.data.grade !== undefined ? { grade: parsed.data.grade || null } : {}),
        ...(parsed.data.degreeDetails !== undefined
          ? { degreeDetails: this.parseDegreeDetailsForDb(parsed.data.degreeDetails) }
          : {}),
        status: 'unverified',
        rejectionReason: null,
      },
    });

    await this.recordAudit(userId, 'candidate_education.updated', id, {
      priorStatus: before.status,
      newStatus: updated.status,
    });
    return this.mapToDto(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.getForStudent(userId, id);
    await this.prisma.candidateEducation.delete({ where: { id } });
    await this.recordAudit(userId, 'candidate_education.deleted', id, {});
  }

  async attachDocument(
    userId: string,
    educationId: string,
    payload: unknown,
  ): Promise<CandidateEducationDocumentDto> {
    await this.getForStudent(userId, educationId);
    const parsed = CreateCandidateEducationDocumentSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Invalid education document attachment payload.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    await assertDataUriClean(parsed.data.fileUrl, parsed.data.fileName);
    const doc = await this.prisma.candidateEducationDocument.create({
      data: {
        educationId,
        documentType: parsed.data.documentType,
        fileUrl: parsed.data.fileUrl,
        fileName: parsed.data.fileName,
        fileSizeBytes: parsed.data.fileSizeBytes,
        mimeType: parsed.data.mimeType,
      },
    });

    await this.recordAudit(userId, 'candidate_education.document_attached', educationId, {
      documentId: doc.id,
      documentType: doc.documentType,
    });
    return this.mapDocumentToDto(doc);
  }

  async removeDocument(userId: string, educationId: string, documentId: string): Promise<void> {
    await this.getForStudent(userId, educationId);
    const doc = await this.prisma.candidateEducationDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || doc.educationId !== educationId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Education document not found.',
        statusCode: 404,
      });
    }

    await this.prisma.candidateEducationDocument.delete({ where: { id: documentId } });
    await this.recordAudit(userId, 'candidate_education.document_removed', educationId, {
      documentId,
    });
  }

  async confirmByHomeCollege(id: string, user: RequestUser): Promise<CandidateEducationDto> {
    const record = await this.prisma.candidateEducation.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Education entry not found.',
        statusCode: 404,
      });
    }

    await this.assertHomeCollegeOwnership(record.studentId, user);

    const updated = await this.prisma.candidateEducation.update({
      where: { id },
      data: {
        status: 'verified',
        rejectionReason: null,
      },
    });

    await this.recordAudit(user.sub, 'candidate_education.confirmed', id, {
      studentId: record.studentId,
      priorStatus: record.status,
      newStatus: 'verified',
    });
    return this.mapToDto(updated);
  }

  async rejectByHomeCollege(
    id: string,
    body: unknown,
    user: RequestUser,
  ): Promise<CandidateEducationDto> {
    const parsed = RejectCandidateEducationSchema.safeParse(body);
    if (!parsed.success || !parsed.data.reason || parsed.data.reason.trim().length === 0) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Rejection reason is required.',
        statusCode: 400,
        details: parsed.success ? undefined : parsed.error.flatten(),
      });
    }

    const record = await this.prisma.candidateEducation.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Education entry not found.',
        statusCode: 404,
      });
    }

    await this.assertHomeCollegeOwnership(record.studentId, user);

    const updated = await this.prisma.candidateEducation.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: parsed.data.reason.trim(),
      },
    });

    await this.recordAudit(user.sub, 'candidate_education.rejected', id, {
      studentId: record.studentId,
      priorStatus: record.status,
      newStatus: 'rejected',
    });
    return this.mapToDto(updated);
  }

  private async assertHomeCollegeOwnership(studentId: string, user: RequestUser): Promise<void> {
    if (user.role === 'SUPER_ADMIN') {
      return;
    }

    if (user.role === 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Student-facing API cannot perform institution verification.',
        statusCode: 403,
      });
    }

    if (!user.inst) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Institution admin must belong to an institution.',
        statusCode: 403,
      });
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { institutionId: true },
    });

    if (!student || student.institutionId !== user.inst) {
      throw new ForbiddenException({
        error: 'forbidden',
        message:
          'Institution admin can only verify education claims for students of their home college.',
        statusCode: 403,
      });
    }
  }

  private mapDocumentToDto(doc: {
    id: string;
    educationId: string;
    documentType: string;
    fileUrl: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    createdAt: Date;
  }): CandidateEducationDocumentDto {
    return CandidateEducationDocumentSchema.parse({
      id: doc.id,
      educationId: doc.educationId,
      documentType: doc.documentType,
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      fileSizeBytes: doc.fileSizeBytes,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt.toISOString(),
    });
  }

  private parseDegreeDetailsForDb(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
    if (value === null || value === undefined) {
      return Prisma.DbNull;
    }
    const parsed = CandidateDegreeDetailsSchema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Invalid degree details payload.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }
    return parsed.data as Prisma.InputJsonValue;
  }

  private mapDegreeDetailsFromDb(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }
    const parsed = CandidateDegreeDetailsSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }

  private mapToDto(r: {
    id: string;
    studentId: string;
    institutionName: string;
    degree: string | null;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
    current: boolean;
    grade: string | null;
    degreeDetails?: unknown;
    status: string;
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    documents?: Array<{
      id: string;
      educationId: string;
      documentType: string;
      fileUrl: string;
      fileName: string;
      fileSizeBytes: number;
      mimeType: string;
      createdAt: Date;
    }>;
  }): CandidateEducationDto {
    return CandidateEducationSchema.parse({
      id: r.id,
      studentId: r.studentId,
      institutionName: r.institutionName,
      degree: r.degree,
      fieldOfStudy: r.fieldOfStudy,
      startDate: r.startDate,
      endDate: r.endDate,
      current: r.current,
      grade: r.grade,
      degreeDetails: this.mapDegreeDetailsFromDb(r.degreeDetails),
      status: r.status,
      rejectionReason: r.rejectionReason,
      documents: (r.documents ?? []).map((doc) => this.mapDocumentToDto(doc)),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    });
  }
}
