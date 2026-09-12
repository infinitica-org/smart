import { describe, expect, it, vi } from 'vitest';
import { VerificationOrchestratorService } from './verification-orchestrator.service.js';

const ADVANCED_FLAGS = {
  realWorldApplicationRequired: true,
  substantialApplicationRequired: false,
  interviewRequired: true,
};

const ASSESSMENT_ONLY_ADVANCED_FLAGS = {
  realWorldApplicationRequired: false,
  substantialApplicationRequired: false,
  interviewRequired: true,
};

const PROFESSIONAL_FLAGS = {
  realWorldApplicationRequired: true,
  substantialApplicationRequired: true,
  interviewRequired: true,
};

describe('VerificationOrchestratorService', () => {
  const syncService = new VerificationOrchestratorService({} as never, {} as never);

  it('routes interview-only advanced levels to interview before finalize', () => {
    const gate = syncService.evaluateGate({
      targetProficiency: 'ADVANCED',
      supportedProficiency: 'ADVANCED',
      recommendedNextStep: 'NONE',
      confidence: 'HIGH',
      verificationFlags: ASSESSMENT_ONLY_ADVANCED_FLAGS,
    });
    expect(gate.recommendedNextStep).toBe('INTERVIEW');
    expect(gate.canFinalizeClaim).toBe(false);
  });

  it('allows assessment-only finalize after interview when evidence is not required', () => {
    const gate = syncService.evaluateGate({
      targetProficiency: 'ADVANCED',
      supportedProficiency: 'ADVANCED',
      recommendedNextStep: 'NONE',
      confidence: 'HIGH',
      interviewPassed: true,
      verificationFlags: ASSESSMENT_ONLY_ADVANCED_FLAGS,
    });
    expect(gate.canFinalizeClaim).toBe(true);
  });

  it('finalizes professional claim as VERIFIED when verified evidence exists', async () => {
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
      assessmentComplete: true,
      interviewPassed: true,
      verificationFlags: PROFESSIONAL_FLAGS,
    });

    expect(result.canFinalizeClaim).toBe(true);
    expect(result.verificationDecision).toBe('VERIFIED');
    expect(result.claimConfidence).toBeGreaterThan(0.8);
  });

  it('finalizes as PROVISIONAL when only provisional evidence is linked', async () => {
    const prisma = {
      skillClaimEvidenceLink: {
        findMany: vi.fn().mockResolvedValue([
          {
            evidenceId: 'ev-prov',
            evidence: {
              evidenceType: 'PROJECT',
              relatedSkillCodes: ['SKILL_JS'],
              verificationStatus: 'PROVISIONAL',
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
      targetProficiency: 'ADVANCED',
      supportedProficiency: 'ADVANCED',
      recommendedNextStep: 'NONE',
      confidence: 'MEDIUM',
      assessmentComplete: true,
      interviewPassed: true,
      verificationFlags: ADVANCED_FLAGS,
    });

    expect(result.canFinalizeClaim).toBe(true);
    expect(result.verificationDecision).toBe('PROVISIONAL');
    expect(result.reasons.some((reason) => reason.includes('provisional'))).toBe(true);
  });

  it('keeps advanced pending when demonstration evidence is missing', async () => {
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
      targetProficiency: 'ADVANCED',
      supportedProficiency: 'ADVANCED',
      recommendedNextStep: 'NONE',
      confidence: 'HIGH',
      assessmentComplete: true,
      interviewPassed: true,
      verificationFlags: ADVANCED_FLAGS,
    });

    expect(result.canFinalizeClaim).toBe(false);
    expect(result.recommendedNextStep).toBe('EVIDENCE_VERIFICATION');
  });

  it('returns PROVISIONAL for low-confidence assessment-only verification', async () => {
    const reconciliation = {
      reconcileForStudent: vi.fn().mockResolvedValue({ reviewRequired: false }),
    };
    const service = new VerificationOrchestratorService({} as never, reconciliation as never);

    const result = await service.evaluateClaimVerification({
      studentId: 'stu-1',
      claimId: 'claim-1',
      catalogSkillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      targetProficiency: 'INTERMEDIATE',
      supportedProficiency: 'INTERMEDIATE',
      recommendedNextStep: 'NONE',
      confidence: 'LOW',
      assessmentComplete: true,
      interviewPassed: true,
      verificationFlags: {
        realWorldApplicationRequired: false,
        substantialApplicationRequired: false,
        interviewRequired: false,
      },
    });

    expect(result.canFinalizeClaim).toBe(true);
    expect(result.verificationDecision).toBe('PROVISIONAL');
  });
});
