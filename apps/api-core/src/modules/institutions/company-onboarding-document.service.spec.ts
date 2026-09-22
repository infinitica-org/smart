import {
  BadRequestException,
  ConflictException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashOnboardingSecret } from './company-onboarding.util.js';
import { CompanyOnboardingDocumentService } from './company-onboarding-document.service.js';

const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const COMPANY_ID = '33333333-3333-4333-8333-333333333333';
const VERIFICATION_ID = '44444444-4444-4444-8444-444444444444';
const DOCUMENT_ID = '55555555-5555-4555-8555-555555555555';

function futureDate(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

function validPdfBuffer(): Buffer {
  return Buffer.from('%PDF-1.4 test');
}

describe('CompanyOnboardingDocumentService', () => {
  let service: CompanyOnboardingDocumentService;
  let prisma: any;
  let storage: any;
  let audit: any;
  const rawToken = 'h'.repeat(43);

  beforeEach(() => {
    prisma = {
      companyOnboardingSession: {
        findUnique: vi.fn(),
      },
      companyVerification: {
        findFirst: vi.fn(),
      },
      companyVerificationDocument: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
      },
    };
    storage = {
      upload: vi.fn().mockResolvedValue('company-verification/key/file.pdf'),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      getSignedDownloadUrl: vi.fn().mockResolvedValue('https://storage.example/signed?exp=900'),
    };
    audit = { record: vi.fn().mockResolvedValue(undefined) };
    service = new CompanyOnboardingDocumentService(prisma, storage, audit);
  });

  function mockPendingReviewSession() {
    prisma.companyOnboardingSession.findUnique.mockResolvedValue({
      id: SESSION_ID,
      sessionTokenHash: hashOnboardingSecret(rawToken),
      expiresAt: futureDate(),
      onboardingStatus: 'PENDING_REVIEW',
      companyId: COMPANY_ID,
      company: { verificationStatus: 'PENDING' },
    });
    prisma.companyVerification.findFirst.mockResolvedValue({
      id: VERIFICATION_ID,
      companyId: COMPANY_ID,
      onboardingSessionId: SESSION_ID,
    });
  }

  it('uploads a valid document and persists metadata with server-side storage key', async () => {
    mockPendingReviewSession();
    prisma.companyVerificationDocument.create.mockResolvedValue({
      id: DOCUMENT_ID,
      companyId: COMPANY_ID,
      companyVerificationId: VERIFICATION_ID,
      documentType: 'TAX_DOCUMENT',
      fileName: 'gst.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 100,
      storageKey: 'company-verification/key/file.pdf',
      uploadedAt: new Date('2026-09-21T10:00:00.000Z'),
      reviewStatus: 'PENDING',
      reviewReason: null,
    });

    const result = await service.uploadDocument(
      rawToken,
      { buffer: validPdfBuffer(), fileName: 'gst.pdf', mimeType: 'application/pdf' },
      'TAX_DOCUMENT',
    );

    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: `company-verification/${COMPANY_ID}/${VERIFICATION_ID}`,
      }),
    );
    expect(prisma.companyVerificationDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: COMPANY_ID,
          companyVerificationId: VERIFICATION_ID,
          uploadedBy: 'REPRESENTATIVE',
        }),
      }),
    );
    expect(result.documentId).toBe(DOCUMENT_ID);
    expect(result.downloadUrl).toContain('https://');
    expect(result).not.toHaveProperty('storageKey');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'company.verification_document.uploaded' }),
    );
  });

  it('rejects upload before submit when no verification exists', async () => {
    prisma.companyOnboardingSession.findUnique.mockResolvedValue({
      id: SESSION_ID,
      sessionTokenHash: hashOnboardingSecret(rawToken),
      expiresAt: futureDate(),
      onboardingStatus: 'EMAIL_VERIFIED',
      companyId: null,
    });
    await expect(
      service.uploadDocument(
        rawToken,
        { buffer: validPdfBuffer(), fileName: 'gst.pdf', mimeType: 'application/pdf' },
        'TAX_DOCUMENT',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects empty, oversized, and unsupported files', async () => {
    mockPendingReviewSession();
    await expect(
      service.uploadDocument(
        rawToken,
        { buffer: Buffer.alloc(0), fileName: 'a.pdf', mimeType: 'application/pdf' },
        'OTHER',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.uploadDocument(
        rawToken,
        {
          buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
          fileName: 'big.pdf',
          mimeType: 'application/pdf',
        },
        'OTHER',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.uploadDocument(
        rawToken,
        { buffer: validPdfBuffer(), fileName: 'x.exe', mimeType: 'application/pdf' },
        'OTHER',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid session and expired session', async () => {
    prisma.companyOnboardingSession.findUnique.mockResolvedValue(null);
    await expect(
      service.uploadDocument(
        rawToken,
        { buffer: validPdfBuffer(), fileName: 'gst.pdf', mimeType: 'application/pdf' },
        'TAX_DOCUMENT',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.companyOnboardingSession.findUnique.mockResolvedValue({
      id: SESSION_ID,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      service.uploadDocument(
        rawToken,
        { buffer: validPdfBuffer(), fileName: 'gst.pdf', mimeType: 'application/pdf' },
        'TAX_DOCUMENT',
      ),
    ).rejects.toBeInstanceOf(GoneException);
  });

  it('prevents IDOR via documentId outside current verification', async () => {
    mockPendingReviewSession();
    prisma.companyVerificationDocument.findFirst.mockResolvedValue(null);
    await expect(service.deleteDocument(rawToken, DOCUMENT_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes pending document and storage object', async () => {
    mockPendingReviewSession();
    prisma.companyVerificationDocument.findFirst.mockResolvedValue({
      id: DOCUMENT_ID,
      storageKey: 'company-verification/key/file.pdf',
      reviewStatus: 'PENDING',
      documentType: 'TAX_DOCUMENT',
      fileName: 'gst.pdf',
    });

    await service.deleteDocument(rawToken, DOCUMENT_ID);
    expect(prisma.companyVerificationDocument.delete).toHaveBeenCalled();
    expect(storage.deleteObject).toHaveBeenCalledWith('company-verification/key/file.pdf');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'company.verification_document.deleted' }),
    );
  });

  it('cleans up storage when DB create fails', async () => {
    mockPendingReviewSession();
    prisma.companyVerificationDocument.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.uploadDocument(
        rawToken,
        { buffer: validPdfBuffer(), fileName: 'gst.pdf', mimeType: 'application/pdf' },
        'TAX_DOCUMENT',
      ),
    ).rejects.toThrow('db down');
    expect(storage.deleteObject).toHaveBeenCalledWith('company-verification/key/file.pdf');
  });

  it('lists only documents for the requested verification', async () => {
    prisma.companyVerificationDocument.findMany.mockResolvedValue([
      {
        id: DOCUMENT_ID,
        companyId: COMPANY_ID,
        companyVerificationId: VERIFICATION_ID,
        documentType: 'TAX_DOCUMENT',
        fileName: 'gst.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 10,
        storageKey: 'k1',
        uploadedAt: new Date('2026-09-21T10:00:00.000Z'),
        reviewStatus: 'PENDING',
        reviewReason: null,
      },
    ]);

    const rows = await service.listDocumentsForSession(COMPANY_ID, VERIFICATION_ID);
    expect(rows).toHaveLength(1);
    expect(prisma.companyVerificationDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyVerificationId: VERIFICATION_ID, companyId: COMPANY_ID },
      }),
    );
  });
});
