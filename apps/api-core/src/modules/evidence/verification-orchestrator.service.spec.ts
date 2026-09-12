import { describe, expect, it, vi } from 'vitest';
import { VerificationOrchestratorService } from './verification-orchestrator.service.js';

describe('VerificationOrchestratorService', () => {
  const syncService = new VerificationOrchestratorService({} as never, {} as never);

  it('requires evidence for professional target when supported', () => {
    const gate = syncService.evaluateGate({
      targetProficiency: 'PROFESSIONAL',
      supportedProficiency: 'PROFESSIONAL',
      recommendedNextStep: 'NONE',
      confidence: 'HIGH',
    });
    expect(gate.recommendedNextStep).toBe('EVIDENCE_VERIFICATION');
    expect(gate.canFinalizeClaim).toBe(false);
  });

  it('requires interview for advanced target with low confidence', () => {
    const gate = syncService.evaluateGate({
      targetProficiency: 'ADVANCED',
      supportedProficiency: 'ADVANCED',
      recommendedNextStep: 'NONE',
      confidence: 'LOW',
    });
    expect(gate.recommendedNextStep).toBe('INTERVIEW');
    expect(gate.canFinalizeClaim).toBe(false);
  });

  it('allows finalize for advanced when interview passed and confidence is low', () => {
    const gate = syncService.evaluateGate({
      targetProficiency: 'ADVANCED',
      supportedProficiency: 'ADVANCED',
      recommendedNextStep: 'NONE',
      confidence: 'LOW',
      interviewPassed: true,
    });
    expect(gate.canFinalizeClaim).toBe(true);
  });

  it('finalizes professional claim when verified demonstration evidence exists', async () => {
    const prisma = {
      skillClaimEvidenceLink: {
        findMany: vi.fn().mockResolvedValue([
          {
            evidenceId: 'ev-1',
            evidence: {
              evidenceType: 'WORK_EXPERIENCE',
              relatedSkillCodes: ['SKILL_JS'],
              verificationStatus: 'VERIFIED',
              studentId: 'stu-1',
            },
          },
        ]),
      },
    };
    const reconciliation = {
      reconcileForStudent: vi.fn().mockResolvedValue({ reviewRequired: false }),
    };
    const service = new VerificationOrchestratorService(prisma as never, reconciliation as never);

    const result = await service.evaluateClaimVerification({
      studentId: 'stu-1',
      claimId: 'claim-1',
      catalogSkillCode: 'SKILL_JS',
      targetProficiency: 'PROFESSIONAL',
      supportedProficiency: 'PROFESSIONAL',
      recommendedNextStep: 'NONE',
      confidence: 'HIGH',
      interviewPassed: true,
    });

    expect(result.canFinalizeClaim).toBe(true);
    expect(result.recommendedNextStep).toBe('NONE');
  });

  it('rejects self-reported evidence links for professional finalize', async () => {
    const prisma = {
      skillClaimEvidenceLink: {
        findMany: vi.fn().mockResolvedValue([
          {
            evidenceId: 'ev-self',
            evidence: {
              evidenceType: 'SELF_REPORT',
              relatedSkillCodes: ['SKILL_JS'],
              verificationStatus: 'VERIFIED',
              studentId: 'stu-1',
            },
          },
        ]),
      },
    };
    const reconciliation = {
      reconcileForStudent: vi.fn().mockResolvedValue({ reviewRequired: false }),
    };
    const service = new VerificationOrchestratorService(prisma as never, reconciliation as never);

    const result = await service.evaluateClaimVerification({
      studentId: 'stu-1',
      claimId: 'claim-1',
      catalogSkillCode: 'SKILL_JS',
      targetProficiency: 'PROFESSIONAL',
      supportedProficiency: 'PROFESSIONAL',
      recommendedNextStep: 'NONE',
      confidence: 'HIGH',
      interviewPassed: true,
    });

    expect(result.canFinalizeClaim).toBe(false);
    expect(result.recommendedNextStep).toBe('EVIDENCE_VERIFICATION');
    expect(result.reasons[0]).toContain('verified project or work experience');
  });

  it('keeps professional pending when evidence is missing', async () => {
    const prisma = {
      skillClaimEvidenceLink: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const reconciliation = {
      reconcileForStudent: vi.fn().mockResolvedValue({ reviewRequired: false }),
    };
    const service = new VerificationOrchestratorService(prisma as never, reconciliation as never);

    const result = await service.evaluateClaimVerification({
      studentId: 'stu-1',
      claimId: 'claim-1',
      catalogSkillCode: 'SKILL_JS',
      targetProficiency: 'PROFESSIONAL',
      supportedProficiency: 'PROFESSIONAL',
      recommendedNextStep: 'NONE',
      confidence: 'HIGH',
      interviewPassed: true,
    });

    expect(result.canFinalizeClaim).toBe(false);
    expect(result.recommendedNextStep).toBe('EVIDENCE_VERIFICATION');
    expect(result.reasons[0]).toContain('linked project or work evidence');
  });
});
