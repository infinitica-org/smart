import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { CertVerificationAssessmentService } from './cert-verification-assessment.service.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const CERT_ID = '22222222-2222-4222-8222-222222222222';

function student(): RequestUser {
  return { sub: STUDENT_ID, role: 'STUDENT', inst: null };
}

const baseCert = {
  id: CERT_ID,
  candidateId: STUDENT_ID,
  title: 'AWS Cloud Practitioner',
  issuer: 'Amazon',
  status: 'IN_VERIFICATION' as const,
  sourceStatus: 'source_verified' as const,
  trackCode: 'TECH_FULLSTACK',
  agendaLines: ['React', 'Node.js', 'PostgreSQL', 'REST APIs', 'Git'],
  assessmentStrikes: 0,
  assessmentLockedUntil: null,
  lastGenuineFailureAt: null,
  verificationMethod: null,
  taxonomyVersionSnapshot: null,
  expiryDate: null,
  certificateFileUrl: null,
  certificateFileName: null,
  fileMimeType: null,
  fileSizeBytes: null,
  learningDescription: null,
  tools: [],
  practicalApplied: null,
  practicalDescription: null,
  certificateNumber: null,
  verificationUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  skills: [],
};

describe('CertVerificationAssessmentService', () => {
  it('blocks start when source is not verified', async () => {
    const prisma = {
      candidateCertificate: {
        findUnique: vi.fn().mockResolvedValue({ ...baseCert, sourceStatus: 'pending' }),
      },
    };
    const service = new CertVerificationAssessmentService(
      prisma as never,
      { setex: vi.fn(), get: vi.fn() } as never,
      {} as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(service.start(student(), CERT_ID, { prepareOnly: true })).rejects.toThrow();
  });

  it('prepares a redis shell without calling the LLM', async () => {
    const redis = { setex: vi.fn().mockResolvedValue('OK'), get: vi.fn() };
    const prisma = {
      candidateCertificate: {
        findUnique: vi.fn().mockResolvedValue(baseCert),
      },
    };
    const evaluation = { generateCertAgendaVerifyPaper: vi.fn() };
    const service = new CertVerificationAssessmentService(
      prisma as never,
      redis as never,
      evaluation as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) } as never,
    );

    const prepared = await service.start(student(), CERT_ID, { prepareOnly: true });
    expect(prepared.sessionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(evaluation.generateCertAgendaVerifyPaper).not.toHaveBeenCalled();
    expect(redis.setex).toHaveBeenCalled();
  });

  it('sets VERIFIED on complete when source verified and grade passes', async () => {
    const sessionId = randomUUID();
    const stored = {
      sessionId,
      userId: STUDENT_ID,
      certificateId: CERT_ID,
      title: baseCert.title,
      issuer: baseCert.issuer,
      scoringToken: 'token',
      items: [
        {
          index: 1,
          stem: 'Q1',
          itemType: 'MCQ' as const,
          options: [
            { label: 'A' as const, text: 'a' },
            { label: 'B' as const, text: 'b' },
            { label: 'C' as const, text: 'c' },
            { label: 'D' as const, text: 'd' },
          ],
        },
      ],
      timeMinutes: 25,
      passMarkPercent: 80,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      answers: [{ index: 1, selectedKey: 'A' }],
    };

    const prisma = {
      candidateCertificate: {
        findUnique: vi.fn().mockResolvedValue(baseCert),
        update: vi.fn().mockResolvedValue({ ...baseCert, status: 'VERIFIED' }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          candidateCertificate: {
            update: vi.fn().mockResolvedValue({ ...baseCert, status: 'VERIFIED' }),
          },
          candidateCertificateVerificationAttempt: { create: vi.fn() },
          certificateVerificationEvent: { create: vi.fn() },
        }),
      ),
    };
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
      del: vi.fn(),
      exists: vi.fn().mockResolvedValue(0),
    };
    const evaluation = {
      gradeCertAgendaPaper: vi.fn().mockResolvedValue({
        certificateId: CERT_ID,
        marksEarned: 1,
        marksTotal: 1,
        scorePercent: 100,
        passed: true,
        promptRef: 'cert-agenda-generate@1',
        itemResults: [],
      }),
    };

    const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };
    const service = new CertVerificationAssessmentService(
      prisma as never,
      redis as never,
      evaluation as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      outbox as never,
    );

    const result = await service.complete(student(), sessionId, {
      responses: [{ index: 1, selectedKey: 'A' }],
    });
    expect(result.certificate.status).toBe('VERIFIED');
    expect(result.grade?.passed).toBe(true);
    expect(outbox.enqueueEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'smart.credential.verified',
        data: expect.objectContaining({
          userId: STUDENT_ID,
          sourceId: 'EXTERNALCERT',
          entityId: CERT_ID,
        }),
      }),
    );
  });
});
