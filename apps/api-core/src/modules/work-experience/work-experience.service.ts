import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type {
  WorkExperienceDto,
  WorkExperienceDocumentDto,
  ValidateWorkExperienceProofResponse,
  SendWorkExperienceVerificationResponseDto,
  GetWorkExperienceVerificationResponseDto,
  SubmitWorkExperienceVerificationDto,
  SubmitWorkExperienceVerificationResponseDto,
  WorkExperienceOpsDashboardItemDto,
  WorkExperienceVerificationStatus,
  VoidRequest,
  VoidWorkExperienceResponse,
  SendManagerEndorsementDto,
  SendManagerEndorsementResponseDto,
  GetManagerEndorsementSurveyDto,
  SubmitManagerEndorsementDto,
  SubmitManagerEndorsementResponseDto,
  AdminWorkExperienceReviewRequest,
  ApproveWorkExperienceAuthenticityResponse,
} from '@smart/contracts';
import {
  CreateWorkExperienceSchema,
  CreateWorkExperienceDocumentSchema,
  UpdateWorkExperienceSchema,
  WorkExperienceSchema,
  WorkExperienceDocumentSchema,
  WorkExperienceProofExtractedDataSchema,
  WorkExperienceLetterAuthenticityExtractSchema,
  ValidateWorkExperienceProofResponseSchema,
  SubmitWorkExperienceVerificationSchema,
  isDisallowedEndorserEmailDomain,
  skillsClaimedSnapshotWhenVerified,
  validateWorkExperienceLetterRules,
  ApproveWorkExperienceAuthenticityResponseSchema,
  toWorkExperienceDocumentPublicDto,
  type WorkExperienceDocumentPublicDto,
  companyRequiresPublicIdentity,
  validateCompanyPublicIdentity,
  isInvalidEmploymentProofAttachmentType,
  isInvalidEmploymentProofClassification,
  INVALID_EMPLOYMENT_PROOF_MESSAGE,
  deriveWorkExperienceNextAction,
  type WorkExperienceProofReasonCode,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { OrganizationsService } from '../institutions/organizations.service.js';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import {
  EMAIL_QUEUE,
  type EmailQueueJobData,
  type WorkExperienceReminderJobPayload,
  type WorkExperienceExpireJobPayload,
  type WorkExperienceManagerReminderJobPayload,
} from '../../platform/mailer/mailer.types.js';
import { env } from '../../platform/config/env.js';
import { Prisma } from '../../generated/prisma/index.js';

interface RawWorkExperience {
  id: string;
  studentId: string;
  organizationId?: string | null;
  companyId?: string | null;
  companyName: string;
  companyNameRaw?: string | null;
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
  validationStatus?: string | null;
  validationResult?: unknown;
  createdAt: Date;
}

export {
  normalizeCompanyName,
  extractDomain,
  validateEmployerDomain,
} from './company-name.util.js';
import {
  normalizeText,
  normalizeCompanyName,
  extractDomain,
  validateEmployerDomain,
} from './company-name.util.js';
import {
  evaluateLetterAuthenticity,
  mergeAuthenticityIntoValidationResult,
  parseStoredDocumentAuthenticity,
} from './work-experience-document-authenticity.util.js';

@Injectable()
export class WorkExperienceService {
  readonly owner = 'Vishal V';
  readonly purpose =
    'Student work experience submission, metadata persistence, and document management.';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(AiGatewayService) private readonly aiGateway: AiGatewayService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailQueueJobData>,
    @Inject(OrganizationsService) private readonly organizationsService?: OrganizationsService,
  ) {}

  private async resolveOrganization(params: {
    name: string;
    website?: string | null;
    verifierEmail?: string | null;
  }) {
    if (this.organizationsService) {
      return this.organizationsService.resolveOrCreateOrganization(params);
    }
    const rawName = params.name.trim();
    const normalizedName = normalizeCompanyName(rawName);
    let extractedDomain: string | null = null;
    if (params.website) {
      extractedDomain = extractDomain(params.website);
    }
    if (!extractedDomain && params.verifierEmail) {
      extractedDomain = extractDomain(params.verifierEmail);
    }

    if (extractedDomain) {
      const orgByDomain = await this.prisma.organization.findFirst({
        where: { domain: extractedDomain },
      });
      if (orgByDomain) return orgByDomain;
    }

    const orgByName = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { name: { equals: rawName, mode: 'insensitive' } },
          { name: { equals: normalizedName, mode: 'insensitive' } },
        ],
      },
    });
    if (orgByName) return orgByName;

    let domainToUse: string | null = extractedDomain;
    if (domainToUse) {
      const domainExists = await this.prisma.organization.findFirst({
        where: { domain: domainToUse },
      });
      if (domainExists) domainToUse = null;
    }

    return this.prisma.organization.create({
      data: {
        name: rawName,
        domain: domainToUse,
        verificationStatus: 'PENDING',
      },
    });
  }

  private mapDocumentToDto(doc: RawWorkExperienceDocument): WorkExperienceDocumentDto {
    const authenticity = parseStoredDocumentAuthenticity(doc.validationResult);
    return WorkExperienceDocumentSchema.parse({
      id: doc.id,
      experienceId: doc.experienceId,
      documentType: doc.documentType,
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      fileSizeBytes: doc.fileSizeBytes,
      mimeType: doc.mimeType,
      authenticityStatus: authenticity.status,
      authenticityResult: authenticity.result,
      createdAt: doc.createdAt.toISOString(),
    });
  }

  private mapToDto(exp: RawWorkExperience): WorkExperienceDto {
    const skillsClaimed = exp.skills ?? [];
    return WorkExperienceSchema.parse({
      id: exp.id,
      studentId: exp.studentId,
      organizationId: exp.organizationId ?? null,
      companyId: exp.companyId ?? null,
      companyName: exp.companyName,
      companyNameRaw: exp.companyNameRaw ?? exp.companyName,
      companyWebsite: exp.companyWebsite ?? null,
      companyLinkedinUrl: exp.companyLinkedinUrl ?? null,
      role: exp.role,
      employmentType: exp.employmentType ?? 'FULL_TIME',
      department: exp.department ?? null,
      domain: exp.domain ?? null,
      workLocation: exp.workLocation ?? null,
      startDate: exp.startDate.toISOString(),
      endDate: exp.endDate ? exp.endDate.toISOString() : null,
      isCurrent: exp.isCurrent,
      responsibilities: exp.responsibilities ?? null,
      skillsClaimed,
      skillsClaimedSnapshot: skillsClaimedSnapshotWhenVerified(exp.status, skillsClaimed),
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
      documents: (exp.documents || []).map((doc) => this.mapDocumentToDto(doc)),
    });
  }

  /** WE-T02 — company-lite / B2B surfaces must never receive raw letter file URLs. */
  mapToCompanyLiteDto(exp: RawWorkExperience): Omit<WorkExperienceDto, 'documents'> & {
    documents: WorkExperienceDocumentPublicDto[];
  } {
    const dto = this.mapToDto(exp);
    return {
      ...dto,
      documents: dto.documents.map((doc) => toWorkExperienceDocumentPublicDto(doc)),
    };
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

    const letterValidation = validateWorkExperienceLetterRules({
      isCurrent: data.isCurrent,
      endDate: data.endDate,
      documents: data.documents,
    });
    if (!letterValidation.valid) {
      throw new BadRequestException({
        error: 'validation_error',
        message: letterValidation.message || 'Required proof documents are missing.',
        statusCode: 400,
        details: { missingDocuments: letterValidation.missingDocuments },
      });
    }

    const rawName = data.companyName.trim();
    const org = await this.resolveOrganization({
      name: rawName,
      website: data.companyWebsite,
      verifierEmail: data.verifierEmail,
    });

    // Optional company lookup to associate companyId if company matches catalog
    let matchedCompanyId: string | null = data.companyId ?? null;
    if (!matchedCompanyId) {
      const linkedCompany = await this.prisma.company.findFirst({
        where: { organizationId: org.id },
      });
      if (linkedCompany) {
        matchedCompanyId = linkedCompany.id;
      }
    }
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

    await this.assertCompanyPublicIdentity({
      companyId: data.companyId,
      companyWebsite: data.companyWebsite,
      companyLinkedinUrl: data.companyLinkedinUrl,
      matchedCompanyId,
    });

    const created = await this.prisma.workExperience.create({
      data: {
        studentId,
        organizationId: org.id,
        companyNameRaw: rawName,
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
        skills: data.skillsClaimed,
        projects: (data.projects as Prisma.InputJsonValue) ?? null,
        candidateLinkedin: data.candidateLinkedin || null,
        verifierName: data.verifierName || null,
        verifierEmail: data.verifierEmail || null,
        verifierDesignation: data.verifierDesignation || null,
        verifierPhone: data.verifierPhone || null,
        status: 'SUBMITTED',
        ...(data.documents && data.documents.length > 0
          ? {
              documents: {
                create: data.documents.map((doc) => ({
                  documentType: doc.documentType,
                  fileUrl: doc.fileUrl,
                  fileName: doc.fileName,
                  fileSizeBytes: doc.fileSizeBytes,
                  mimeType: doc.mimeType,
                })),
              },
            }
          : {}),
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

    const effectiveIsCurrent = data.isCurrent !== undefined ? data.isCurrent : existing.isCurrent;
    const effectiveEndDate =
      data.endDate !== undefined
        ? data.endDate
        : existing.endDate
          ? existing.endDate.toISOString()
          : null;
    const effectiveDocs =
      data.documents && data.documents.length > 0 ? data.documents : existing.documents;

    const letterValidation = validateWorkExperienceLetterRules({
      isCurrent: effectiveIsCurrent,
      endDate: effectiveEndDate,
      documents: effectiveDocs,
    });
    if (!letterValidation.valid) {
      throw new BadRequestException({
        error: 'validation_error',
        message: letterValidation.message || 'Required proof documents are missing.',
        statusCode: 400,
        details: { missingDocuments: letterValidation.missingDocuments },
      });
    }

    if (
      existing.status === 'VERIFIED' &&
      data.skillsClaimed !== undefined &&
      JSON.stringify(data.skillsClaimed) !== JSON.stringify(existing.skills ?? [])
    ) {
      throw new BadRequestException({
        error: 'conflict',
        message: 'Skills cannot be changed on a verified work experience entry.',
        statusCode: 400,
      });
    }

    let updatedOrgId: string | undefined = undefined;
    let updatedCompanyNameRaw: string | undefined = undefined;

    if (
      data.companyName !== undefined ||
      data.companyWebsite !== undefined ||
      data.verifierEmail !== undefined
    ) {
      const nameToUse = data.companyName ?? existing.companyName;
      const websiteToUse =
        data.companyWebsite !== undefined ? data.companyWebsite : existing.companyWebsite;
      const verifierEmailToUse =
        data.verifierEmail !== undefined ? data.verifierEmail : existing.verifierEmail;

      const org = await this.resolveOrganization({
        name: nameToUse,
        website: websiteToUse,
        verifierEmail: verifierEmailToUse,
      });
      updatedOrgId = org.id;
      updatedCompanyNameRaw = nameToUse.trim();
    }

    const effectiveCompanyWebsite =
      data.companyWebsite !== undefined ? data.companyWebsite : existing.companyWebsite;
    const effectiveCompanyLinkedinUrl =
      data.companyLinkedinUrl !== undefined ? data.companyLinkedinUrl : existing.companyLinkedinUrl;
    const effectiveCompanyId = data.companyId !== undefined ? data.companyId : existing.companyId;

    await this.assertCompanyPublicIdentity({
      companyId: effectiveCompanyId,
      companyWebsite: effectiveCompanyWebsite,
      companyLinkedinUrl: effectiveCompanyLinkedinUrl,
      matchedCompanyId: effectiveCompanyId,
    });

    const updated = await this.prisma.workExperience.update({
      where: { id },
      data: {
        ...(updatedOrgId !== undefined ? { organizationId: updatedOrgId } : {}),
        ...(updatedCompanyNameRaw !== undefined ? { companyNameRaw: updatedCompanyNameRaw } : {}),
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
        ...(data.skillsClaimed !== undefined ? { skills: data.skillsClaimed } : {}),
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

    const checked = await this.runDocumentAuthenticityCheck(existing, doc.id);
    return this.mapDocumentToDto(checked);
  }

  /**
   * WE-T02 — OCR + heuristics after upload. Anomaly flags only; never auto-fraud.
   */
  async runDocumentAuthenticityCheck(
    experience: Pick<RawWorkExperience, 'id' | 'companyName' | 'companyWebsite' | 'studentId'>,
    documentId: string,
    rawTextOverride?: string,
  ): Promise<RawWorkExperienceDocument> {
    const doc = await this.prisma.workExperienceDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || doc.experienceId !== experience.id) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Document attachment not found.',
        statusCode: 404,
      });
    }

    const checkedAt = new Date().toISOString();
    let rawText = '';
    let rawTextLength = 0;

    try {
      if (rawTextOverride && env.NODE_ENV === 'test') {
        rawText = rawTextOverride.trim();
      } else {
        const buffer = await this.retrieveFileBuffer(doc.fileUrl);
        rawText = this.extractDocumentContent(buffer, doc.mimeType, doc.fileName);
      }
      rawTextLength = rawText.length;
    } catch {
      const authenticity = {
        status: 'doc_flagged' as const,
        result: {
          companyNameMatch: false,
          domainMatch: false,
          hasLetterhead: false,
          hasSignatureBlock: false,
          ocrConfidence: 0,
          flagReasons: ['ILLEGIBLE: document text could not be extracted'],
        },
        checkedAt,
      };
      const updated = await this.prisma.workExperienceDocument.update({
        where: { id: documentId },
        data: {
          validationResult: mergeAuthenticityIntoValidationResult(
            doc.validationResult,
            authenticity,
          ) as Prisma.InputJsonValue,
        },
      });
      await this.auditPublisher.record({
        actorId: experience.studentId,
        action: 'WORK_EXPERIENCE_DOCUMENT_AUTHENTICITY_CHECKED',
        resourceType: 'WorkExperienceDocument',
        resourceId: documentId,
        reasonCode: 'doc_flagged',
      });
      return updated as RawWorkExperienceDocument;
    }

    let extracted;
    try {
      const aiCompletion = await this.aiGateway.complete({
        promptRef: 'work-experience-letter-authenticity@1',
        modelRole: 'PRIMARY_REASONING',
        priority: 'P1_REALTIME',
        variables: {
          rawText,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
          claimedCompanyName: experience.companyName,
        },
        correlation: {},
        maxOutputTokens: 2_048,
        temperature: 0,
      });
      const parsed = WorkExperienceLetterAuthenticityExtractSchema.safeParse(aiCompletion.output);
      if (!parsed.success) {
        throw new Error('Malformed AI authenticity response');
      }
      extracted = parsed.data;
    } catch {
      const authenticity = {
        status: 'doc_flagged' as const,
        result: {
          companyNameMatch: false,
          domainMatch: false,
          hasLetterhead: false,
          hasSignatureBlock: false,
          ocrConfidence: 0,
          flagReasons: ['ILLEGIBLE: authenticity extraction unavailable'],
        },
        checkedAt,
      };
      const updated = await this.prisma.workExperienceDocument.update({
        where: { id: documentId },
        data: {
          validationResult: mergeAuthenticityIntoValidationResult(
            doc.validationResult,
            authenticity,
          ) as Prisma.InputJsonValue,
        },
      });
      await this.auditPublisher.record({
        actorId: experience.studentId,
        action: 'WORK_EXPERIENCE_DOCUMENT_AUTHENTICITY_CHECKED',
        resourceType: 'WorkExperienceDocument',
        resourceId: documentId,
        reasonCode: 'doc_flagged',
      });
      return updated as RawWorkExperienceDocument;
    }

    const evaluation = evaluateLetterAuthenticity({
      claimedCompanyName: experience.companyName,
      claimedCompanyWebsite: experience.companyWebsite ?? null,
      extracted,
      rawTextLength,
    });

    const authenticity = {
      status: evaluation.status,
      result: evaluation.result,
      checkedAt,
    };

    const updated = await this.prisma.workExperienceDocument.update({
      where: { id: documentId },
      data: {
        validationResult: mergeAuthenticityIntoValidationResult(
          doc.validationResult,
          authenticity,
        ) as Prisma.InputJsonValue,
      },
    });

    await this.auditPublisher.record({
      actorId: experience.studentId,
      action: 'WORK_EXPERIENCE_DOCUMENT_AUTHENTICITY_CHECKED',
      resourceType: 'WorkExperienceDocument',
      resourceId: documentId,
      reasonCode: evaluation.status,
    });

    return updated as RawWorkExperienceDocument;
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

  async validateProofDocument(
    studentId: string,
    id: string,
    documentId: string,
    rawTextOverride?: string,
  ): Promise<ValidateWorkExperienceProofResponse> {
    const experience = await this.prisma.workExperience.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!experience || experience.studentId !== studentId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Work experience entry not found.',
        statusCode: 404,
      });
    }

    const doc = experience.documents.find((d) => d.id === documentId);
    if (!doc) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Document attachment not found.',
        statusCode: 404,
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (isInvalidEmploymentProofAttachmentType(doc.documentType)) {
      return this.persistProofValidationResult({
        experience,
        documentId,
        studentId,
        validationStatus: 'REJECTED',
        reasonCode: 'INVALID_DOCUMENT_TYPE',
        rejectionReason: INVALID_EMPLOYMENT_PROOF_MESSAGE,
        documentType: doc.documentType,
        isOfferLetter: true,
        extractedData: {
          documentType: doc.documentType as 'OFFER_LETTER',
          isActualEmploymentProof: false,
          candidateName: null,
          companyName: null,
          role: null,
          startDate: null,
          endDate: null,
          confidence: 0,
        },
        matchResult: {
          candidateNameMatch: false,
          companyNameMatch: false,
          roleMatch: false,
          dateMatch: false,
        },
        updateExperienceOnReject: false,
      });
    }

    let rawText = '';
    if (rawTextOverride && env.NODE_ENV === 'test') {
      rawText = rawTextOverride.trim();
    } else {
      const buffer = await this.retrieveFileBuffer(doc.fileUrl);
      rawText = this.extractDocumentContent(buffer, doc.mimeType, doc.fileName);
    }

    let aiCompletion;
    try {
      aiCompletion = await this.aiGateway.complete({
        promptRef: 'work-experience-proof-parse@1',
        modelRole: 'PRIMARY_REASONING',
        priority: 'P1_REALTIME',
        variables: {
          rawText,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
        },
        correlation: {},
        maxOutputTokens: 4_096,
        temperature: 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException({
        error: 'ai_service_error',
        message: `Proof document validation service unavailable: ${message}`,
        statusCode: 400,
      });
    }

    const parsedOutput = WorkExperienceProofExtractedDataSchema.safeParse(aiCompletion.output);
    if (!parsedOutput.success) {
      throw new BadRequestException({
        error: 'malformed_ai_response',
        message: 'AI gateway produced unparseable classification response.',
        statusCode: 400,
      });
    }

    const extracted = parsedOutput.data;
    const isOfferLetter = extracted.documentType === 'OFFER_LETTER';
    const isActualEmploymentProof = extracted.isActualEmploymentProof;

    // Strict Field matching rules
    const normExtractedCompany = normalizeCompanyName(extracted.companyName);
    const normSubmittedCompany = normalizeCompanyName(experience.companyName);
    const companyNameMatch =
      Boolean(normExtractedCompany && normSubmittedCompany) &&
      (normExtractedCompany.includes(normSubmittedCompany) ||
        normSubmittedCompany.includes(normExtractedCompany));

    const normExtractedCandidate = normalizeText(extracted.candidateName);
    const normStudentName = normalizeText(user?.fullName);
    const candidateNameMatch =
      Boolean(normExtractedCandidate && normStudentName) &&
      (normExtractedCandidate.includes(normStudentName) ||
        normStudentName.includes(normExtractedCandidate));

    const normExtractedRole = normalizeText(extracted.role);
    const normSubmittedRole = normalizeText(experience.role);
    const roleMatch =
      Boolean(normExtractedRole && normSubmittedRole) &&
      (normExtractedRole.includes(normSubmittedRole) ||
        normSubmittedRole.includes(normExtractedRole));

    const dateMatch = Boolean(extracted.startDate || extracted.endDate);

    const matchResult = {
      candidateNameMatch,
      companyNameMatch,
      roleMatch,
      dateMatch,
    };

    let validationStatus: 'VALIDATED' | 'REJECTED' | 'NEEDS_MANUAL_REVIEW' = 'VALIDATED';
    let rejectionReason: string | null = null;
    let reasonCode: WorkExperienceProofReasonCode = 'PROOF_VALIDATED';
    let updateExperienceOnReject = true;

    if (
      isInvalidEmploymentProofClassification({
        documentType: extracted.documentType,
        isActualEmploymentProof,
        isOfferLetter,
      })
    ) {
      validationStatus = 'REJECTED';
      rejectionReason = INVALID_EMPLOYMENT_PROOF_MESSAGE;
      reasonCode = 'INVALID_DOCUMENT_TYPE';
      updateExperienceOnReject = false;
    } else if (!companyNameMatch) {
      validationStatus = 'REJECTED';
      rejectionReason = `Document company name (${extracted.companyName ?? 'Unknown'}) does not match submitted company (${experience.companyName}).`;
      reasonCode = 'PROOF_REJECTED';
    } else if (!candidateNameMatch) {
      validationStatus = 'REJECTED';
      rejectionReason = `Document candidate name (${extracted.candidateName ?? 'Unknown'}) does not match student name (${user?.fullName ?? 'Student'}).`;
      reasonCode = 'PROOF_REJECTED';
    } else if (!roleMatch || !dateMatch || extracted.confidence < 0.75) {
      validationStatus = 'NEEDS_MANUAL_REVIEW';
      const variances: string[] = [];
      if (!roleMatch)
        variances.push(`Role variance (${extracted.role ?? 'Unknown'} vs ${experience.role})`);
      if (!dateMatch) variances.push('Employment dates variance');
      if (extracted.confidence < 0.75)
        variances.push(`Low OCR confidence (${extracted.confidence})`);
      rejectionReason = `NEEDS_MANUAL_REVIEW: ${variances.join('; ')}. Flagged for manual review.`;
      reasonCode = 'NEEDS_MANUAL_REVIEW';
    }

    return this.persistProofValidationResult({
      experience,
      documentId,
      studentId,
      validationStatus,
      reasonCode,
      rejectionReason,
      documentType: extracted.documentType,
      isOfferLetter,
      extractedData: extracted,
      matchResult,
      updateExperienceOnReject,
    });
  }

  private async persistProofValidationResult(params: {
    experience: RawWorkExperience;
    documentId: string;
    studentId: string;
    validationStatus: 'VALIDATED' | 'REJECTED' | 'NEEDS_MANUAL_REVIEW';
    reasonCode: WorkExperienceProofReasonCode;
    rejectionReason: string | null;
    documentType: string;
    isOfferLetter: boolean;
    extractedData: {
      documentType: string;
      isActualEmploymentProof: boolean;
      candidateName: string | null;
      companyName: string | null;
      role: string | null;
      startDate: string | null;
      endDate: string | null;
      confidence: number;
    };
    matchResult: {
      candidateNameMatch: boolean;
      companyNameMatch: boolean;
      roleMatch: boolean;
      dateMatch: boolean;
    };
    updateExperienceOnReject: boolean;
  }): Promise<ValidateWorkExperienceProofResponse> {
    const validatedAt = new Date().toISOString();
    const validationResult = {
      validationStatus: params.validationStatus,
      documentType: params.documentType,
      isOfferLetter: params.isOfferLetter,
      extractedData: params.extractedData,
      matchResult: params.matchResult,
      rejectionReason: params.rejectionReason,
      reasonCode: params.reasonCode,
      validatedAt,
    };

    await this.prisma.workExperienceDocument.update({
      where: { id: params.documentId },
      data: {
        validationStatus: params.validationStatus,
        validationResult: validationResult as Prisma.InputJsonValue,
      },
    });

    let updatedExperienceStatus = params.experience.status;
    if (params.validationStatus === 'REJECTED' && params.updateExperienceOnReject) {
      const updatedExp = await this.prisma.workExperience.update({
        where: { id: params.experience.id },
        data: {
          status: 'REJECTED',
          rejectionReason: params.rejectionReason,
        },
      });
      updatedExperienceStatus = updatedExp.status;
    }

    await this.auditPublisher.record({
      actorId: params.studentId,
      action: 'WORK_EXPERIENCE_UPDATED',
      resourceType: 'WorkExperienceDocument',
      resourceId: params.documentId,
      reasonCode: params.reasonCode,
    });

    return ValidateWorkExperienceProofResponseSchema.parse({
      experienceId: params.experience.id,
      documentId: params.documentId,
      experienceStatus: updatedExperienceStatus,
      validationResult,
    });
  }

  private async assertCompanyPublicIdentity(params: {
    companyId?: string | null;
    companyWebsite?: string | null;
    companyLinkedinUrl?: string | null;
    matchedCompanyId?: string | null;
  }): Promise<void> {
    let catalogWebsite: string | null = null;
    let catalogLinkedin: string | null = null;
    const resolvedCompanyId = params.matchedCompanyId ?? params.companyId ?? null;
    if (resolvedCompanyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: resolvedCompanyId },
      });
      catalogWebsite = company?.website ?? null;
      catalogLinkedin = company?.linkedinUrl ?? null;
    }

    const required = companyRequiresPublicIdentity({
      companyId: resolvedCompanyId,
      companyWebsite: params.companyWebsite,
      catalogCompanyWebsite: catalogWebsite,
      catalogCompanyLinkedinUrl: catalogLinkedin,
    });
    const result = validateCompanyPublicIdentity({
      companyWebsite: params.companyWebsite,
      companyLinkedinUrl: params.companyLinkedinUrl,
      required,
    });
    if (!result.valid) {
      throw new BadRequestException({
        error: 'validation_error',
        message: result.message,
        statusCode: 400,
      });
    }
  }

  /**
   * Helper to retrieve actual physical file buffer from fileUrl.
   * Supports Data URIs, HTTP/HTTPS URLs, and local filesystem paths.
   */
  private async retrieveFileBuffer(fileUrl: string): Promise<Buffer> {
    if (!fileUrl || typeof fileUrl !== 'string') {
      throw new BadRequestException({
        error: 'invalid_file_url',
        message: 'Invalid document fileUrl reference.',
        statusCode: 400,
      });
    }

    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

    // 1. Data URI
    if (fileUrl.startsWith('data:')) {
      try {
        const parts = fileUrl.split(',');
        const base64Data = parts[1];
        if (!base64Data) throw new Error('Malformed data URI payload');
        const buf = Buffer.from(base64Data, 'base64');
        if (buf.length > MAX_FILE_SIZE_BYTES) {
          throw new Error('Decoded data URI file size exceeds 5MB limit');
        }
        return buf;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new BadRequestException({
          error: 'data_uri_parse_failed',
          message: `Failed to decode base64 data URI document content: ${msg}`,
          statusCode: 400,
        });
      }
    }

    // 2. HTTP/HTTPS URL
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) {
          throw new Error(`HTTP fetch failed with status ${res.status}`);
        }
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (buf.length > MAX_FILE_SIZE_BYTES) {
          throw new Error('Retrieved file size exceeds 5MB limit');
        }
        return buf;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new BadRequestException({
          error: 'file_retrieval_failed',
          message: `Proof document file could not be retrieved from remote URL: ${msg}`,
          statusCode: 400,
        });
      }
    }

    // 3. Local filesystem path
    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      const storageRoot = path.resolve(process.cwd(), 'storage');
      const resolvedPath = path.isAbsolute(fileUrl)
        ? path.resolve(fileUrl)
        : fileUrl.startsWith('storage/') || fileUrl.startsWith('storage\\')
          ? path.resolve(process.cwd(), fileUrl)
          : path.resolve(storageRoot, fileUrl);

      const relativePath = path.relative(storageRoot, resolvedPath);
      const isContained = !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

      if (!isContained) {
        throw new Error(
          `Path traversal detected or access outside storage directory forbidden: ${fileUrl}`,
        );
      }

      const stat = await fs.stat(resolvedPath);
      if (stat.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Local file size (${stat.size} bytes) exceeds 5MB limit`);
      }

      const buf = await fs.readFile(resolvedPath);
      if (buf.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Local file size (${buf.length} bytes) exceeds 5MB limit`);
      }
      return buf;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException({
        error: 'file_retrieval_failed',
        message: `Proof document file could not be retrieved from local path (${fileUrl}): ${msg}`,
        statusCode: 400,
      });
    }
  }

  /**
   * Helper to extract document text content from file buffer.
   */
  private extractDocumentContent(
    buffer: Buffer,
    _mimeType?: string | null,
    _fileName?: string | null,
  ): string {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException({
        error: 'empty_document_buffer',
        message: 'Retrieved document file buffer is empty.',
        statusCode: 400,
      });
    }

    const rawString = buffer.toString('utf-8');
    const runs: string[] = [];
    let current = '';

    for (let i = 0; i < rawString.length; i++) {
      const code = rawString.charCodeAt(i);
      const printable = code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
      if (printable) {
        current += rawString[i];
      } else if (current.length >= 4) {
        runs.push(current.trim());
        current = '';
      } else {
        current = '';
      }
    }
    if (current.length >= 4) runs.push(current.trim());

    const extractedText = runs.join(' ').replace(/\s+/g, ' ').trim();

    if (extractedText.length < 20) {
      throw new BadRequestException({
        error: 'insufficient_extracted_content',
        message:
          'Extracted text from proof document is empty or insufficient for validation (min 20 characters required).',
        statusCode: 400,
      });
    }

    return extractedText;
  }

  /**
   * Phase 3: Trigger employer verification flow for a work experience entry.
   * Generates secure random 32-byte token, hashes it with SHA-256 before saving to DB,
   * sets experience status to PENDING_EMPLOYER, sends email, and logs audit event.
   */
  async sendEmployerVerification(
    studentId: string,
    experienceId: string,
  ): Promise<SendWorkExperienceVerificationResponseDto> {
    const exp = await this.prisma.workExperience.findUnique({
      where: { id: experienceId },
      include: { student: true, organization: true },
    });

    if (!exp) {
      throw new NotFoundException('Work experience record not found.');
    }
    if (exp.studentId !== studentId) {
      throw new NotFoundException('Work experience record not found.');
    }
    if (!exp.verifierEmail) {
      throw new BadRequestException(
        'Verifier email is required to send verification. Please update work experience entry with verifier details.',
      );
    }

    if (isDisallowedEndorserEmailDomain(exp.verifierEmail)) {
      throw new BadRequestException(
        `Verifier email (${exp.verifierEmail}) uses a free or personal email provider. An official corporate email domain is required for employer verification.`,
      );
    }

    const targetDomain =
      exp.companyWebsite ||
      (exp.organization?.domain ? `https://${exp.organization.domain}` : null);
    const domainValidation = validateEmployerDomain(exp.verifierEmail, targetDomain);
    if (targetDomain && !domainValidation.domainMatch) {
      throw new BadRequestException(
        `Verifier email domain does not match company website domain (${targetDomain}).`,
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const attempt = await this.prisma.workExperienceVerificationAttempt.create({
      data: {
        experienceId,
        tokenHash,
        verifierEmail: exp.verifierEmail,
        expiresAt,
      },
    });

    const updated = await this.prisma.workExperience.update({
      where: { id: experienceId },
      data: {
        status: 'PENDING_EMPLOYER',
        rejectionReason: null,
      },
    });

    const verificationUrl = `${env.VERIFY_APP_URL}/work-experience/${rawToken}`;

    if (this.emailQueue) {
      await this.emailQueue.add('send', {
        to: exp.verifierEmail,
        template: 'work-experience-verifier-invite',
        data: {
          verifierName: exp.verifierName || 'Hiring Manager / HR',
          candidateName: exp.student?.fullName || 'Candidate',
          companyName: exp.companyName,
          roleTitle: exp.role,
          startDate: exp.startDate.toISOString().substring(0, 10),
          endDate: exp.isCurrent
            ? 'Present'
            : exp.endDate
              ? exp.endDate.toISOString().substring(0, 10)
              : 'N/A',
          verificationUrl,
          expiresAtFormatted: '48 hours',
        },
      });

      await this.emailQueue.add(
        'send-reminder',
        {
          to: exp.verifierEmail,
          template: 'work-experience-verifier-reminder',
          data: {
            verifierName: exp.verifierName || 'Hiring Manager / HR',
            candidateName: exp.student?.fullName || 'Candidate',
            companyName: exp.companyName,
            roleTitle: exp.role,
            verificationUrl,
            expiresAtFormatted: '42 hours',
          },
          attemptId: attempt.id,
        } as WorkExperienceReminderJobPayload,
        { delay: 6 * 60 * 60 * 1000 },
      );

      await this.emailQueue.add(
        'expire-verification',
        {
          attemptId: attempt.id,
          experienceId,
        } as WorkExperienceExpireJobPayload,
        { delay: 48 * 60 * 60 * 1000 },
      );
    }

    await this.auditPublisher.record({
      actorId: studentId,
      action: 'WORK_EXPERIENCE_EMPLOYER_VERIFICATION_SENT',
      resourceType: 'WorkExperience',
      resourceId: experienceId,
      reasonCode: 'employer_verification_sent',
      metadata: {
        attemptId: attempt.id,
        verifierEmail: exp.verifierEmail,
        verifierDomain: domainValidation.verifierDomain,
        companyDomain: domainValidation.companyDomain,
        domainMatch: domainValidation.domainMatch,
      },
    });

    return {
      success: true,
      experienceId,
      status: updated.status as WorkExperienceVerificationStatus,
      message: `Employer verification request dispatched to ${exp.verifierEmail}.`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Phase 3: Public endpoint to fetch verification details by raw token.
   * Hashes incoming raw token with SHA-256 and retrieves attempt & experience info.
   */
  async getVerificationByToken(
    rawToken: string,
  ): Promise<GetWorkExperienceVerificationResponseDto> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new NotFoundException('Invalid verification token.');
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const attempt = await this.prisma.workExperienceVerificationAttempt.findUnique({
      where: { tokenHash },
      include: {
        experience: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!attempt || !attempt.experience) {
      throw new NotFoundException('Invalid or expired verification token.');
    }

    const exp = attempt.experience;
    const now = new Date();
    const isExpired = attempt.expiresAt < now;
    const isAlreadyResponded = attempt.respondedAt !== null;

    return {
      experienceId: exp.id,
      candidateName: exp.student?.fullName || 'Candidate',
      companyName: exp.companyName,
      role: exp.role,
      employmentType: exp.employmentType as WorkExperienceDto['employmentType'],
      startDate: exp.startDate.toISOString().substring(0, 10),
      endDate: exp.endDate ? exp.endDate.toISOString().substring(0, 10) : null,
      isCurrent: exp.isCurrent,
      responsibilities: exp.responsibilities ?? null,
      verifierName: exp.verifierName ?? null,
      verifierEmail: attempt.verifierEmail,
      verifierDesignation: exp.verifierDesignation ?? null,
      status: exp.status as WorkExperienceVerificationStatus,
      expiresAt: attempt.expiresAt.toISOString(),
      isExpired,
      isAlreadyResponded,
    };
  }

  /**
   * Phase 3: Public endpoint for employer to submit verification decision (approve/reject).
   */
  async submitEmployerVerification(
    rawToken: string,
    payload: SubmitWorkExperienceVerificationDto,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<SubmitWorkExperienceVerificationResponseDto> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new NotFoundException('Invalid verification token.');
    }

    const parsed = SubmitWorkExperienceVerificationSchema.parse(payload);
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const attempt = await this.prisma.workExperienceVerificationAttempt.findUnique({
      where: { tokenHash },
      include: { experience: true },
    });

    if (!attempt || !attempt.experience) {
      throw new NotFoundException('Invalid or expired verification token.');
    }

    if (attempt.respondedAt !== null) {
      throw new BadRequestException('This verification link has already been used.');
    }

    if (attempt.expiresAt < new Date()) {
      throw new BadRequestException('This verification link has expired.');
    }

    const exp = attempt.experience;
    const now = new Date();
    const decision = parsed.decision || (parsed.approved ? 'YES' : 'NO');
    let newStatus: WorkExperienceVerificationStatus = 'REJECTED';
    let rejectionReason: string | null = null;
    let approved = false;

    if (decision === 'YES') {
      approved = true;
      newStatus = 'VERIFIED';
    } else if (decision === 'PARTIAL') {
      approved = true;
      newStatus = 'VERIFIED';
      rejectionReason = parsed.comments || 'Verified with partial notes';
    } else if (decision === 'NEED_CLARIFICATION') {
      approved = false;
      newStatus = 'SUBMITTED';
      rejectionReason = parsed.comments || 'Employer requested clarification';
    } else {
      approved = false;
      newStatus = 'REJECTED';
      rejectionReason = parsed.comments || 'Rejected by employer verifier';
    }

    await this.prisma.$transaction([
      this.prisma.workExperienceVerificationAttempt.update({
        where: { id: attempt.id },
        data: {
          respondedAt: now,
          approved,
          comments: parsed.comments || null,
          ipAddress: meta?.ip || null,
          userAgent: meta?.userAgent || null,
        },
      }),
      this.prisma.workExperience.update({
        where: { id: exp.id },
        data: {
          status: newStatus,
          rejectionReason,
        },
      }),
    ]);

    await this.auditPublisher.record({
      actorId: null,
      action: parsed.approved
        ? 'WORK_EXPERIENCE_EMPLOYER_VERIFICATION_APPROVED'
        : 'WORK_EXPERIENCE_EMPLOYER_VERIFICATION_REJECTED',
      resourceType: 'WorkExperience',
      resourceId: exp.id,
      reasonCode: parsed.approved ? 'employer_verified' : 'employer_rejected',
      metadata: {
        attemptId: attempt.id,
        approved: parsed.approved,
        comments: parsed.comments ?? null,
      },
    });

    return {
      success: true,
      status: newStatus,
      message: parsed.approved
        ? 'Work experience successfully verified.'
        : 'Work experience rejected.',
    };
  }

  /**
   * Restarts employer verification by invalidating prior attempts and creating a brand new attempt row.
   */
  async restartEmployerVerification(
    studentId: string,
    experienceId: string,
  ): Promise<SendWorkExperienceVerificationResponseDto> {
    const exp = await this.prisma.workExperience.findUnique({
      where: { id: experienceId },
      include: { student: true },
    });

    if (!exp || exp.studentId !== studentId) {
      throw new NotFoundException('Work experience record not found.');
    }

    if (!exp.verifierEmail) {
      throw new BadRequestException('Verifier email is required to restart verification.');
    }

    return this.sendEmployerVerification(studentId, experienceId);
  }

  /**
   * Fetches Ops Dashboard items for tracking candidate work experience verifications.
   */
  async getOpsDashboard(): Promise<WorkExperienceOpsDashboardItemDto[]> {
    const experiences = await this.prisma.workExperience.findMany({
      include: {
        student: true,
        documents: true,
        verificationAttempts: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return experiences.map((exp) => {
      const attempts = exp.verificationAttempts || [];
      const latestAttempt = attempts[0] || null;

      let currentStep = 'SUBMITTED';
      if (exp.status === 'VERIFIED') {
        currentStep = 'VERIFIED';
      } else if (exp.status === 'REJECTED') {
        currentStep = 'REJECTED';
      } else if (exp.status === 'EXPIRED') {
        currentStep = 'EXPIRED';
      } else if (exp.status === 'PENDING_EMPLOYER') {
        currentStep = latestAttempt?.reminderSentAt ? 'REMINDER_SENT' : 'EMPLOYER_DISPATCHED';
      }

      let emailState = 'NOT_SENT';
      if (latestAttempt) {
        if (latestAttempt.respondedAt) {
          emailState = 'RESPONDED';
        } else if (latestAttempt.expiresAt < now) {
          emailState = 'EXPIRED';
        } else if (latestAttempt.reminderSentAt) {
          emailState = 'REMINDER_SENT';
        } else {
          emailState = 'SENT';
        }
      }

      let timeRemainingHours = 0;
      if (latestAttempt && !latestAttempt.respondedAt && latestAttempt.expiresAt > now) {
        timeRemainingHours = Math.max(
          0,
          Math.round((latestAttempt.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)),
        );
      }

      const flaggedDocumentCount = (exp.documents ?? []).filter(
        (document) =>
          parseStoredDocumentAuthenticity(document.validationResult).status === 'doc_flagged',
      ).length;
      const hasValidatedProof = (exp.documents ?? []).some(
        (document) => document.validationStatus === 'VALIDATED',
      );

      const nextAction = deriveWorkExperienceNextAction({
        status: exp.status as WorkExperienceVerificationStatus,
        currentStep,
        emailState,
        timeRemainingHours,
        hasFlaggedDocuments: flaggedDocumentCount > 0,
        hasValidatedProof,
        hasVerifierEmail: Boolean(exp.verifierEmail),
      });

      return {
        experienceId: exp.id,
        candidateId: exp.studentId,
        candidateName: exp.student?.fullName || 'Candidate',
        candidateEmail: exp.student?.email || '',
        companyName: exp.companyName,
        companyWebsite: exp.companyWebsite ?? null,
        role: exp.role,
        status: exp.status as WorkExperienceVerificationStatus,
        currentStep,
        emailState,
        timeRemainingHours,
        flaggedDocumentCount,
        hasFlaggedDocuments: flaggedDocumentCount > 0,
        nextAction,
        createdAt: exp.createdAt.toISOString(),
      };
    });
  }

  /**
   * SA-T08 — extends the v0.9 fraud/void action (previously assessment-attempt only, see
   * `AssessmentService.resolveIntegrity`) to a work-experience row. One-directional: there is
   * no "un-void". The status flip alone is enough to drop it from the public profile —
   * `PublicProfileService.build()` only ever includes VERIFIED (or, opted-in, not-yet-decided,
   * never VOIDED) rows.
   */
  /* ---- WE-T03: Manager endorsement ---- */

  /**
   * WE-T03: Extract a domain from the offer-letter (the document with documentType='OFFER_LETTER')
   * validationResult JSON field.  Falls back to Organization.domain or companyWebsite.
   */
  private extractOfferLetterDomain(exp: {
    companyWebsite?: string | null;
    organization?: { domain?: string | null } | null;
    documents?: Array<{
      documentType: string;
      validationResult?: unknown;
    }> | null;
  }): string | null {
    // 1. Try offer-letter extraction result
    if (exp.documents) {
      for (const doc of exp.documents) {
        if (doc.documentType === 'OFFER_LETTER' && doc.validationResult) {
          const r = doc.validationResult as Record<string, unknown>;
          const extracted = r['extractedData'] as Record<string, unknown> | undefined;
          const explicitDomain = extracted?.['domain'] || extracted?.['companyWebsite'];
          if (explicitDomain) {
            const d = extractDomain(String(explicitDomain));
            if (d) return d;
          }
          const company = String(extracted?.['companyName'] ?? '');
          if (company && (company.includes('.') || company.includes('http'))) {
            const d = extractDomain(company);
            if (d) return d;
          }
        }
      }
    }
    // 2. Organization.domain
    if (exp.organization?.domain) return exp.organization.domain;
    // 3. Company website
    if (exp.companyWebsite) return extractDomain(exp.companyWebsite);
    return null;
  }

  /**
   * WE-T03: Student triggers a manager endorsement email.
   * - Validates manager email is a corporate domain (not gmail/yahoo etc.)
   * - Validates domain matches offer-letter domain or Organization.domain
   * - Generates 32-byte secure token, stores SHA-256 hash
   * - 5-day (120h) TTL; schedules 3-day (72h) reminder + 5-day expiry job
   */
  async sendManagerEndorsement(
    studentId: string,
    experienceId: string,
    payload: SendManagerEndorsementDto,
  ): Promise<SendManagerEndorsementResponseDto> {
    const exp = await this.prisma.workExperience.findUnique({
      where: { id: experienceId },
      include: {
        student: true,
        organization: true,
        documents: {
          select: { documentType: true, validationResult: true },
        },
      },
    });

    if (!exp || exp.studentId !== studentId) {
      throw new NotFoundException('Work experience record not found.');
    }

    const managerEmail = payload.managerEmail.toLowerCase().trim();

    // 1. Reject personal / free email providers
    if (isDisallowedEndorserEmailDomain(managerEmail)) {
      throw new BadRequestException(
        `Manager email (${managerEmail}) uses a free or personal email provider. A corporate email is required for endorsement.`,
      );
    }

    // 2. Domain matching: extract authoritative employer domain
    const resolvedDomain = this.extractOfferLetterDomain(exp);
    if (resolvedDomain) {
      const domainValidation = validateEmployerDomain(managerEmail, `https://${resolvedDomain}`);
      if (!domainValidation.domainMatch) {
        throw new BadRequestException(
          `Manager email domain (${domainValidation.verifierDomain}) does not match employer domain (${resolvedDomain}). Please use your official company email.`,
        );
      }
    }

    // 3. Generate single-use token (hash stored; raw sent in email)
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const TTL_120H = 120 * 60 * 60 * 1000; // 5 days
    const expiresAt = new Date(Date.now() + TTL_120H);

    const endorsement = await this.prisma.workExperienceManagerEndorsement.create({
      data: {
        experienceId,
        tokenHash,
        managerEmail,
        managerName: payload.managerName ?? null,
        resolvedDomain: resolvedDomain ?? null,
        expiresAt,
        status: 'PENDING',
      },
    });

    const surveyUrl = `${env.VERIFY_APP_URL}/work-experience/manager-survey/${rawToken}`;
    const emailData = {
      managerName: payload.managerName ?? 'Hiring Manager',
      candidateName: exp.student?.fullName ?? 'Candidate',
      companyName: exp.companyName,
      roleTitle: exp.role,
      startDate: exp.startDate.toISOString().substring(0, 10),
      endDate: exp.isCurrent
        ? 'Present'
        : exp.endDate
          ? exp.endDate.toISOString().substring(0, 10)
          : 'N/A',
      surveyUrl,
      expiresAtFormatted: '5 days',
    };

    if (this.emailQueue) {
      // Initial invite
      await this.emailQueue.add('send', {
        to: managerEmail,
        template: 'work-experience-manager-invite',
        data: emailData,
      });

      // Day-3 (72h) reminder
      await this.emailQueue.add(
        'send-manager-reminder',
        {
          endorsementId: endorsement.id,
          to: managerEmail,
          template: 'work-experience-manager-reminder',
          data: { ...emailData, expiresAtFormatted: '2 days' },
        } as WorkExperienceManagerReminderJobPayload,
        { delay: 72 * 60 * 60 * 1000 },
      );

      // Day-5 (120h) expiry marker
      await this.emailQueue.add(
        'expire-manager-endorsement',
        { endorsementId: endorsement.id, experienceId },
        { delay: TTL_120H },
      );
    }

    await this.auditPublisher.record({
      actorId: studentId,
      action: 'WORK_EXPERIENCE_MANAGER_ENDORSEMENT_SENT',
      resourceType: 'WorkExperience',
      resourceId: experienceId,
      reasonCode: 'manager_endorsement_sent',
      metadata: {
        endorsementId: endorsement.id,
        managerEmail,
        resolvedDomain,
      },
    });

    return {
      success: true,
      endorsementId: endorsement.id,
      managerEmail,
      expiresAt: expiresAt.toISOString(),
      message: `Manager endorsement request dispatched to ${managerEmail}. Valid for 5 days.`,
    };
  }

  /**
   * WE-T03: Public — manager opens magic link to view the survey.
   * Returns minimal candidate info; no excess PII.
   */
  async getManagerEndorsementByToken(rawToken: string): Promise<GetManagerEndorsementSurveyDto> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new NotFoundException('Invalid endorsement token.');
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const endorsement = await this.prisma.workExperienceManagerEndorsement.findUnique({
      where: { tokenHash },
      include: {
        experience: {
          include: { student: { select: { fullName: true } } },
        },
      },
    });

    if (!endorsement || !endorsement.experience) {
      throw new NotFoundException('Invalid or expired endorsement link.');
    }

    const exp = endorsement.experience;
    const now = new Date();
    const isExpired = endorsement.expiresAt < now;
    const isAlreadyResponded = endorsement.respondedAt !== null;

    return {
      endorsementId: endorsement.id,
      candidateName: exp.student?.fullName ?? 'Candidate',
      companyName: exp.companyName,
      role: exp.role,
      employmentType: exp.employmentType as GetManagerEndorsementSurveyDto['employmentType'],
      startDate: exp.startDate.toISOString().substring(0, 10),
      endDate: exp.endDate ? exp.endDate.toISOString().substring(0, 10) : null,
      isCurrent: exp.isCurrent,
      responsibilities: exp.responsibilities ?? null,
      skillsClaimed: (exp.skills ?? []) as string[],
      managerEmail: endorsement.managerEmail,
      managerName: endorsement.managerName ?? null,
      status: endorsement.status as GetManagerEndorsementSurveyDto['status'],
      expiresAt: endorsement.expiresAt.toISOString(),
      isExpired,
      isAlreadyResponded,
    };
  }

  /**
   * WE-T03: Public — manager submits their endorsement decision.
   * Single-use (enforced via respondedAt). Recalculates overall_verified.
   *
   * overall_verified = docOk && completedConfirmed
   * completedConfirmed is set to true only when confirmed === true.
   * Disputed endorsement keeps completedConfirmed = false; overall_verified stays false.
   * Expiry does NOT auto-set any field.
   */
  async submitManagerEndorsement(
    rawToken: string,
    payload: SubmitManagerEndorsementDto,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<SubmitManagerEndorsementResponseDto> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new NotFoundException('Invalid endorsement token.');
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const endorsement = await this.prisma.workExperienceManagerEndorsement.findUnique({
      where: { tokenHash },
      include: { experience: true },
    });

    if (!endorsement || !endorsement.experience) {
      throw new NotFoundException('Invalid or expired endorsement link.');
    }

    if (endorsement.respondedAt !== null) {
      throw new BadRequestException('This endorsement link has already been used.');
    }

    if (endorsement.expiresAt < new Date()) {
      throw new BadRequestException('This endorsement link has expired.');
    }

    const exp = endorsement.experience;
    const now = new Date();
    const newStatus = payload.confirmed ? 'CONFIRMED' : 'DISPUTED';

    // Update endorsement record
    await this.prisma.workExperienceManagerEndorsement.update({
      where: { id: endorsement.id },
      data: {
        respondedAt: now,
        status: newStatus,
        confirmed: payload.confirmed,
        skillRatings: payload.skillRatings
          ? (payload.skillRatings as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        comments: payload.comments ?? null,
        ipAddress: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    // Recalculate overall_verified
    const completedConfirmed = payload.confirmed === true;
    // docOk: check if experience already has doc_ok set, or if at least one doc is VALIDATED
    const currentExp = await this.prisma.workExperience.findUnique({
      where: { id: exp.id },
      select: { docOk: true },
    });
    const docOk = currentExp?.docOk === true;
    const overallVerified = docOk && completedConfirmed;

    await this.prisma.workExperience.update({
      where: { id: exp.id },
      data: {
        completedConfirmed,
        overallVerified,
      },
    });

    await this.auditPublisher.record({
      actorId: null,
      action: payload.confirmed
        ? 'WORK_EXPERIENCE_MANAGER_ENDORSEMENT_CONFIRMED'
        : 'WORK_EXPERIENCE_MANAGER_ENDORSEMENT_DISPUTED',
      resourceType: 'WorkExperience',
      resourceId: exp.id,
      reasonCode: payload.confirmed ? 'manager_confirmed' : 'manager_disputed',
      metadata: {
        endorsementId: endorsement.id,
        overallVerified,
        skillRatings: payload.skillRatings ?? null,
      },
    });

    return {
      success: true,
      status: newStatus as SubmitManagerEndorsementResponseDto['status'],
      message: payload.confirmed
        ? 'Thank you for confirming this work experience. Your endorsement has been recorded.'
        : 'Your response has been recorded. The candidate has been notified.',
    };
  }

  /**
   * SA-T08 - extends the v0.9 fraud/void action to a work-experience row.
   * One-directional: there is no "un-void".
   */
  async voidWorkExperience(
    actorId: string,
    id: string,
    body: VoidRequest,
  ): Promise<VoidWorkExperienceResponse> {
    const existing = await this.prisma.workExperience.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Work experience entry not found.',
        statusCode: 404,
      });
    }

    const voidedAt = new Date().toISOString();
    for (const document of existing.documents) {
      const prior = parseStoredDocumentAuthenticity(document.validationResult);
      await this.prisma.workExperienceDocument.update({
        where: { id: document.id },
        data: {
          validationResult: mergeAuthenticityIntoValidationResult(document.validationResult, {
            status: 'voided',
            result: prior.result,
            checkedAt: voidedAt,
          }) as Prisma.InputJsonValue,
        },
      });
    }

    const updated = await this.prisma.workExperience.update({
      where: { id },
      data: { status: 'VOIDED', rejectionReason: body.reason },
    });

    await this.auditPublisher.record({
      actorId,
      action: 'work_experience.voided',
      resourceType: 'WorkExperience',
      resourceId: id,
      reasonCode: body.reason,
    });

    return {
      id: updated.id,
      status: updated.status as WorkExperienceVerificationStatus,
      voidedAt: updated.updatedAt.toISOString(),
    };
  }

  async approveWorkExperienceAuthenticity(
    actorId: string,
    id: string,
    body: AdminWorkExperienceReviewRequest,
  ): Promise<ApproveWorkExperienceAuthenticityResponse> {
    const existing = await this.prisma.workExperience.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Work experience entry not found.',
        statusCode: 404,
      });
    }

    let cleared = 0;
    const approvedAt = new Date().toISOString();

    for (const document of existing.documents) {
      const prior = parseStoredDocumentAuthenticity(document.validationResult);
      if (prior.status !== 'doc_flagged') continue;

      await this.prisma.workExperienceDocument.update({
        where: { id: document.id },
        data: {
          validationResult: mergeAuthenticityIntoValidationResult(document.validationResult, {
            status: 'doc_ok',
            result: prior.result,
            checkedAt: approvedAt,
          }) as Prisma.InputJsonValue,
        },
      });
      cleared += 1;
    }

    await this.auditPublisher.record({
      actorId,
      action: 'work_experience.authenticity_approved',
      resourceType: 'WorkExperience',
      resourceId: id,
      reasonCode: body.reason,
    });

    return ApproveWorkExperienceAuthenticityResponseSchema.parse({
      id,
      flaggedDocumentsCleared: cleared,
      approvedAt,
    });
  }
}
