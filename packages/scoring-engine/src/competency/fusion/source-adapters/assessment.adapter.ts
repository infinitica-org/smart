import type { SkillCompetency, CompetencyResult } from '@smart/contracts';
import type { ObservationBundle, Observation } from '@smart/contracts';

export function assessmentToObservationBundle(input: {
  competencyResults: readonly CompetencyResult[];
  testedItemCount: number;
  proctoringRiskHigh: boolean;
  competencyModel: readonly SkillCompetency[];
}): ObservationBundle {
  const trustTier = input.proctoringRiskHigh ? 'PROVISIONAL' : 'TRUSTED';
  const byId = new Map(input.competencyResults.map((r) => [r.competencyId, r]));

  const observations: Observation[] = input.competencyModel.map((comp) => {
    const row = byId.get(comp.competencyId);
    const itemCount = row?.evidence.some((e) => e.includes('assessment item'))
      ? parseInt(row.evidence[0]?.match(/(\d+)/)?.[1] ?? '0', 10)
      : row && row.status !== 'NOT_TESTED'
        ? 1
        : 0;

    return {
      competencyId: comp.competencyId,
      capability: comp.capability,
      claimedStatus: row?.status ?? 'NOT_TESTED',
      evidence: row?.evidence ?? [],
      itemCount,
    };
  });

  return {
    sourceId: 'ASSESSMENT',
    available: true,
    trustTier,
    observations,
    authenticityFlags: [],
    metadata: {
      testedItemCount: input.testedItemCount ?? 0,
    },
  };
}
