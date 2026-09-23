import {
  proficiencyLevelNumber,
  type AssessmentConfidenceLevel,
  type CompetencyFusionResult,
  type FreshnessClass,
  type ProficiencyLevel,
  type SkillClaimStatus,
  type SkillConclusionAlignment,
  type SkillEvidenceInferenceSnapshot,
  type SkillLevelExplanation,
  type SkillLevelExplanationBasis,
  type EmployerSkillConfidenceIndicator,
  type EmployerSkillInspection,
} from '@smart/contracts';

export type FreshnessInputRow = {
  evidenceId: string;
  label: string;
  ageDays: number;
  maxAgeDays?: number;
};

export type ReportRefInput = {
  kind: 'ASSESSMENT_ATTEMPT' | 'PROJECT_VERIFICATION';
  id: string;
  label: string;
  evaluatedAt?: string;
  promptRef?: string;
};

export type BuildSkillLevelExplanationInput = {
  skillCode: string;
  skillName: string;
  claimStatus: SkillClaimStatus;
  verifiedProficiency: ProficiencyLevel | null;
  assessment: {
    attemptId: string;
    highestSupportedProficiency: ProficiencyLevel | null;
    confidence: AssessmentConfidenceLevel;
    evaluatedAt: string;
    interviewExplanation?: string | null;
  } | null;
  inference: SkillEvidenceInferenceSnapshot | null;
  freshnessRows: readonly FreshnessInputRow[];
  reportRefs: readonly ReportRefInput[];
  computedAt: string;
};

export function classifyFreshness(ageDays: number, maxAgeDays?: number): FreshnessClass {
  if (maxAgeDays === undefined) {
    if (ageDays <= 90) return 'CURRENT';
    if (ageDays <= 365) return 'RECENT';
    if (ageDays <= 730) return 'STALE';
    return 'EXPIRED';
  }
  if (ageDays <= maxAgeDays * 0.25) return 'CURRENT';
  if (ageDays <= maxAgeDays * 0.75) return 'RECENT';
  if (ageDays <= maxAgeDays) return 'STALE';
  return 'EXPIRED';
}

function conclusion(
  proficiency: ProficiencyLevel | null,
  summary: string,
  source: 'SKILL_CLAIM' | 'ASSESSMENT' | 'FUSION' | 'NONE',
) {
  return { proficiency, summary, source };
}

function resolveAlignment(
  verified: ProficiencyLevel | null,
  assessed: ProficiencyLevel | null,
  inferred: ProficiencyLevel | null,
): SkillConclusionAlignment {
  if (verified === null && assessed === null && inferred === null) return 'NO_CONCLUSION';
  if (verified !== null && assessed === null && inferred === null) return 'VERIFIED_ONLY';
  if (verified === null && assessed === null && inferred !== null) return 'INFERENCE_ONLY';

  const v = verified !== null ? proficiencyLevelNumber(verified) : null;
  const a = assessed !== null ? proficiencyLevelNumber(assessed) : null;
  const i = inferred !== null ? proficiencyLevelNumber(inferred) : null;

  if (verified !== null && inferred !== null && i !== v) return 'INFERENCE_DIVERGES_FROM_VERIFIED';
  if (verified !== null && assessed !== null && a !== null && v !== null) {
    if (a < v) return 'ASSESSED_BELOW_VERIFIED';
    if (a > v) return 'ASSESSED_ABOVE_VERIFIED';
  }
  return 'ALIGNED';
}

function resolveBasis(hasAssessment: boolean, evidenceCount: number): SkillLevelExplanationBasis {
  if (hasAssessment && evidenceCount > 0) return 'ASSESSMENT_AND_EVIDENCE';
  if (hasAssessment) return 'ASSESSMENT_ONLY';
  if (evidenceCount > 0) return 'EVIDENCE_ONLY';
  return 'NONE';
}

function competencyRowsFromFusion(fusion: CompetencyFusionResult | null) {
  if (!fusion) return [];
  const traceById = new Map(fusion.fusionTrace.map((row) => [row.competencyId, row]));
  return fusion.capabilityProfile.map((row) => {
    const trace = traceById.get(row.competencyId);
    const why =
      trace?.confidenceReason ??
      (row.observableEvidence[0]
        ? `Observed: ${row.observableEvidence[0]}`
        : `Status ${row.inferredStatus.toLowerCase().replaceAll('_', ' ')} from ${row.primaryEvidenceSource.toLowerCase()}.`);
    return {
      competencyId: row.competencyId,
      capability: row.capability,
      status: row.inferredStatus,
      primarySource: row.primaryEvidenceSource,
      why,
    };
  });
}

