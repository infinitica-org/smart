import { describe, expect, it, vi } from 'vitest';
import { EvidenceExpirationService, isPastExpiryDate } from './evidence-expiration.service.js';

const EVIDENCE_ID = '22222222-2222-4222-8222-222222222222';
const STUDENT_ID = '44444444-4444-4444-8444-444444444444';
const CREDENTIAL_ID = '55555555-5555-4555-8555-555555555555';
const EXPERIENCE_ID = '66666666-6666-4666-8666-666666666666';

function buildService(overrides?: {
  prisma?: Record<string, unknown>;
  auditPublisher?: { record: ReturnType<typeof vi.fn> };
}) {
  const auditPublisher = overrides?.auditPublisher ?? {
    record: vi.fn().mockResolvedValue(undefined),
  };
  const reconciliation = {
    reconcileForStudent: vi
      .fn()
      .mockResolvedValue({ contradictionsDetected: 0, reviewRequired: false }),
  };
  const prisma = {
    evidenceRecord: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      ...(overrides?.prisma?.evidenceRecord as object),
    },
    professionalCredential: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      ...(overrides?.prisma?.professionalCredential as object),
    },
    workExperience: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      ...(overrides?.prisma?.workExperience as object),
    },
  };

  const service = new EvidenceExpirationService(
    prisma as never,
    reconciliation as never,
    auditPublisher as never,
  );

  return { service, prisma, reconciliation, auditPublisher };
}

describe('isPastExpiryDate', () => {
  it('treats YYYY-MM-DD as end of that UTC day', () => {
    expect(isPastExpiryDate('2020-01-01', new Date('2020-01-02T00:00:00.000Z'))).toBe(true);
    expect(isPastExpiryDate('2020-01-01', new Date('2020-01-01T12:00:00.000Z'))).toBe(false);
  });
});

