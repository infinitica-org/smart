import { Effect } from 'effect';
import type {
  AssessmentConfidenceLevel,
  CompetencyResult,
  CompetencyStatus,
  ProficiencyRequirement,
  RecommendedNextStep,
  SkillCompetency,
} from '@smart/contracts';

export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';

const PROFICIENCY_ORDER: readonly ProficiencyLevel[] = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'PROFESSIONAL',
];

export type ScoredCompetencyItem = {
  readonly competencyIds: readonly string[];
  readonly marksEarned: number;
  readonly marksMax: number;
};

export type CompetencyRollupInput = {
  readonly competencyModel: readonly SkillCompetency[];
  readonly items: readonly ScoredCompetencyItem[];
};

export type AssessmentIntelligenceInput = {
  readonly competencyModel: readonly SkillCompetency[];
  readonly proficiencyRequirements: readonly ProficiencyRequirement[];
  readonly items: readonly ScoredCompetencyItem[];
  readonly targetProficiency: ProficiencyLevel;
};

export type AssessmentIntelligenceOutput = {
  readonly competencyResults: CompetencyResult[];
  readonly highestAssessmentSupportedProficiency: ProficiencyLevel;
  readonly confidence: AssessmentConfidenceLevel;
  readonly uncertainties: string[];
  readonly recommendedNextStep: RecommendedNextStep;
  readonly requiresInterview: boolean;
  readonly requiresAdditionalAssessment: boolean;
  readonly assessmentPassed: boolean;
  readonly scorePercent: number;
};

function proficiencyIndex(level: ProficiencyLevel): number {
  return PROFICIENCY_ORDER.indexOf(level);
}

function compareProficiency(a: ProficiencyLevel, b: ProficiencyLevel): number {
  return proficiencyIndex(a) - proficiencyIndex(b);
}

function meetsProficiency(
  level: ProficiencyLevel,
  statuses: ReadonlyMap<string, CompetencyStatus>,
  requirements: readonly ProficiencyRequirement[],
): boolean {
  const requirement = requirements.find((entry) => entry.level === level);
  if (!requirement) return false;
  for (const competencyId of requirement.requiredCompetencyIds) {
    const status = statuses.get(competencyId);
    if (status !== 'DEMONSTRATED' && status !== 'PARTIALLY_DEMONSTRATED') {
      return false;
    }
  }
  for (const competencyId of requirement.criticalCompetencyIds) {
    if (statuses.get(competencyId) !== 'DEMONSTRATED') {
      return false;
    }
  }
  return true;
}

function statusFromRatio(ratio: number, tested: boolean): CompetencyStatus {
  if (!tested) return 'NOT_TESTED';
  if (ratio >= 0.75) return 'DEMONSTRATED';
  if (ratio >= 0.45) return 'PARTIALLY_DEMONSTRATED';
  if (ratio >= 0.2) return 'UNCERTAIN';
  return 'NOT_DEMONSTRATED';
}

function confidenceFromStatus(
  status: CompetencyStatus,
  sampleSize: number,
): AssessmentConfidenceLevel {
  if (status === 'NOT_TESTED') return 'LOW';
  if (status === 'UNCERTAIN') return 'LOW';
  if (status === 'NOT_DEMONSTRATED') return sampleSize >= 2 ? 'MEDIUM' : 'LOW';
  if (status === 'PARTIALLY_DEMONSTRATED') return sampleSize >= 2 ? 'MEDIUM' : 'LOW';
  return sampleSize >= 2 ? 'HIGH' : 'MEDIUM';
}

