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

export type VerificationMode = 'discovery' | 'declared-target';

export type AssessmentIntelligenceInput = {
  readonly competencyModel: readonly SkillCompetency[];
  readonly proficiencyRequirements: readonly ProficiencyRequirement[];
  readonly items: readonly ScoredCompetencyItem[];
  readonly targetProficiency: ProficiencyLevel;
  readonly verificationMode?: VerificationMode;
  /** When false, do not request another upward probe after the diagnostic form. */
  readonly allowUpwardProbe?: boolean;
};

export type AssessmentIntelligenceOutput = {
  readonly competencyResults: CompetencyResult[];
  readonly highestAssessmentSupportedProficiency: ProficiencyLevel | null;
  readonly confidence: AssessmentConfidenceLevel;
  readonly uncertainties: string[];
  readonly recommendedNextStep: RecommendedNextStep;
  readonly requiresInterview: boolean;
  readonly requiresEvidenceVerification: boolean;
  readonly requiresAdditionalAssessment: boolean;
  readonly assessmentComplete: boolean;
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
): ProficiencyLevel | null {
  const statuses = new Map(competencyResults.map((row) => [row.competencyId, row.status]));
  let supported: ProficiencyLevel | null = null;
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

/** Competencies that could still change the supported proficiency if resolved. */
export function competencyIdsBlockingProficiency(
  competencyResults: readonly CompetencyResult[],
  supported: ProficiencyLevel | null,
  requirements: readonly ProficiencyRequirement[],
): string[] {
  if (supported === null) {
    const beginner = requirements.find((row) => row.level === 'BEGINNER');
    if (!beginner) return competencyIdsNeedingTargetedAssessment(competencyResults);
    const statuses = new Map(competencyResults.map((row) => [row.competencyId, row.status]));
    return beginner.criticalCompetencyIds.filter((id) => {
      const status = statuses.get(id);
      return status !== 'DEMONSTRATED' && status !== 'PARTIALLY_DEMONSTRATED';
    });
  }

  const supportedReq = requirements.find((row) => row.level === supported);
  if (!supportedReq) return [];

  const statuses = new Map(competencyResults.map((row) => [row.competencyId, row.status]));
  return supportedReq.criticalCompetencyIds.filter((competencyId) => {
    const status = statuses.get(competencyId);
    return (
      status === 'UNCERTAIN' || status === 'NOT_DEMONSTRATED' || status === 'PARTIALLY_DEMONSTRATED'
    );
  });
}

export function nextLevelProbeCompetencyIds(
  supported: ProficiencyLevel,
  competencyResults: readonly CompetencyResult[],
  requirements: readonly ProficiencyRequirement[],
  targetProficiency: ProficiencyLevel,
): string[] {
  const nextIndex = proficiencyIndex(supported) + 1;
  const nextLevel = PROFICIENCY_ORDER[nextIndex];
  if (!nextLevel || compareProficiency(nextLevel, targetProficiency) > 0) {
    return [];
  }
  const nextReq = requirements.find((row) => row.level === nextLevel);
  if (!nextReq) return [];
  const statuses = new Map(competencyResults.map((row) => [row.competencyId, row.status]));
  return nextReq.criticalCompetencyIds.filter((competencyId) => {
    const status = statuses.get(competencyId);
    return (
      status === 'NOT_TESTED' ||
      status === 'UNCERTAIN' ||
      status === 'NOT_DEMONSTRATED' ||
      status === 'PARTIALLY_DEMONSTRATED'
    );
  });
}

export function shouldStopTesting(
  competencyResults: readonly CompetencyResult[],
  targetProficiency: ProficiencyLevel,
  requirements: readonly ProficiencyRequirement[],
  allowUpwardProbe = true,
): boolean {
  const supported = determineSupportedProficiency(competencyResults, requirements);
  if (supported !== null) {
    if (competencyIdsBlockingProficiency(competencyResults, supported, requirements).length > 0) {
      return false;
    }
    if (!allowUpwardProbe) {
      return true;
    }
    if (compareProficiency(supported, targetProficiency) >= 0) {
      return true;
    }
    return (
      nextLevelProbeCompetencyIds(supported, competencyResults, requirements, targetProficiency)
        .length === 0
    );
  }
  const unresolved = competencyIdsNeedingTargetedAssessment(competencyResults);
  const targetReq = requirements.find((row) => row.level === targetProficiency);
  if (!targetReq) return unresolved.length === 0;
  const targetCritical = targetReq.criticalCompetencyIds.filter((id) => unresolved.includes(id));
  return targetCritical.length === 0 && unresolved.length <= 1;
}

export function recommendAssessmentNextStep(input: {
  supportedProficiency: ProficiencyLevel | null;
  targetProficiency: ProficiencyLevel;
  competencyResults: readonly CompetencyResult[];
  requirements: readonly ProficiencyRequirement[];
  stageComplete: boolean;
  verificationMode?: VerificationMode;
  allowUpwardProbe?: boolean;
}): {
  recommendedNextStep: RecommendedNextStep;
  requiresAdditionalAssessment: boolean;
} {
  const allowUpwardProbe = input.allowUpwardProbe ?? true;
  const blocking = competencyIdsBlockingProficiency(
    input.competencyResults,
    input.supportedProficiency,
    input.requirements,
  );
  const probeIds =
    input.supportedProficiency === null
      ? competencyIdsNeedingTargetedAssessment(input.competencyResults)
      : allowUpwardProbe
        ? nextLevelProbeCompetencyIds(
            input.supportedProficiency,
            input.competencyResults,
            input.requirements,
            input.targetProficiency,
          )
        : [];
  if (!input.stageComplete && (blocking.length > 0 || probeIds.length > 0)) {
    return {
      recommendedNextStep: 'REMEDIATION',
      requiresAdditionalAssessment: false,
    };
  }

  const verificationMode = input.verificationMode ?? 'declared-target';
  if (verificationMode === 'discovery') {
    if (input.supportedProficiency === null) {
      return {
        recommendedNextStep: 'REMEDIATION',
        requiresAdditionalAssessment: false,
      };
    }
  } else if (
    input.supportedProficiency === null ||
    compareProficiency(input.supportedProficiency, input.targetProficiency) < 0
  ) {
    return {
      recommendedNextStep: 'REMEDIATION',
      requiresAdditionalAssessment: false,
    };
  }

  return {
    recommendedNextStep: 'NONE',
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
    const allowUpwardProbe = input.allowUpwardProbe ?? true;
    const stageComplete = shouldStopTesting(
      competencyResults,
      input.targetProficiency,
      input.proficiencyRequirements,
      allowUpwardProbe,
    );
    const next = recommendAssessmentNextStep({
      supportedProficiency: highestAssessmentSupportedProficiency,
      targetProficiency: input.targetProficiency,
      competencyResults,
      requirements: input.proficiencyRequirements,
      stageComplete,
      verificationMode: input.verificationMode,
      allowUpwardProbe,
    });
    const assessmentComplete =
      highestAssessmentSupportedProficiency !== null && next.recommendedNextStep !== 'REMEDIATION';

    return {
      competencyResults,
      highestAssessmentSupportedProficiency,
      confidence,
      uncertainties,
      recommendedNextStep: next.recommendedNextStep,
      requiresInterview: false,
      requiresEvidenceVerification: false,
      requiresAdditionalAssessment: next.requiresAdditionalAssessment,
      assessmentComplete,
      assessmentPassed: assessmentComplete,
      scorePercent,
    };
  });
}

export function proficiencyMeetsTarget(
  supported: ProficiencyLevel | null,
  target: ProficiencyLevel,
): boolean {
  if (supported === null) return false;
  return compareProficiency(supported, target) >= 0;
}
