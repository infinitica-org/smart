import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CandidateCertificatesService } from './candidate-certificates.service.js';

const candidateId = randomUUID();
const otherCandidateId = randomUUID();
const certificateId = randomUUID();

function baseCertificateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: certificateId,
    candidateId,
    title: 'AWS Certified Cloud Practitioner',
    issuer: 'Amazon Web Services',
    status: 'UPLOADED',
    sourceStatus: 'pending',
    certificateNumber: null,
    verificationUrl: null,
    verificationMethod: null,
    certificateFileUrl: 'candidate-certificates/x/file.pdf',
    certificateFileName: 'cert.pdf',
    fileMimeType: 'application/pdf',
    fileSizeBytes: 1024,
    learningDescription: 'Learned cloud fundamentals.',
    tools: ['AWS Console'],
    practicalApplied: true,
    practicalDescription: 'Deployed a sample app.',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    skills: [{ skillCode: 'GIT_VERSION_CONTROL', selfAssessedProficiency: 'INTERMEDIATE' }],
    ...overrides,
  };
}

function setup() {
  const prisma = {
    candidateCertificate: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn().mockImplementation((_args?: { where?: { id?: string } }) => {
        return Promise.resolve(
          baseCertificateRow({ status: 'DECLARED', certificateFileUrl: null, skills: [] }),
        );
      }),
      update: vi.fn(),
    },
    candidateCertificateSkill: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    certificateVerificationEvent: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    certificateEndorsement: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ fullName: 'Ada Lovelace' }),
    },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const storage = {
    upload: vi.fn().mockResolvedValue('candidate-certificates/x/file.pdf'),
    getSignedDownloadUrl: vi.fn().mockResolvedValue('https://signed.example.com/file.pdf'),
  };
  const auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };
  const emailQueue = { add: vi.fn().mockResolvedValue(undefined) };
  const verificationService = {
    runVerification: vi.fn().mockResolvedValue({
      certificateId: 'test-id',
      sourceStatus: 'source_verified',
      status: 'VERIFIED',
      tierUsed: 'TIER_1_ISSUER_API',
      result: { status: 'VERIFIED', tier: 'TIER_1_ISSUER_API', confidence: 0.95, reason: 'OK' },
    }),
  };
  const service = new CandidateCertificatesService(
    prisma as never,
    storage as never,
    auditPublisher as never,
    emailQueue as never,
    verificationService as never,
  );
  return { prisma, storage, auditPublisher, emailQueue, verificationService, service };
}

