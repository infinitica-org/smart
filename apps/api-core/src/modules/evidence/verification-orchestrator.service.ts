import { Inject, Injectable } from '@nestjs/common';
import {
  getSkillBlueprint,
  qualifiesAsProvisionalDemonstrationEvidence,
  qualifiesAsSkillDemonstrationEvidence,
  resolveProficiencyVerification,
  type AssessmentConfidenceLevel,
  type ProficiencyRequirementLevel,
  type ProficiencyVerificationFlags,
  type RecommendedNextStep,
  type SkillEvidenceContext,
  type SkillEvidenceContextItem,
  type VerificationDecisionOutcome,
} from '@smart/contracts';
import { resolveVerificationDecision } from '@smart/scoring-engine';
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
  assessmentComplete?: boolean;
  interviewPassed?: boolean;
  verificationFlags?: ProficiencyVerificationFlags;
};

export type VerificationGateResult = {
  recommendedNextStep: RecommendedNextStep;
  requiresInterview: boolean;
  requiresEvidence: boolean;
  canFinalizeClaim: boolean;
  verificationDecision?: VerificationDecisionOutcome;
  claimConfidence?: number;
  reasons: string[];
};

@Injectable()
export class VerificationOrchestratorService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceReconciliationService)
    private readonly reconciliation: EvidenceReconciliationService,
  ) {}

  resolveVerificationFlags(
    catalogSkillCode: string,
    level: ProficiencyRequirementLevel,
  ): ProficiencyVerificationFlags {
    const blueprint = getSkillBlueprint(catalogSkillCode);
    return resolveProficiencyVerification(blueprint?.proficiencyRequirements ?? [], level);
  }

  async loadEvidenceContext(
    studentId: string,
    catalogSkillCode: string,
  ): Promise<SkillEvidenceContext> {
    const records = await this.prisma.evidenceRecord.findMany({
      where: {
        studentId,
        relatedSkillCodes: { has: catalogSkillCode },
        evidenceType: { in: ['PROJECT', 'WORK_EXPERIENCE'] },
      },
      select: {
        evidenceType: true,
        verificationStatus: true,
        claim: true,
        context: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const items: SkillEvidenceContextItem[] = records.map((record) => {
      const qualifies = qualifiesAsSkillDemonstrationEvidence({
        evidenceType: record.evidenceType,
        relatedSkillCodes: [catalogSkillCode],
        catalogSkillCode,
        verificationStatus: record.verificationStatus,
      });
      const label =
        record.claim?.trim() ||
        record.context?.trim()?.slice(0, 120) ||
        `${record.evidenceType.replace('_', ' ')} evidence`;
      return {
        evidenceType: record.evidenceType,
        label,
        verificationStatus: record.verificationStatus,
        qualifiesForDemonstration: qualifies,
      };
    });

    return {
      availableCount: items.length,
      items,
    };
  }

  evaluateGate(input: {
    targetProficiency: ProficiencyRequirementLevel;
    supportedProficiency: ProficiencyRequirementLevel;
    recommendedNextStep: RecommendedNextStep;
    confidence: AssessmentConfidenceLevel;
    interviewPassed?: boolean;
    verificationFlags: ProficiencyVerificationFlags;
  }): {
    recommendedNextStep: RecommendedNextStep;
    requiresInterview: boolean;
    requiresEvidence: boolean;
    canFinalizeClaim: boolean;
  } {
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
      input.verificationFlags.interviewRequired ||
      input.confidence === 'LOW' ||
      input.recommendedNextStep === 'INTERVIEW';
    const needsEvidence = input.verificationFlags.realWorldApplicationRequired;

    if (needsInterview && !interviewPassed) {
      return {
        recommendedNextStep: 'INTERVIEW',
        requiresInterview: true,
        requiresEvidence: needsEvidence,
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
    const verificationFlags =
      input.verificationFlags ??
      this.resolveVerificationFlags(input.catalogSkillCode, input.supportedProficiency);

    const needsDemonstrationEvidence = verificationFlags.realWorldApplicationRequired;
    const assessmentComplete = input.assessmentComplete ?? true;

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
      targetProficiency: input.targetProficiency,
      supportedProficiency: input.supportedProficiency,
      recommendedNextStep: input.recommendedNextStep,
      confidence: input.confidence,
      interviewPassed: input.interviewPassed,
      verificationFlags,
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
    const provisionalEvidence = evidenceLinks.filter(
      (link) =>
        link.evidence.studentId === input.studentId &&
        qualifiesAsProvisionalDemonstrationEvidence({
          evidenceType: link.evidence.evidenceType,
          relatedSkillCodes: link.evidence.relatedSkillCodes,
          catalogSkillCode: input.catalogSkillCode,
          verificationStatus: link.evidence.verificationStatus,
        }) &&
        !qualifiesAsSkillDemonstrationEvidence({
          evidenceType: link.evidence.evidenceType,
          relatedSkillCodes: link.evidence.relatedSkillCodes,
          catalogSkillCode: input.catalogSkillCode,
          verificationStatus: link.evidence.verificationStatus,
        }),
    );
    const hasVerifiedEvidence = qualifyingEvidence.length > 0;
    const hasProvisionalEvidence = provisionalEvidence.length > 0;

    if (needsDemonstrationEvidence && !hasVerifiedEvidence && !hasProvisionalEvidence) {
      reasons.push(
        evidenceLinks.length > 0
          ? 'Linked evidence must be a verified project or work experience that demonstrates this skill.'
          : verificationFlags.substantialApplicationRequired
            ? 'Professional verification requires linked project or work evidence.'
            : 'Advanced verification requires linked project or work evidence.',
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

    const settlement = resolveVerificationDecision({
      assessmentComplete,
      confidence: input.confidence,
      requiresEvidence: needsDemonstrationEvidence,
      hasVerifiedEvidence,
      hasProvisionalEvidence,
      interviewRequired: gate.requiresInterview,
      interviewPassed: input.interviewPassed,
      reconciliationReviewRequired: reconciliation.reviewRequired,
    });

    if (!settlement) {
      return {
        recommendedNextStep: gate.recommendedNextStep,
        requiresInterview: gate.requiresInterview,
        requiresEvidence: gate.requiresEvidence,
        canFinalizeClaim: false,
        reasons,
      };
    }

    return {
      recommendedNextStep: 'NONE',
      requiresInterview: gate.requiresInterview,
      requiresEvidence: needsDemonstrationEvidence,
      canFinalizeClaim: true,
      verificationDecision: settlement.decision,
      claimConfidence: settlement.confidence,
      reasons: [...reasons, ...settlement.reasons],
    };
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