export function rollupItemResultsToCompetencies(input: CompetencyRollupInput): CompetencyResult[] {
  const aggregates = new Map<string, { earned: number; max: number; count: number }>();
  for (const competency of input.competencyModel) {
    aggregates.set(competency.competencyId, { earned: 0, max: 0, count: 0 });
  }
  for (const item of input.items) {
    const ids = item.competencyIds.length > 0 ? item.competencyIds : [];
    for (const competencyId of ids) {
      const row = aggregates.get(competencyId);
      if (!row) continue;
      row.earned += item.marksEarned;
      row.max += item.marksMax;
      row.count += 1;
    }
  }
  return input.competencyModel.map((competency) => {
    const row = aggregates.get(competency.competencyId) ?? { earned: 0, max: 0, count: 0 };
    const ratio = row.max > 0 ? row.earned / row.max : 0;
    const status = statusFromRatio(ratio, row.count > 0);
    return {
      competencyId: competency.competencyId,
      status,
      confidence: confidenceFromStatus(status, row.count),
      evidence: row.count > 0 ? [`${String(row.count)} assessment item(s)`] : [],
    };
  });
}

export function determineSupportedProficiency(
  competencyResults: readonly CompetencyResult[],
  requirements: readonly ProficiencyRequirement[],
): ProficiencyLevel {
  const statuses = new Map(competencyResults.map((row) => [row.competencyId, row.status]));
  let supported: ProficiencyLevel = 'BEGINNER';
  for (const level of PROFICIENCY_ORDER) {
    if (meetsProficiency(level, statuses, requirements)) {
      supported = level;
    }
  }
  return supported;
}

export function computeAssessmentConfidence(
  competencyResults: readonly CompetencyResult[],
  testedItemCount: number,
): AssessmentConfidenceLevel {
  const tested = competencyResults.filter((row) => row.status !== 'NOT_TESTED');
  if (tested.length === 0 || testedItemCount === 0) return 'LOW';
  const high = tested.filter((row) => row.confidence === 'HIGH').length;
  const uncertain = tested.filter((row) => row.status === 'UNCERTAIN').length;
  if (uncertain >= 2) return 'LOW';
  if (high >= Math.ceil(tested.length * 0.6) && testedItemCount >= 4) return 'HIGH';
  if (testedItemCount >= 2) return 'MEDIUM';
  return 'LOW';
}

export function listUncertainCompetencies(
  competencyResults: readonly CompetencyResult[],
  competencyModel: readonly SkillCompetency[],
): string[] {
  const byId = new Map(competencyModel.map((row) => [row.competencyId, row.capability]));
  return competencyResults
    .filter(
      (row) =>
        row.status === 'UNCERTAIN' ||
        row.status === 'NOT_DEMONSTRATED' ||
        row.status === 'PARTIALLY_DEMONSTRATED',
    )
    .map((row) => byId.get(row.competencyId) ?? row.competencyId);
}

export function competencyIdsNeedingTargetedAssessment(
  competencyResults: readonly CompetencyResult[],
): string[] {
  return competencyResults
    .filter(
      (row) =>
        row.status === 'UNCERTAIN' ||
        row.status === 'NOT_DEMONSTRATED' ||
        row.status === 'PARTIALLY_DEMONSTRATED' ||
        row.status === 'NOT_TESTED',
    )
    .map((row) => row.competencyId);
}

export function shouldStopTesting(
  competencyResults: readonly CompetencyResult[],
  targetProficiency: ProficiencyLevel,
  requirements: readonly ProficiencyRequirement[],
): boolean {
  const supported = determineSupportedProficiency(competencyResults, requirements);
  if (compareProficiency(supported, targetProficiency) >= 0) {
    return true;
  }
  const unresolved = competencyIdsNeedingTargetedAssessment(competencyResults);
  const targetReq = requirements.find((row) => row.level === targetProficiency);
  if (!targetReq) return unresolved.length === 0;
  const targetCritical = targetReq.criticalCompetencyIds.filter((id) => unresolved.includes(id));
  return targetCritical.length === 0 && unresolved.length <= 1;
}

