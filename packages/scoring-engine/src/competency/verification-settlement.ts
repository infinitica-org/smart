import type { AssessmentConfidenceLevel } from '@smart/contracts';

export type VerificationDecisionOutcome = 'VERIFIED' | 'PROVISIONAL';

export function assessmentConfidenceToScore(confidence: AssessmentConfidenceLevel): number {
  if (confidence === 'HIGH') return 0.85;
  if (confidence === 'MEDIUM') return 0.65;
  return 0.45;
}

export function resolveVerificationDecision(input: {
  assessmentComplete: boolean;
  confidence: AssessmentConfidenceLevel;
  requiresEvidence: boolean;
  hasVerifiedEvidence: boolean;
  hasProvisionalEvidence: boolean;
  interviewRequired: boolean;
  interviewPassed?: boolean;
  reconciliationReviewRequired: boolean;
}): { decision: VerificationDecisionOutcome; confidence: number; reasons: string[] } | null {
  if (!input.assessmentComplete) return null;

  if (input.interviewRequired && input.interviewPassed !== true) {
    return null;
  }

  if (input.requiresEvidence && !input.hasVerifiedEvidence && !input.hasProvisionalEvidence) {
    return null;
  }

  const reasons: string[] = [];
  let provisional = false;

  if (input.reconciliationReviewRequired) {
    provisional = true;
    reasons.push('Conflicting evidence strengths detected for this skill.');
  }

  if (input.requiresEvidence && !input.hasVerifiedEvidence && input.hasProvisionalEvidence) {
    provisional = true;
    reasons.push('Only provisional project or work evidence is linked.');
  }

  if (input.confidence === 'LOW') {
    provisional = true;
    reasons.push('Assessment confidence is low; verification is provisional.');
  }

  let confidence = assessmentConfidenceToScore(input.confidence);
  if (provisional) {
    confidence = Math.min(confidence, 0.6);
  }

  return {
    decision: provisional ? 'PROVISIONAL' : 'VERIFIED',
    confidence,
    reasons,
  };
}
