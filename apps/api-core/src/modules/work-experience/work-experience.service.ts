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
} from '@smart/contracts';
import {
  CreateWorkExperienceSchema,
  CreateWorkExperienceDocumentSchema,
  UpdateWorkExperienceSchema,
  WorkExperienceSchema,
  WorkExperienceDocumentSchema,
  WorkExperienceProofExtractedDataSchema,
  ValidateWorkExperienceProofResponseSchema,
  SubmitWorkExperienceVerificationSchema,
  isDisallowedEndorserEmailDomain,
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
} from '../../platform/mailer/mailer.types.js';
import { env } from '../../platform/config/env.js';
import type { Prisma } from '../../generated/prisma/index.js';

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

function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCompanyName(name: string | null | undefined): string {
  if (!name) return '';
  return normalizeText(name)
    .replace(/\b(pvt|private|ltd|limited|inc|incorporated|llp|corp|corporation|co|company)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractDomain(urlOrEmail: string | null | undefined): string | null {
  if (!urlOrEmail || typeof urlOrEmail !== 'string') return null;
  const trimmed = urlOrEmail.trim().toLowerCase();
  if (!trimmed) return null;

  let hostname = '';
  if (trimmed.includes('@')) {
    hostname = trimmed.split('@').pop() || '';
  } else {
    try {
      const withProtocol = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
      const url = new URL(withProtocol);
      hostname = url.hostname;
    } catch {
      const firstPart = trimmed.split('/')[0] || '';
      hostname = firstPart.split(':')[0] || '';
    }
  }

  hostname = hostname.replace(/^www\./, '').trim();
  return hostname || null;
}

export function validateEmployerDomain(
  verifierEmail: string | null | undefined,
  companyWebsite: string | null | undefined,
): {
  verifierDomain: string | null;
  companyDomain: string | null;
  domainMatch: boolean;
} {
  const verifierDomain = extractDomain(verifierEmail);
  const companyDomain = extractDomain(companyWebsite);

  if (!verifierDomain || !companyDomain) {
    return {
      verifierDomain,
      companyDomain,
      domainMatch: false,
    };
  }

  const domainMatch =
    verifierDomain === companyDomain ||
    verifierDomain.endsWith(`.${companyDomain}`) ||
    companyDomain.endsWith(`.${verifierDomain}`);

  return {
    verifierDomain,
    companyDomain,
    domainMatch,
  };
}

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

  private mapToDto(exp: RawWorkExperience): WorkExperienceDto {
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
    let reasonCode = 'PROOF_VALIDATED';

    if (isOfferLetter) {
      validationStatus = 'REJECTED';
      rejectionReason =
        'INVALID_DOCUMENT_TYPE: Uploaded document is an offer letter or appointment agreement, which is not acceptable proof of completed work experience.';
      reasonCode = 'INVALID_DOCUMENT_TYPE';
    } else if (!isActualEmploymentProof) {
      validationStatus = 'REJECTED';
      rejectionReason =
        'Uploaded document does not establish proof of actual or completed employment.';
      reasonCode = 'PROOF_REJECTED';
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

    const validatedAt = new Date().toISOString();

    const validationResult = {
      validationStatus,
      documentType: extracted.documentType,
      isOfferLetter,
      extractedData: extracted,
      matchResult,
      rejectionReason,
      validatedAt,
    };

    // Update document validation status & result
    await this.prisma.workExperienceDocument.update({
      where: { id: documentId },
      data: {
        validationStatus,
        validationResult: validationResult as Prisma.InputJsonValue,
      },
    });

    // Update work experience status if rejected (valid proof keeps experience status SUBMITTED, NEVER VERIFIED)
    let updatedExperienceStatus = experience.status;
    if (validationStatus === 'REJECTED') {
      const updatedExp = await this.prisma.workExperience.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason,
        },
      });
      updatedExperienceStatus = updatedExp.status;
    }

    await this.auditPublisher.record({
      actorId: studentId,
      action: 'WORK_EXPERIENCE_UPDATED',
      resourceType: 'WorkExperienceDocument',
      resourceId: documentId,
      reasonCode,
    });

    return ValidateWorkExperienceProofResponseSchema.parse({
      experienceId: id,
      documentId,
      experienceStatus: updatedExperienceStatus,
      validationResult,
    });
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
        createdAt: exp.createdAt.toISOString(),
      };
    });
  }
}