function buildWhyThisLevel(input: {
  basis: SkillLevelExplanationBasis;
  fusion: CompetencyFusionResult | null;
  verifiedProficiency: ProficiencyLevel | null;
  assessment: BuildSkillLevelExplanationInput['assessment'];
  inference: SkillEvidenceInferenceSnapshot | null;
}): string {
  const fusion = input.fusion;
  if (input.basis === 'EVIDENCE_ONLY' && fusion) {
    return `This level is based on verified project evidence only (no completed assessment on file). ${fusion.confidenceReason}`;
  }
  if (input.basis === 'ASSESSMENT_ONLY' && input.assessment?.highestSupportedProficiency) {
    const level = input.assessment.highestSupportedProficiency;
    return `Assessment results support ${level.replaceAll('_', ' ').toLowerCase()} proficiency. ${fusion?.confidenceReason ?? input.assessment.interviewExplanation ?? ''}`.trim();
  }
  if (input.basis === 'ASSESSMENT_AND_EVIDENCE' && fusion) {
    const level = fusion.inferredDomainProficiency ?? input.assessment?.highestSupportedProficiency;
    const levelText = level ? `${level.replaceAll('_', ' ').toLowerCase()} ` : '';
    return `Assessment and linked project evidence were fused to support ${levelText}proficiency. ${fusion.confidenceReason}`;
  }
  if (input.inference?.outcome === 'INSUFFICIENT_EVIDENCE') {
    return input.inference.confidenceReason;
  }
  if (input.verifiedProficiency) {
    return `Your verified claim is ${input.verifiedProficiency.replaceAll('_', ' ').toLowerCase()}. Add assessment or project evidence for a fuller explanation.`;
  }
  return 'Complete a skill verification assessment or link verified project evidence to see why a level applies.';
}

function buildVerifiedVsAi(input: {
  claimStatus: SkillClaimStatus;
  verifiedProficiency: ProficiencyLevel | null;
  assessment: BuildSkillLevelExplanationInput['assessment'];
  inference: SkillEvidenceInferenceSnapshot | null;
}): SkillLevelExplanation['verifiedVsAi'] {
  const verifiedLevel = input.claimStatus === 'VERIFIED' ? input.verifiedProficiency : null;
  const assessedLevel = input.assessment?.highestSupportedProficiency ?? null;
  const inferredLevel =
    input.inference?.outcome === 'INFERRED' ? input.inference.inferredProficiency : null;

  const verified =
    verifiedLevel !== null
      ? conclusion(
          verifiedLevel,
          `Verified on your profile at ${verifiedLevel.replaceAll('_', ' ').toLowerCase()}.`,
          'SKILL_CLAIM',
        )
      : null;

  const assessmentSupported =
    assessedLevel !== null
      ? conclusion(
          assessedLevel,
          input.assessment?.interviewExplanation?.trim() ||
            `Latest assessment supports up to ${assessedLevel.replaceAll('_', ' ').toLowerCase()}.`,
          'ASSESSMENT',
        )
      : null;

  const evidenceInferred =
    inferredLevel !== null
      ? conclusion(
          inferredLevel,
          input.inference?.confidenceReason ??
            'Evidence fusion produced an inferred proficiency separate from your verified claim.',
          'FUSION',
        )
      : input.inference?.outcome === 'INSUFFICIENT_EVIDENCE'
        ? conclusion(null, input.inference.confidenceReason, 'FUSION')
        : null;

  const alignment = resolveAlignment(verifiedLevel, assessedLevel, inferredLevel);

  let headline = 'No verified, assessed, or inferred level is on file yet.';
  if (alignment === 'ALIGNED' && (verifiedLevel ?? assessedLevel ?? inferredLevel)) {
    const level = verifiedLevel ?? assessedLevel ?? inferredLevel;
    headline = `Verified, assessment, and evidence signals align at ${level?.replaceAll('_', ' ').toLowerCase() ?? 'this level'}.`;
  } else if (alignment === 'VERIFIED_ONLY' && verifiedLevel) {
    headline = `Profile shows a verified ${verifiedLevel.replaceAll('_', ' ').toLowerCase()} level; assessment or evidence fusion has not added a conflicting signal.`;
  } else if (alignment === 'INFERENCE_ONLY' && inferredLevel) {
    headline = `Evidence fusion suggests ${inferredLevel.replaceAll('_', ' ').toLowerCase()} without a verified claim on file.`;
  } else if (alignment === 'INFERENCE_DIVERGES_FROM_VERIFIED') {
    headline =
      'AI evidence fusion differs from your verified claim — review linked projects and assessment results.';
  } else if (alignment === 'ASSESSED_BELOW_VERIFIED' && verifiedLevel && assessedLevel) {
    headline = `Latest assessment supports a lower level than your verified ${verifiedLevel.replaceAll('_', ' ').toLowerCase()} claim.`;
  } else if (alignment === 'ASSESSED_ABOVE_VERIFIED' && verifiedLevel && assessedLevel) {
    headline = `Assessment indicates stronger demonstration than your current verified ${verifiedLevel.replaceAll('_', ' ').toLowerCase()} level.`;
  }

  const detailParts: string[] = [];
  if (verified) detailParts.push(verified.summary);
  if (assessmentSupported) detailParts.push(assessmentSupported.summary);
  if (evidenceInferred) detailParts.push(evidenceInferred.summary);

  return {
    verified,
    assessmentSupported,
    evidenceInferred,
    alignment,
    headline,
    detail: detailParts.join(' '),
  };
}