export function recommendNextStep(input: {
  supportedProficiency: ProficiencyLevel;
  targetProficiency: ProficiencyLevel;
  competencyResults: readonly CompetencyResult[];
  confidence: AssessmentConfidenceLevel;
  requiresInterviewGate: boolean;
  requiresEvidenceGate: boolean;
  stageComplete: boolean;
}): {
  recommendedNextStep: RecommendedNextStep;
  requiresInterview: boolean;
  requiresAdditionalAssessment: boolean;
} {
  const unresolved = competencyIdsNeedingTargetedAssessment(input.competencyResults);
  if (!input.stageComplete && unresolved.length > 0) {
    return {
      recommendedNextStep: 'TARGETED_ASSESSMENT',
      requiresInterview: false,
      requiresAdditionalAssessment: true,
    };
  }
  if (compareProficiency(input.supportedProficiency, input.targetProficiency) < 0) {
    return {
      recommendedNextStep: 'REMEDIATION',
      requiresInterview: false,
      requiresAdditionalAssessment: false,
    };
  }
  if (input.requiresEvidenceGate) {
    return {
      recommendedNextStep: 'EVIDENCE_VERIFICATION',
      requiresInterview: input.requiresInterviewGate,
      requiresAdditionalAssessment: false,
    };
  }
  if (input.requiresInterviewGate || input.confidence === 'LOW') {
    return {
      recommendedNextStep: 'INTERVIEW',
      requiresInterview: true,
      requiresAdditionalAssessment: false,
    };
  }
  return {
    recommendedNextStep: 'NONE',
    requiresInterview: false,
    requiresAdditionalAssessment: false,
  };
}

export function evaluateAssessmentIntelligence(
  input: AssessmentIntelligenceInput,
): Effect.Effect<AssessmentIntelligenceOutput, never> {
  return Effect.sync(() => {
    const competencyResults = rollupItemResultsToCompetencies({
      competencyModel: input.competencyModel,
      items: input.items,
    });
    const highestAssessmentSupportedProficiency = determineSupportedProficiency(
      competencyResults,
      input.proficiencyRequirements,
    );
    const scorePercent =
      (input.items.reduce((sum, row) => sum + row.marksEarned, 0) /
        Math.max(
          1,
          input.items.reduce((sum, row) => sum + row.marksMax, 0),
        )) *
      100;
    const confidence = computeAssessmentConfidence(competencyResults, input.items.length);
    const uncertainties = listUncertainCompetencies(competencyResults, input.competencyModel);
    const requiresInterviewGate =
      (input.targetProficiency === 'ADVANCED' || input.targetProficiency === 'PROFESSIONAL') &&
      compareProficiency(highestAssessmentSupportedProficiency, input.targetProficiency) >= 0;
    const requiresEvidenceGate = input.targetProficiency === 'PROFESSIONAL';
    const stageComplete = shouldStopTesting(
      competencyResults,
      input.targetProficiency,
      input.proficiencyRequirements,
    );
    const next = recommendNextStep({
      supportedProficiency: highestAssessmentSupportedProficiency,
      targetProficiency: input.targetProficiency,
      competencyResults,
      confidence,
      requiresInterviewGate,
      requiresEvidenceGate,
      stageComplete,
    });
    const assessmentPassed =
      compareProficiency(highestAssessmentSupportedProficiency, input.targetProficiency) >= 0 &&
      next.recommendedNextStep !== 'EVIDENCE_VERIFICATION' &&
      next.recommendedNextStep !== 'INTERVIEW';
    return {
      competencyResults,
      highestAssessmentSupportedProficiency,
      confidence,
      uncertainties,
      recommendedNextStep: next.recommendedNextStep,
      requiresInterview: next.requiresInterview,
      requiresAdditionalAssessment: next.requiresAdditionalAssessment,
      assessmentPassed,
      scorePercent,
    };
  });
}

export function proficiencyMeetsTarget(
  supported: ProficiencyLevel,
  target: ProficiencyLevel,
): boolean {
  return compareProficiency(supported, target) >= 0;
}
