import { Inject, Injectable } from '@nestjs/common';
import {
  LEVEL_VERIFICATION_METHOD,
  qualifiesAsSkillDemonstrationEvidence,
  type AssessmentConfidenceLevel,
  type ProficiencyRequirementLevel,
  type RecommendedNextStep,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';

export type VerificationGateInput = {
  studentId: string;
  claimId: string;
  catalogSkillCode: string;
  targetProficiency: ProficiencyRequirementLevel;
  supportedProficiency: ProficiencyRequirementLevel;
  recommendedNextStep: RecommendedNextStep;
  confidence: AssessmentConfidenceLevel;
  interviewPassed?: boolean;
};

export type VerificationGateResult = {
  recommendedNextStep: RecommendedNextStep;
  requiresInterview: boolean;
  requiresEvidence: boolean;
  canFinalizeClaim: boolean;
  reasons: string[];
};

@Injectable()
export class VerificationOrchestratorService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceReconciliationService)
    private readonly reconciliation: EvidenceReconciliationService,
  ) {}

  evaluateGate(input: Omit<VerificationGateInput, 'studentId' | 'claimId' | 'catalogSkillCode'>): {
    recommendedNextStep: RecommendedNextStep;
    requiresInterview: boolean;
    requiresEvidence: boolean;
    canFinalizeClaim: boolean;
  } {
    const method = LEVEL_VERIFICATION_METHOD[input.targetProficiency];
    const meetsTarget =
      this.proficiencyRank(input.supportedProficiency) >=
      this.proficiencyRank(input.targetProficiency);

    if (!meetsTarget) {
      return {
        recommendedNextStep: 'REMEDIATION',
        requiresInterview: false,
        requiresEvidence: false,
        canFinalizeClaim: false,
      };
    }

    const interviewPassed = input.interviewPassed === true;
    const needsInterview =
      method.interviewRequired ||
      input.confidence === 'LOW' ||
      input.recommendedNextStep === 'INTERVIEW';
    const needsEvidence = method.projectRequired;

    if (needsEvidence) {
      return {
        recommendedNextStep: 'EVIDENCE_VERIFICATION',
        requiresInterview: method.interviewRequired,
        requiresEvidence: true,
        canFinalizeClaim: false,
      };
    }

    if (needsInterview && !interviewPassed) {
      return {
        recommendedNextStep: 'INTERVIEW',
        requiresInterview: true,
        requiresEvidence: needsEvidence,
        canFinalizeClaim: false,
      };
    }

    if (input.recommendedNextStep === 'TARGETED_ASSESSMENT') {
      return {
        recommendedNextStep: 'TARGETED_ASSESSMENT',
        requiresInterview: false,
        requiresEvidence: false,
        canFinalizeClaim: false,
      };
    }

    return {
      recommendedNextStep: 'NONE',
      requiresInterview: needsInterview,
      requiresEvidence: needsEvidence,
      canFinalizeClaim: true,
    };
  }

  async evaluateClaimVerification(input: VerificationGateInput): Promise<VerificationGateResult> {
    const needsDemonstrationEvidence =
      input.targetProficiency === 'PROFESSIONAL' ||
      LEVEL_VERIFICATION_METHOD[input.targetProficiency].projectRequired;

    const evidenceLinks = needsDemonstrationEvidence
      ? await this.prisma.skillClaimEvidenceLink.findMany({
          where: { claimId: input.claimId },
          include: {
            evidence: {
              select: {
                evidenceType: true,
                relatedSkillCodes: true,
                verificationStatus: true,
                studentId: true,
              },
            },
          },
        })
      : [];

    const gate = this.evaluateGate({
      ...input,
      interviewPassed: input.interviewPassed,
    });

    const reasons: string[] = [];
    const qualifyingEvidence = evidenceLinks.filter(
      (link) =>
        link.evidence.studentId === input.studentId &&
        qualifiesAsSkillDemonstrationEvidence({
          evidenceType: link.evidence.evidenceType,
          relatedSkillCodes: link.evidence.relatedSkillCodes,
          catalogSkillCode: input.catalogSkillCode,
          verificationStatus: link.evidence.verificationStatus,
        }),
    );
    const hasEvidence = qualifyingEvidence.length > 0;

    if (gate.requiresEvidence && !hasEvidence) {
      reasons.push(
        evidenceLinks.length > 0
          ? 'Linked evidence must be a verified project or work experience that demonstrates this skill.'
          : 'Professional verification requires linked project or work evidence.',
      );
      return {
        recommendedNextStep: 'EVIDENCE_VERIFICATION',
        requiresInterview: gate.requiresInterview,
        requiresEvidence: true,
        canFinalizeClaim: false,
        reasons,
      };
    }

    if (gate.recommendedNextStep === 'INTERVIEW' && input.interviewPassed !== true) {
      reasons.push('A short defense interview is required before this claim can be verified.');
      return {
        ...gate,
        canFinalizeClaim: false,
        reasons,
      };
    }

    const reconciliation = await this.reconciliation.reconcileForStudent(input.studentId);
    if (reconciliation.reviewRequired) {
      reasons.push('Conflicting evidence strengths detected for this skill.');
      if (input.interviewPassed !== true && gate.requiresInterview) {
        return {
          recommendedNextStep: 'INTERVIEW',
          requiresInterview: true,
          requiresEvidence: gate.requiresEvidence,
          canFinalizeClaim: false,
          reasons,
        };
      }
      return {
        recommendedNextStep: 'EVIDENCE_VERIFICATION',
        requiresInterview: gate.requiresInterview,
        requiresEvidence: true,
        canFinalizeClaim: false,
        reasons,
      };
    }

    if (
      hasEvidence &&
      gate.requiresEvidence &&
      (!gate.requiresInterview || input.interviewPassed === true)
    ) {
      return {
        recommendedNextStep: 'NONE',
        requiresInterview: gate.requiresInterview,
        requiresEvidence: true,
        canFinalizeClaim: true,
        reasons,
      };
    }

    return { ...gate, reasons };
  }

  private proficiencyRank(level: ProficiencyRequirementLevel): number {
    const order: ProficiencyRequirementLevel[] = [
      'BEGINNER',
      'INTERMEDIATE',
      'ADVANCED',
      'PROFESSIONAL',
    ];
    return order.indexOf(level);
  }
}
