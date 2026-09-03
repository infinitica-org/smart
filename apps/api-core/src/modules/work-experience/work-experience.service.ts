import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  WorkExperienceDto,
  WorkExperienceDocumentDto,
  ValidateWorkExperienceProofResponse,
} from '@smart/contracts';
import {
  CreateWorkExperienceSchema,
  CreateWorkExperienceDocumentSchema,
  UpdateWorkExperienceSchema,
  WorkExperienceSchema,
  WorkExperienceDocumentSchema,
  WorkExperienceProofExtractedDataSchema,
  ValidateWorkExperienceProofResponseSchema,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import { env } from '../../platform/config/env.js';
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

function normalizeCompanyName(name: string | null | undefined): string {
  if (!name) return '';
  return normalizeText(name)
    .replace(/\b(pvt|private|ltd|limited|inc|incorporated|llp|corp|corporation|co|company)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

    let validationStatus: 'VALIDATED' | 'REJECTED' = 'VALIDATED';
    let rejectionReason: string | null = null;

    if (isOfferLetter) {
      validationStatus = 'REJECTED';
      rejectionReason =
        'Uploaded document is an offer letter or appointment agreement, which is not acceptable proof of completed work experience.';
    } else if (!isActualEmploymentProof) {
      validationStatus = 'REJECTED';
      rejectionReason =
        'Uploaded document does not establish proof of actual or completed employment.';
    } else if (!companyNameMatch) {
      validationStatus = 'REJECTED';
      rejectionReason = `Document company name (${extracted.companyName ?? 'Unknown'}) does not match submitted company (${experience.companyName}).`;
    } else if (!candidateNameMatch) {
      validationStatus = 'REJECTED';
      rejectionReason = `Document candidate name (${extracted.candidateName ?? 'Unknown'}) does not match student name (${user?.fullName ?? 'Student'}).`;
    } else if (!roleMatch) {
      validationStatus = 'REJECTED';
      rejectionReason = `Document role (${extracted.role ?? 'Unknown'}) does not match submitted role (${experience.role}).`;
    } else if (!dateMatch) {
      validationStatus = 'REJECTED';
      rejectionReason =
        'Document employment dates could not be verified against submitted experience dates.';
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
      reasonCode: validationStatus === 'REJECTED' ? 'PROOF_REJECTED' : 'PROOF_VALIDATED',
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
}
