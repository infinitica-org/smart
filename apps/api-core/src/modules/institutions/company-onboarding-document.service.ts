import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CompanyVerificationDocumentType } from '@smart/contracts';
import {
  CompanyDocumentUploadMetaSchema,
  CompanyOnboardingVerificationDocumentDtoSchema,
  CompanyVerificationDocumentTypeSchema,
  MAX_COMPANY_VERIFICATION_DOCUMENT_BYTES,
  type CompanyOnboardingVerificationDocumentDto,
} from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import {
  requireOnboardingSessionByToken,
  resolveCurrentSessionVerification,
} from './company-onboarding-session.access.js';

const DOCUMENT_UPLOAD_ALLOWED_STATUSES = new Set(['PENDING_REVIEW']);

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);

@Injectable()
export class CompanyOnboardingDocumentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  async uploadDocument(
    rawToken: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
    documentTypeRaw: string,
  ): Promise<CompanyOnboardingVerificationDocumentDto> {
    const session = await requireOnboardingSessionByToken(this.prisma, rawToken);
    this.assertDocumentMutationAllowed(session.onboardingStatus);

    const verification = await resolveCurrentSessionVerification(this.prisma, session);
    if (!verification || !session.companyId) {
      throw new BadRequestException({
        error: 'invalid_state',
        message: 'Submit your application before uploading verification documents.',
        statusCode: 400,
      });
    }

    const documentTypeResult = CompanyVerificationDocumentTypeSchema.safeParse(documentTypeRaw);
    if (!documentTypeResult.success) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Unsupported verification document type.',
        statusCode: 400,
      });
    }

    this.assertFileValid(file);

    const namespace = `company-verification/${session.companyId}/${verification.id}`;
    let storageKey: string | null = null;
    try {
      storageKey = await this.storage.upload({
        buffer: file.buffer,
        namespace,
        fileName: file.fileName,
        contentType: file.mimeType,
      });

      const row = await this.prisma.companyVerificationDocument.create({
        data: {
          companyVerificationId: verification.id,
          companyId: session.companyId,
          documentType: documentTypeResult.data,
          fileName: sanitizeDisplayFileName(file.fileName),
          mimeType: file.mimeType,
          fileSizeBytes: file.buffer.byteLength,
          storageKey,
          uploadedBy: 'REPRESENTATIVE',
        },
      });

      await this.auditPublisher.record({
        actorId: null,
        action: 'company.verification_document.uploaded',
        resourceType: 'company_verification_document',
        resourceId: row.id,
        reasonCode: 'uploaded',
        metadata: {
          companyId: session.companyId,
          verificationId: verification.id,
          documentId: row.id,
          documentType: row.documentType,
          fileName: row.fileName,
          source: 'onboarding_session',
        },
      });

      return this.toPublicDto(row);
    } catch (error) {
      if (storageKey) {
        try {
          await this.storage.deleteObject(storageKey);
        } catch {
          // best-effort — original error is more important to the client
        }
      }
      throw error;
    }
  }

  async deleteDocument(rawToken: string, documentId: string): Promise<void> {
    const session = await requireOnboardingSessionByToken(this.prisma, rawToken);
    this.assertDocumentMutationAllowed(session.onboardingStatus);

    const verification = await resolveCurrentSessionVerification(this.prisma, session);
    if (!verification || !session.companyId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Document not found.',
        statusCode: 404,
      });
    }

    const document = await this.prisma.companyVerificationDocument.findFirst({
      where: {
        id: documentId,
        companyVerificationId: verification.id,
        companyId: session.companyId,
      },
    });
    if (!document) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Document not found.',
        statusCode: 404,
      });
    }
    if (document.reviewStatus !== 'PENDING') {
      throw new ConflictException({
        error: 'conflict',
        message: 'This document can no longer be removed.',
        statusCode: 409,
      });
    }

    await this.prisma.companyVerificationDocument.delete({ where: { id: document.id } });
    try {
      await this.storage.deleteObject(document.storageKey);
    } catch {
      // metadata removed; orphaned object is preferable to blocking the applicant
    }

    await this.auditPublisher.record({
      actorId: null,
      action: 'company.verification_document.deleted',
      resourceType: 'company_verification_document',
      resourceId: document.id,
      reasonCode: 'deleted',
      metadata: {
        companyId: session.companyId,
        verificationId: verification.id,
        documentId: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
        source: 'onboarding_session',
      },
    });
  }

  async listDocumentsForSession(
    companyId: string,
    verificationId: string,
  ): Promise<CompanyOnboardingVerificationDocumentDto[]> {
    const rows = await this.prisma.companyVerificationDocument.findMany({
      where: { companyVerificationId: verificationId, companyId },
      orderBy: { uploadedAt: 'asc' },
    });
    return Promise.all(rows.map((row) => this.toPublicDto(row)));
  }

  private assertDocumentMutationAllowed(onboardingStatus: string): void {
    if (!DOCUMENT_UPLOAD_ALLOWED_STATUSES.has(onboardingStatus)) {
      throw new ConflictException({
        error: 'conflict',
        message: 'Verification documents cannot be changed in the current onboarding state.',
        statusCode: 409,
      });
    }
  }

  private assertFileValid(file: { buffer: Buffer; fileName: string; mimeType: string }): void {
    if (!file.buffer?.byteLength) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Choose a non-empty document file to upload.',
        statusCode: 400,
      });
    }
    if (file.buffer.byteLength > MAX_COMPANY_VERIFICATION_DOCUMENT_BYTES) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'The document must be 5MB or smaller.',
        statusCode: 400,
      });
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimeType.toLowerCase())) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Only PDF, JPG, and PNG files are accepted.',
        statusCode: 400,
      });
    }
    const ext = extensionOf(file.fileName);
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Only PDF, JPG, and PNG files are accepted.',
        statusCode: 400,
      });
    }
  }

  private async toPublicDto(row: {
    id: string;
    companyId: string;
    companyVerificationId: string;
    documentType: CompanyVerificationDocumentType;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    uploadedAt: Date;
    reviewStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    reviewReason: string | null;
    storageKey: string;
  }): Promise<CompanyOnboardingVerificationDocumentDto> {
    const downloadUrl = await this.storage.getSignedDownloadUrl(row.storageKey);
    return CompanyOnboardingVerificationDocumentDtoSchema.parse({
      documentId: row.id,
      companyId: row.companyId,
      submissionId: row.companyVerificationId,
      documentType: row.documentType,
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSizeBytes: row.fileSizeBytes,
      uploadedAt: row.uploadedAt.toISOString(),
      reviewStatus: row.reviewStatus,
      reviewReason: row.reviewReason,
      downloadUrl,
    });
  }
}

export function parseDocumentUploadMeta(body: unknown): { documentType: string } {
  return CompanyDocumentUploadMetaSchema.parse(body);
}

function extensionOf(fileName: string): string | null {
  const idx = fileName.lastIndexOf('.');
  if (idx < 0) return null;
  return fileName.slice(idx).toLowerCase();
}

function sanitizeDisplayFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(-255) || 'document';
}