describe('EvidenceExpirationService', () => {
  it('1. expires VERIFIED credential evidence when expiryDate is due', async () => {
    const { service, prisma, auditPublisher, reconciliation } = buildService({
      prisma: {
        evidenceRecord: {
          findUnique: vi.fn().mockResolvedValue({
            id: EVIDENCE_ID,
            studentId: STUDENT_ID,
            evidenceType: 'CREDENTIAL',
            sourceEntityId: CREDENTIAL_ID,
            verificationStatus: 'VERIFIED',
            source: 'CANDIDATE',
            freshness: null,
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        professionalCredential: {
          findUnique: vi.fn().mockResolvedValue({
            expiryDate: '2020-06-01',
          }),
          findFirst: vi.fn().mockResolvedValue({
            expiryDate: '2020-06-01',
          }),
        },
      },
    });

    const result = await service.expireEvidenceIfDue(EVIDENCE_ID);

    expect(result.outcome).toBe('expired');
    expect(prisma.evidenceRecord.updateMany).toHaveBeenCalledWith({
      where: {
        id: EVIDENCE_ID,
        verificationStatus: { in: ['PENDING', 'PROVISIONAL', 'VERIFIED', 'DISPUTED'] },
      },
      data: { verificationStatus: 'EXPIRED' },
    });
    expect(auditPublisher.record).toHaveBeenCalledTimes(1);
    expect(reconciliation.reconcileForStudent).toHaveBeenCalledWith(STUDENT_ID);
  });

  it('2. leaves non-due credential evidence unchanged', async () => {
    const { service, prisma, auditPublisher, reconciliation } = buildService({
      prisma: {
        evidenceRecord: {
          findUnique: vi.fn().mockResolvedValue({
            id: EVIDENCE_ID,
            studentId: STUDENT_ID,
            evidenceType: 'CREDENTIAL',
            sourceEntityId: CREDENTIAL_ID,
            verificationStatus: 'VERIFIED',
            source: 'CANDIDATE',
            freshness: null,
          }),
        },
        professionalCredential: {
          findFirst: vi.fn().mockResolvedValue({
            expiryDate: '2099-12-31',
          }),
        },
      },
    });

    const result = await service.expireEvidenceIfDue(EVIDENCE_ID);

    expect(result.outcome).toBe('not_due');
    expect(prisma.evidenceRecord.updateMany).not.toHaveBeenCalled();
    expect(auditPublisher.record).not.toHaveBeenCalled();
    expect(reconciliation.reconcileForStudent).not.toHaveBeenCalled();
  });

  it('3. treats already EXPIRED evidence as a no-op', async () => {
    const { service, prisma, auditPublisher, reconciliation } = buildService({
      prisma: {
        evidenceRecord: {
          findUnique: vi.fn().mockResolvedValue({
            id: EVIDENCE_ID,
            studentId: STUDENT_ID,
            evidenceType: 'CREDENTIAL',
            sourceEntityId: CREDENTIAL_ID,
            verificationStatus: 'EXPIRED',
            source: 'CANDIDATE',
            freshness: null,
          }),
        },
      },
    });

    const result = await service.expireEvidenceIfDue(EVIDENCE_ID);

    expect(result.outcome).toBe('already_expired');
    expect(prisma.evidenceRecord.updateMany).not.toHaveBeenCalled();
    expect(auditPublisher.record).not.toHaveBeenCalled();
    expect(reconciliation.reconcileForStudent).not.toHaveBeenCalled();
  });

  it('4. does not expire unsupported evidence types', async () => {
    const { service, prisma, auditPublisher } = buildService({
      prisma: {
        evidenceRecord: {
          findUnique: vi.fn().mockResolvedValue({
            id: EVIDENCE_ID,
            studentId: STUDENT_ID,
            evidenceType: 'PROJECT',
            sourceEntityId: null,
            verificationStatus: 'VERIFIED',
            source: 'CANDIDATE',
            freshness: null,
          }),
        },
      },
    });

    const result = await service.expireEvidenceIfDue(EVIDENCE_ID);

    expect(result.outcome).toBe('not_due');
    expect(prisma.evidenceRecord.updateMany).not.toHaveBeenCalled();
    expect(auditPublisher.record).not.toHaveBeenCalled();
  });

  it('5–9. emits audit exactly once with prior/new state on transition', async () => {
    const { service, auditPublisher } = buildService({
      prisma: {
        evidenceRecord: {
          findUnique: vi.fn().mockResolvedValue({
            id: EVIDENCE_ID,
            studentId: STUDENT_ID,
            evidenceType: 'CREDENTIAL',
            sourceEntityId: CREDENTIAL_ID,
            verificationStatus: 'VERIFIED',
            source: 'CANDIDATE',
            freshness: null,
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        professionalCredential: {
          findFirst: vi.fn().mockResolvedValue({ expiryDate: '2020-01-01' }),
        },
      },
    });

    await service.expireEvidenceIfDue(EVIDENCE_ID, { reasonCode: 'evidence_expired' });

    expect(auditPublisher.record).toHaveBeenCalledWith({
      actorId: null,
      action: 'evidence.updated',
      resourceType: 'evidence_record',
      resourceId: EVIDENCE_ID,
      reasonCode: 'evidence_expired',
      metadata: {
        priorState: {
          verificationStatus: 'VERIFIED',
          source: 'CANDIDATE',
          evidenceType: 'CREDENTIAL',
        },
        newState: {
          verificationStatus: 'EXPIRED',
          source: 'CANDIDATE',
          evidenceType: 'CREDENTIAL',
        },
        source: 'CANDIDATE',
        evidenceType: 'CREDENTIAL',
      },
    });
  });

  it('6. does not emit audit on repeated expiration', async () => {
    const { service, auditPublisher } = buildService({
      prisma: {
        evidenceRecord: {
          findUnique: vi.fn().mockResolvedValue({
            id: EVIDENCE_ID,
            studentId: STUDENT_ID,
            evidenceType: 'CREDENTIAL',
            sourceEntityId: CREDENTIAL_ID,
            verificationStatus: 'EXPIRED',
            source: 'CANDIDATE',
            freshness: null,
          }),
        },
      },
    });

    await service.expireEvidenceIfDue(EVIDENCE_ID);
    await service.expireEvidenceIfDue(EVIDENCE_ID);

    expect(auditPublisher.record).not.toHaveBeenCalled();
  });

  it('10–11. invokes reconciliation only after an actual transition', async () => {
    const { service, reconciliation } = buildService({
      prisma: {
        evidenceRecord: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce({
              id: EVIDENCE_ID,
              studentId: STUDENT_ID,
              evidenceType: 'CREDENTIAL',
              sourceEntityId: CREDENTIAL_ID,
              verificationStatus: 'VERIFIED',
              source: 'CANDIDATE',
              freshness: null,
            })
            .mockResolvedValueOnce({
              id: EVIDENCE_ID,
              studentId: STUDENT_ID,
              evidenceType: 'CREDENTIAL',
              sourceEntityId: CREDENTIAL_ID,
              verificationStatus: 'EXPIRED',
              source: 'CANDIDATE',
              freshness: null,
            }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        professionalCredential: {
          findFirst: vi.fn().mockResolvedValue({ expiryDate: '2020-01-01' }),
        },
      },
    });

    await service.expireEvidenceIfDue(EVIDENCE_ID);
    expect(reconciliation.reconcileForStudent).toHaveBeenCalledTimes(1);

    reconciliation.reconcileForStudent.mockClear();
    await service.expireEvidenceIfDue(EVIDENCE_ID);
    expect(reconciliation.reconcileForStudent).not.toHaveBeenCalled();
  });

  it('12. propagates database failures', async () => {
    const { service } = buildService({
      prisma: {
        evidenceRecord: {
          findUnique: vi.fn().mockResolvedValue({
            id: EVIDENCE_ID,
            studentId: STUDENT_ID,
            evidenceType: 'CREDENTIAL',
            sourceEntityId: CREDENTIAL_ID,
            verificationStatus: 'VERIFIED',
            source: 'CANDIDATE',
            freshness: null,
          }),
          updateMany: vi.fn().mockRejectedValue(new Error('db unavailable')),
        },
        professionalCredential: {
          findFirst: vi.fn().mockResolvedValue({ expiryDate: '2020-01-01' }),
        },
      },
    });

    await expect(service.expireEvidenceIfDue(EVIDENCE_ID)).rejects.toThrow('db unavailable');
  });

  it('does not expire REJECTED evidence', async () => {
    const { service, prisma } = buildService({
      prisma: {
        evidenceRecord: {
          findUnique: vi.fn().mockResolvedValue({
            id: EVIDENCE_ID,
            studentId: STUDENT_ID,
            evidenceType: 'CREDENTIAL',
            sourceEntityId: CREDENTIAL_ID,
            verificationStatus: 'REJECTED',
            source: 'CANDIDATE',
            freshness: null,
          }),
        },
      },
    });

    const result = await service.expireEvidenceIfDue(EVIDENCE_ID);
    expect(result.outcome).toBe('not_eligible');
    expect(prisma.evidenceRecord.updateMany).not.toHaveBeenCalled();
  });

  it('expires work experience evidence when parent WorkExperience is EXPIRED', async () => {
    const { service, prisma } = buildService({
      prisma: {
        evidenceRecord: {
          findUnique: vi.fn().mockResolvedValue({
            id: EVIDENCE_ID,
            studentId: STUDENT_ID,
            evidenceType: 'WORK_EXPERIENCE',
            sourceEntityId: EXPERIENCE_ID,
            verificationStatus: 'PROVISIONAL',
            source: 'CANDIDATE',
            freshness: null,
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        workExperience: {
          findFirst: vi.fn().mockResolvedValue({ status: 'EXPIRED' }),
        },
      },
    });

    const result = await service.expireEvidenceIfDue(EVIDENCE_ID);
    expect(result.outcome).toBe('expired');
    expect(prisma.evidenceRecord.updateMany).toHaveBeenCalled();
  });

  describe('scanAndExpireDueCredentials', () => {
    it('returns successful no-op when nothing is due (empty scan)', async () => {
      const { service, auditPublisher } = buildService({
        prisma: {
          professionalCredential: {
            findMany: vi.fn().mockResolvedValue([]),
          },
        },
      });

      const result = await service.scanAndExpireDueCredentials();

      expect(result).toEqual({ scanned: 0, expired: 0 });
      expect(auditPublisher.record).not.toHaveBeenCalled();
    });

    it('expires due credential evidence and updates credential status', async () => {
      const findUnique = vi
        .fn()
        .mockResolvedValueOnce({
          id: EVIDENCE_ID,
          studentId: STUDENT_ID,
          evidenceType: 'CREDENTIAL',
          sourceEntityId: CREDENTIAL_ID,
          verificationStatus: 'VERIFIED',
          source: 'CANDIDATE',
          freshness: null,
        })
        .mockResolvedValueOnce({
          expiryDate: '2020-01-01',
        });

      const { service, prisma } = buildService({
        prisma: {
          professionalCredential: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: CREDENTIAL_ID,
                studentId: STUDENT_ID,
                expiryDate: '2020-01-01',
                status: 'ACTIVE',
              },
            ]),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findFirst: vi.fn().mockResolvedValue({ expiryDate: '2020-01-01' }),
          },
          evidenceRecord: {
            findMany: vi.fn().mockResolvedValue([{ id: EVIDENCE_ID }]),
            findUnique,
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        },
      });

      const result = await service.scanAndExpireDueCredentials();

      expect(result.expired).toBe(1);
      expect(prisma.evidenceRecord.findMany).toHaveBeenCalledWith({
        where: {
          studentId: STUDENT_ID,
          evidenceType: 'CREDENTIAL',
          sourceEntityId: CREDENTIAL_ID,
        },
        select: { id: true },
      });
      expect(prisma.professionalCredential.updateMany).toHaveBeenCalledWith({
        where: { id: CREDENTIAL_ID, status: { notIn: ['EXPIRED', 'REVOKED'] } },
        data: { status: 'EXPIRED' },
      });
    });

    it('does not expire credential evidence when sourceEntityId belongs to another student', async () => {
      const { service, prisma } = buildService({
        prisma: {
          evidenceRecord: {
            findUnique: vi.fn().mockResolvedValue({
              id: EVIDENCE_ID,
              studentId: STUDENT_ID,
              evidenceType: 'CREDENTIAL',
              sourceEntityId: CREDENTIAL_ID,
              verificationStatus: 'VERIFIED',
              source: 'CANDIDATE',
              freshness: null,
            }),
          },
          professionalCredential: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      });

      const result = await service.expireEvidenceIfDue(EVIDENCE_ID);

      expect(result.outcome).toBe('not_due');
      expect(prisma.evidenceRecord.updateMany).not.toHaveBeenCalled();
    });
  });
});
