import { describe, expect, it, vi } from 'vitest';
import { EvidenceReconciliationProcessor } from './evidence-reconciliation.processor.js';

describe('EvidenceReconciliationProcessor', () => {
  it('21. runs reconcileForStudent on job success', async () => {
    const reconciliation = {
      reconcileForStudent: vi
        .fn()
        .mockResolvedValue({ contradictionsDetected: 1, reviewRequired: true }),
    };
    const processor = new EvidenceReconciliationProcessor(reconciliation as never);

    await processor.process({
      name: 'reconcile-student',
      data: {
        studentId: 'student-1',
        evidenceId: 'evidence-1',
        trigger: 'evidence_review',
      },
    } as never);

    expect(reconciliation.reconcileForStudent).toHaveBeenCalledWith('student-1');
  });

  it('22. propagates reconciliation failure for BullMQ retry', async () => {
    const reconciliation = {
      reconcileForStudent: vi.fn().mockRejectedValue(new Error('redis unavailable')),
    };
    const processor = new EvidenceReconciliationProcessor(reconciliation as never);

    await expect(
      processor.process({
        name: 'reconcile-student',
        data: { studentId: 'student-1', evidenceId: 'evidence-1', trigger: 'evidence_review' },
      } as never),
    ).rejects.toThrow('redis unavailable');
  });
});