describe('CandidateCertificatesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a certificate declared by title and issuer', async () => {
    const { prisma, service } = setup();
    prisma.candidateCertificate.create.mockResolvedValue(
      baseCertificateRow({ status: 'DECLARED', certificateFileUrl: null, skills: [] }),
    );
    const dto = await service.create(candidateId, {
      title: 'AWS Certified Cloud Practitioner',
      issuer: 'Amazon Web Services',
    });
    expect(prisma.candidateCertificate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          candidateId,
          title: 'AWS Certified Cloud Practitioner',
          issuer: 'Amazon Web Services',
        },
      }),
    );
    expect(dto.status).toBe('DECLARED');
    expect(dto.certificateFileUrl).toBeNull();
  });

  it('rejects an upload with a disallowed mime type', async () => {
    const { prisma, service } = setup();
    prisma.candidateCertificate.findUnique.mockResolvedValue(baseCertificateRow());
    await expect(
      service.upload(candidateId, certificateId, {
        buffer: Buffer.from('x'),
        fileName: 'cert.exe',
        mimeType: 'application/x-msdownload',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an upload larger than 10MB', async () => {
    const { prisma, service } = setup();
    prisma.candidateCertificate.findUnique.mockResolvedValue(baseCertificateRow());
    await expect(
      service.upload(candidateId, certificateId, {
        buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
        fileName: 'cert.pdf',
        mimeType: 'application/pdf',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forbids uploading to a certificate owned by someone else', async () => {
    const { prisma, service } = setup();
    prisma.candidateCertificate.findUnique.mockResolvedValue(
      baseCertificateRow({ candidateId: otherCandidateId }),
    );
    await expect(
      service.upload(candidateId, certificateId, {
        buffer: Buffer.from('x'),
        fileName: 'cert.pdf',
        mimeType: 'application/pdf',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404s an unknown certificate id', async () => {
    const { prisma, service } = setup();
    prisma.candidateCertificate.findUnique.mockResolvedValue(null);
    await expect(service.getOwned(candidateId, certificateId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('blocks skill edits while the certificate is in verification', async () => {
    const { prisma, service } = setup();
    prisma.candidateCertificate.findUnique.mockResolvedValue(
      baseCertificateRow({ status: 'IN_VERIFICATION' }),
    );
    await expect(
      service.replaceSkills(candidateId, certificateId, {
        skills: [{ skillCode: 'GIT_VERSION_CONTROL', selfAssessedProficiency: 'BEGINNER' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects replacing skills with a code outside the catalog', async () => {
    const { prisma, service } = setup();
    prisma.candidateCertificate.findUnique.mockResolvedValue(baseCertificateRow());
    await expect(
      service.replaceSkills(candidateId, certificateId, {
        skills: [{ skillCode: 'NOT_A_REAL_SKILL', selfAssessedProficiency: 'BEGINNER' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to start verification when required fields are missing', async () => {
    const { prisma, service } = setup();
    prisma.candidateCertificate.findUnique.mockResolvedValue(
      baseCertificateRow({ learningDescription: null, skills: [] }),
    );
    await expect(
      service.requestEndorsement(candidateId, certificateId, {
        endorserName: 'Jane Manager',
        endorserEmail: 'jane@acme.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requests an endorsement, emails the endorser, and moves the certificate to IN_VERIFICATION', async () => {
    const { prisma, emailQueue, service } = setup();
    prisma.candidateCertificate.findUnique.mockResolvedValue(baseCertificateRow());
    prisma.candidateCertificate.update.mockResolvedValue(
      baseCertificateRow({ status: 'IN_VERIFICATION' }),
    );

    const dto = await service.requestEndorsement(candidateId, certificateId, {
      endorserName: 'Jane Manager',
      endorserEmail: 'jane@acme.com',
    });

    expect(prisma.certificateEndorsement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ endorserEmail: 'jane@acme.com' }),
      }),
    );
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({ to: 'jane@acme.com', template: 'certificate-endorsement-request' }),
    );
    expect(dto.status).toBe('IN_VERIFICATION');
  });

  it('404s an endorsement token that does not exist', async () => {
    const { prisma, service } = setup();
    prisma.certificateEndorsement.findUnique.mockResolvedValue(null);
    await expect(service.getEndorsementByToken('bogus-token')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('flags an expired-but-unresponded endorsement as expired', async () => {
    const { prisma, service } = setup();
    prisma.certificateEndorsement.findUnique.mockResolvedValue({
      status: 'PENDING',
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      candidateCertificate: {
        ...baseCertificateRow(),
        candidate: { fullName: 'Ada Lovelace' },
      },
    });
    const result = await service.getEndorsementByToken('some-token');
    expect(result.isExpired).toBe(true);
    expect(result.status).toBe('EXPIRED');
  });

  it('rejects a decision on an endorsement that already responded', async () => {
    const { prisma, service } = setup();
    prisma.certificateEndorsement.findUnique.mockResolvedValue({
      id: randomUUID(),
      status: 'APPROVED',
      expiresAt: new Date('2100-01-01T00:00:00.000Z'),
      candidateCertificateId: certificateId,
      endorserName: 'Jane Manager',
    });
    await expect(
      service.submitEndorsementDecision('some-token', { approved: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns skillsClaimedSnapshot once the certificate is verified', async () => {
    const { prisma, service } = setup();
    prisma.candidateCertificate.findUnique.mockResolvedValue(
      baseCertificateRow({ status: 'VERIFIED' }),
    );
    const dto = await service.getOwned(candidateId, certificateId);
    expect(dto.skillsClaimedSnapshot).toEqual({
      taxonomyVersion: '0.9',
      skillCodes: ['GIT_VERSION_CONTROL'],
    });
  });

  it('approving an endorsement verifies the certificate via ENDORSEMENT', async () => {
    const { prisma, service } = setup();
    prisma.certificateEndorsement.findUnique.mockResolvedValue({
      id: randomUUID(),
      status: 'PENDING',
      expiresAt: new Date('2100-01-01T00:00:00.000Z'),
      candidateCertificateId: certificateId,
      endorserName: 'Jane Manager',
    });

    const result = await service.submitEndorsementDecision('some-token', { approved: true });

    expect(prisma.candidateCertificate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'VERIFIED', verificationMethod: 'ENDORSEMENT' },
      }),
    );
    expect(result.status).toBe('APPROVED');
  });

  it('rejecting an endorsement rejects the certificate with no verification method', async () => {
    const { prisma, service } = setup();
    prisma.certificateEndorsement.findUnique.mockResolvedValue({
      id: randomUUID(),
      status: 'PENDING',
      expiresAt: new Date('2100-01-01T00:00:00.000Z'),
      candidateCertificateId: certificateId,
      endorserName: 'Jane Manager',
    });

    const result = await service.submitEndorsementDecision('some-token', {
      approved: false,
      comments: 'Could not confirm this person worked here.',
    });

    expect(prisma.candidateCertificate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'REJECTED', verificationMethod: null },
      }),
    );
    expect(result.status).toBe('REJECTED');
  });

  describe('voidCertificate (SA-T08)', () => {
    it('voids a certificate, writes an audit row, and records a verification event', async () => {
      const { prisma, auditPublisher, service } = setup();
      const actorId = randomUUID();
      prisma.candidateCertificate.findUnique.mockResolvedValue(baseCertificateRow());
      prisma.candidateCertificate.update.mockResolvedValue(
        baseCertificateRow({ status: 'VOIDED', updatedAt: new Date('2026-09-09T00:00:00.000Z') }),
      );

      const result = await service.voidCertificate(actorId, certificateId, {
        reason: 'Fraudulent submission confirmed by employer.',
      });

      expect(prisma.candidateCertificate.update).toHaveBeenCalledWith({
        where: { id: certificateId },
        data: { status: 'VOIDED' },
      });
      expect(prisma.certificateVerificationEvent.create).toHaveBeenCalledWith({
        data: {
          candidateCertificateId: certificateId,
          status: 'VOIDED',
          message: 'Fraudulent submission confirmed by employer.',
        },
      });
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId,
          action: 'candidate_certificate.voided',
          resourceType: 'candidate_certificate',
          resourceId: certificateId,
          reasonCode: 'Fraudulent submission confirmed by employer.',
        }),
      );
      expect(result.status).toBe('VOIDED');
      expect(result.voidedAt).toBe('2026-09-09T00:00:00.000Z');
    });

    it('404s when voiding a certificate that does not exist', async () => {
      const { prisma, service } = setup();
      prisma.candidateCertificate.findUnique.mockResolvedValue(null);
      await expect(
        service.voidCertificate(randomUUID(), randomUUID(), { reason: 'Does not matter here.' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
