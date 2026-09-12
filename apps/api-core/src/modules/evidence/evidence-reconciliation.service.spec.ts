import { describe, expect, it, vi } from 'vitest';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';

describe('EvidenceReconciliationService', () => {
  it('flags review when the same skill has weak and direct evidence', async () => {
    const prisma = {
      evidenceRecord: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'e1',
            relatedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
            evidenceStrength: 'WEAK',
            sourcePayload: null,
          },
          {
            id: 'e2',
            relatedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
            evidenceStrength: 'DIRECT',
            sourcePayload: null,
          },
        ]),
      },
    };
    const service = new EvidenceReconciliationService(prisma as never);
    const result = await service.reconcileForStudent('student-1');
    expect(result.contradictionsDetected).toBe(1);
    expect(result.reviewRequired).toBe(true);
  });

  it('returns no review when strengths are consistent', async () => {
    const prisma = {
      evidenceRecord: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'e1',
            relatedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
            evidenceStrength: 'STRONG',
            sourcePayload: null,
          },
        ]),
      },
    };
    const service = new EvidenceReconciliationService(prisma as never);
    const result = await service.reconcileForStudent('student-1');
    expect(result.contradictionsDetected).toBe(0);
    expect(result.reviewRequired).toBe(false);
  });
});