export function buildSkillLevelExplanation(
  input: BuildSkillLevelExplanationInput,
): SkillLevelExplanation {
  const fusion = input.inference?.fusion ?? null;
  const evidenceCount = input.inference?.evidenceCount ?? 0;
  const hasAssessment = input.assessment !== null;
  const basis = resolveBasis(hasAssessment, evidenceCount);

  const confidence: AssessmentConfidenceLevel =
    fusion?.confidence ?? input.assessment?.confidence ?? 'LOW';
  const confidenceReason =
    fusion?.confidenceReason ??
    input.inference?.confidenceReason ??
    (input.assessment
      ? 'Based on the latest assessment attempt.'
      : 'Insufficient evidence to rate confidence.');

  const freshness = input.freshnessRows.map((row) => {
    const freshnessClass = classifyFreshness(row.ageDays, row.maxAgeDays);
    const staleAffectsConfidence = freshnessClass === 'STALE' || freshnessClass === 'EXPIRED';
    return {
      evidenceId: row.evidenceId,
      label: row.label,
      freshnessClass,
      ageDays: row.ageDays,
      maxAgeDays: row.maxAgeDays,
      staleAffectsConfidence,
    };
  });

  return {
    skillCode: input.skillCode,
    skillName: input.skillName,
    claimStatus: input.claimStatus,
    basis,
    whyThisLevel: buildWhyThisLevel({
      basis,
      fusion,
      verifiedProficiency: input.verifiedProficiency,
      assessment: input.assessment,
      inference: input.inference,
    }),
    verifiedVsAi: buildVerifiedVsAi({
      claimStatus: input.claimStatus,
      verifiedProficiency: input.verifiedProficiency,
      assessment: input.assessment,
      inference: input.inference,
    }),
    competencyRows: competencyRowsFromFusion(fusion),
    reportRefs: [...input.reportRefs],
    freshness,
    confidence,
    confidenceReason,
    ruleSetVersion: fusion?.ruleSetVersion ?? 'v1',
    computedAt: input.computedAt,
  };
}

export function buildEmployerConfidenceIndicators(
  explanation: SkillLevelExplanation,
  evidenceCount: number,
): EmployerSkillConfidenceIndicator[] {
  const indicators: EmployerSkillConfidenceIndicator[] = [];

  if (explanation.claimStatus === 'VERIFIED' && explanation.verifiedVsAi.verified?.proficiency) {
    indicators.push({
      code: 'VERIFIED_SKILL',
      label: 'SMART-verified skill level on profile',
      tone: 'positive',
    });
  }

  if (explanation.basis === 'ASSESSMENT_AND_EVIDENCE') {
    indicators.push({
      code: 'MULTI_SOURCE',
      label: 'Assessment and project evidence both contributed',
      tone: 'positive',
    });
  }

  if (explanation.basis === 'EVIDENCE_ONLY') {
    indicators.push({
      code: 'AI_INFERENCE',
      label: 'Level inferred from project evidence (no assessment)',
      tone: 'neutral',
    });
  } else if (explanation.verifiedVsAi.evidenceInferred?.proficiency) {
    indicators.push({
      code: 'AI_INFERENCE',
      label: 'AI evidence fusion informs capability readout',
      tone: 'neutral',
    });
  }

  if (evidenceCount < 2) {
    indicators.push({
      code: 'LOW_EVIDENCE',
      label: 'Limited linked evidence for this skill',
      tone: 'caution',
    });
  }

  const stale = explanation.freshness.some(
    (row) => row.freshnessClass === 'STALE' || row.freshnessClass === 'EXPIRED',
  );
  if (stale) {
    indicators.push({
      code: 'STALE_EVIDENCE',
      label: 'Some linked evidence is aging — confidence may be reduced',
      tone: 'caution',
    });
  } else if (
    explanation.freshness.length > 0 &&
    explanation.freshness.every(
      (row) => row.freshnessClass === 'CURRENT' || row.freshnessClass === 'RECENT',
    )
  ) {
    indicators.push({
      code: 'FRESH_EVIDENCE',
      label: 'Linked evidence is current',
      tone: 'positive',
    });
  }

  if (
    explanation.verifiedVsAi.alignment === 'INFERENCE_DIVERGES_FROM_VERIFIED' ||
    explanation.verifiedVsAi.alignment === 'ASSESSED_BELOW_VERIFIED'
  ) {
    indicators.push({
      code: 'DIVERGENT_SOURCES',
      label: 'Verified level and AI/assessment signals diverge',
      tone: 'caution',
    });
  }

  return indicators.slice(0, 8);
}

export function buildEmployerSkillInspection(
  studentId: string,
  explanation: SkillLevelExplanation,
  evidenceCount: number,
): EmployerSkillInspection {
  return {
    ...explanation,
    studentId,
    employerConfidenceIndicators: buildEmployerConfidenceIndicators(explanation, evidenceCount),
  };
}
