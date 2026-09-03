import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { WorkExperienceDto, WorkExperienceDocumentDto } from '@smart/contracts';
import {
  CreateWorkExperienceSchema,
  CreateWorkExperienceDocumentSchema,
  UpdateWorkExperienceSchema,
  WorkExperienceSchema,
  WorkExperienceDocumentSchema,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import type { Prisma } from '../../generated/prisma/index.js';

interface RawWorkExperience {
  id: string;
  studentId: string;
  companyId?: string | null;
  companyName: string;
  companyWebsite?: string | null;
  companyLinkedinUrl?: string | null;
  role: string;
  employmentType: string;
  department?: string | null;
  domain?: string | null;
  workLocation?: string | null;
  startDate: Date;
  endDate?: Date | null;
  isCurrent: boolean;
  responsibilities?: string | null;
  skills?: string[];
  projects?: unknown;
  candidateLinkedin?: string | null;
  verifierName?: string | null;
  verifierEmail?: string | null;
  verifierDesignation?: string | null;
  verifierPhone?: string | null;
  status: string;
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  documents?: RawWorkExperienceDocument[];
}

interface RawWorkExperienceDocument {
  id: string;
  experienceId: string;
  documentType: string;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  createdAt: Date;
}

@Injectable()
export class WorkExperienceService {
  readonly owner = 'Vishal V';
  readonly purpose =
    'Student work experience submission, metadata persistence, and document management.';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  private mapToDto(exp: RawWorkExperience): WorkExperienceDto {
    return WorkExperienceSchema.parse({
      id: exp.id,
      studentId: exp.studentId,
      companyId: exp.companyId ?? null,
      companyName: exp.companyName,
      companyWebsite: exp.companyWebsite ?? null,
      companyLinkedinUrl: exp.companyLinkedinUrl ?? null,
      role: exp.role,
      employmentType: exp.employmentType,
      department: exp.department ?? null,
      domain: exp.domain ?? null,
      workLocation: exp.workLocation ?? null,
      startDate: exp.startDate.toISOString(),
      endDate: exp.endDate ? exp.endDate.toISOString() : null,
      isCurrent: exp.isCurrent,
      responsibilities: exp.responsibilities ?? null,
      skills: exp.skills ?? [],
      projects: exp.projects ?? null,
      candidateLinkedin: exp.candidateLinkedin ?? null,
      verifierName: exp.verifierName ?? null,
      verifierEmail: exp.verifierEmail ?? null,
      verifierDesignation: exp.verifierDesignation ?? null,
      verifierPhone: exp.verifierPhone ?? null,
      status: exp.status,
      rejectionReason: exp.rejectionReason ?? null,
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
      documents: (exp.documents || []).map((doc: RawWorkExperienceDocument) =>
        WorkExperienceDocumentSchema.parse({
          id: doc.id,
          experienceId: doc.experienceId,
          documentType: doc.documentType,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          fileSizeBytes: doc.fileSizeBytes,
          mimeType: doc.mimeType,
          createdAt: doc.createdAt.toISOString(),
        }),
      ),
    });
  }

  async listForStudent(studentId: string): Promise<WorkExperienceDto[]> {
    const list = await this.prisma.workExperience.findMany({
      where: { studentId },
      include: { documents: true },
      orderBy: { startDate: 'desc' },
    });
    return list.map((item) => this.mapToDto(item));
  }

  async getForStudent(studentId: string, id: string): Promise<WorkExperienceDto> {
    const record = await this.prisma.workExperience.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!record || record.studentId !== studentId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Work experience entry not found.',
        statusCode: 404,
      });
    }
    return this.mapToDto(record);
  }

  async create(studentId: string, payload: unknown): Promise<WorkExperienceDto> {
    const parsed = CreateWorkExperienceSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Invalid work experience submission.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    const data = parsed.data;

    // Optional company lookup to associate companyId if company matches catalog
    let matchedCompanyId: string | null = data.companyId ?? null;
    if (!matchedCompanyId && data.companyWebsite) {
      try {
        const urlObj = new URL(data.companyWebsite);
        const domain = urlObj.hostname.replace(/^www\./, '');
        const existingCompany = await this.prisma.company.findFirst({
          where: { OR: [{ domain }, { name: { equals: data.companyName, mode: 'insensitive' } }] },
        });
        if (existingCompany) {
          matchedCompanyId = existingCompany.id;
        }
      } catch {
        // Ignored if invalid URL
      }
    }

    const created = await this.prisma.workExperience.create({
      data: {
        studentId,
        companyId: matchedCompanyId,
        companyName: data.companyName,
        companyWebsite: data.companyWebsite || null,
        companyLinkedinUrl: data.companyLinkedinUrl || null,
        role: data.role,
        employmentType: data.employmentType,
        department: data.department || null,
        domain: data.domain || null,
        workLocation: data.workLocation || null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isCurrent: data.isCurrent,
        responsibilities: data.responsibilities || null,
        skills: data.skills,
        projects: (data.projects as Prisma.InputJsonValue) ?? null,
        candidateLinkedin: data.candidateLinkedin || null,
        verifierName: data.verifierName || null,
        verifierEmail: data.verifierEmail || null,
        verifierDesignation: data.verifierDesignation || null,
        verifierPhone: data.verifierPhone || null,
        status: 'SUBMITTED',
      },
      include: { documents: true },
    });

    await this.auditPublisher.record({
      actorId: studentId,
      action: 'WORK_EXPERIENCE_SUBMITTED',
      resourceType: 'WorkExperience',
      resourceId: created.id,
      reasonCode: null,
    });

    return this.mapToDto(created);
  }

  async update(studentId: string, id: string, payload: unknown): Promise<WorkExperienceDto> {
    const existing = await this.prisma.workExperience.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!existing || existing.studentId !== studentId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Work experience entry not found.',
        statusCode: 404,
      });
    }

    const parsed = UpdateWorkExperienceSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Invalid work experience update payload.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    const data = parsed.data;

    const updated = await this.prisma.workExperience.update({
      where: { id },
      data: {
        ...(data.companyName !== undefined ? { companyName: data.companyName } : {}),
        ...(data.companyWebsite !== undefined
          ? { companyWebsite: data.companyWebsite || null }
          : {}),
        ...(data.companyLinkedinUrl !== undefined
          ? { companyLinkedinUrl: data.companyLinkedinUrl || null }
          : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.employmentType !== undefined ? { employmentType: data.employmentType } : {}),
        ...(data.department !== undefined ? { department: data.department || null } : {}),
        ...(data.domain !== undefined ? { domain: data.domain || null } : {}),
        ...(data.workLocation !== undefined ? { workLocation: data.workLocation || null } : {}),
        ...(data.startDate !== undefined ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate !== undefined
          ? { endDate: data.endDate ? new Date(data.endDate) : null }
          : {}),
        ...(data.isCurrent !== undefined ? { isCurrent: data.isCurrent } : {}),
        ...(data.responsibilities !== undefined
          ? { responsibilities: data.responsibilities || null }
          : {}),
        ...(data.skills !== undefined ? { skills: data.skills } : {}),
        ...(data.projects !== undefined
          ? { projects: (data.projects as Prisma.InputJsonValue) ?? null }
          : {}),
        ...(data.candidateLinkedin !== undefined
          ? { candidateLinkedin: data.candidateLinkedin || null }
          : {}),
        ...(data.verifierName !== undefined ? { verifierName: data.verifierName || null } : {}),
        ...(data.verifierEmail !== undefined ? { verifierEmail: data.verifierEmail || null } : {}),
        ...(data.verifierDesignation !== undefined
          ? { verifierDesignation: data.verifierDesignation || null }
          : {}),
        ...(data.verifierPhone !== undefined ? { verifierPhone: data.verifierPhone || null } : {}),
      },
      include: { documents: true },
    });

    await this.auditPublisher.record({
      actorId: studentId,
      action: 'WORK_EXPERIENCE_UPDATED',
      resourceType: 'WorkExperience',
      resourceId: updated.id,
      reasonCode: null,
    });

    return this.mapToDto(updated);
  }

  async delete(studentId: string, id: string): Promise<void> {
    const existing = await this.prisma.workExperience.findUnique({
      where: { id },
    });
    if (!existing || existing.studentId !== studentId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Work experience entry not found.',
        statusCode: 404,
      });
    }

    await this.prisma.workExperience.delete({
      where: { id },
    });

    await this.auditPublisher.record({
      actorId: studentId,
      action: 'WORK_EXPERIENCE_DELETED',
      resourceType: 'WorkExperience',
      resourceId: id,
      reasonCode: null,
    });
  }

  async attachDocument(
    studentId: string,
    id: string,
    payload: unknown,
  ): Promise<WorkExperienceDocumentDto> {
    const existing = await this.prisma.workExperience.findUnique({
      where: { id },
    });
    if (!existing || existing.studentId !== studentId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Work experience entry not found.',
        statusCode: 404,
      });
    }

    const parsed = CreateWorkExperienceDocumentSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Invalid document attachment payload.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    const doc = await this.prisma.workExperienceDocument.create({
      data: {
        experienceId: id,
        documentType: parsed.data.documentType,
        fileUrl: parsed.data.fileUrl,
        fileName: parsed.data.fileName,
        fileSizeBytes: parsed.data.fileSizeBytes,
        mimeType: parsed.data.mimeType,
      },
    });

    await this.auditPublisher.record({
      actorId: studentId,
      action: 'WORK_EXPERIENCE_DOCUMENT_ATTACHED',
      resourceType: 'WorkExperienceDocument',
      resourceId: doc.id,
      reasonCode: null,
    });

    return WorkExperienceDocumentSchema.parse({
      id: doc.id,
      experienceId: doc.experienceId,
      documentType: doc.documentType,
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      fileSizeBytes: doc.fileSizeBytes,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt.toISOString(),
    });
  }

  async removeDocument(studentId: string, id: string, documentId: string): Promise<void> {
    const existing = await this.prisma.workExperience.findUnique({
      where: { id },
    });
    if (!existing || existing.studentId !== studentId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Work experience entry not found.',
        statusCode: 404,
      });
    }

    const doc = await this.prisma.workExperienceDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || doc.experienceId !== id) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Document attachment not found.',
        statusCode: 404,
      });
    }

    await this.prisma.workExperienceDocument.delete({
      where: { id: documentId },
    });

    await this.auditPublisher.record({
      actorId: studentId,
      action: 'WORK_EXPERIENCE_DOCUMENT_REMOVED',
      resourceType: 'WorkExperienceDocument',
      resourceId: documentId,
      reasonCode: null,
    });
  }
}
