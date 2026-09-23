import {
  PROFICIENCY_LEVEL_ORDER,
  type SkillCompetency,
  type CompetencyStatus,
  type TrustTier,
} from '@smart/contracts';
import type { ObservationBundle } from '@smart/contracts';

const DIFFICULTY_ORDER = PROFICIENCY_LEVEL_ORDER;

export function difficultyIndex(d: SkillCompetency['difficulty']): number {
  if (!d) return 0;
  const idx = DIFFICULTY_ORDER.indexOf(d);
  return idx >= 0 ? idx : 0;
}

export function isSourceAdmissibleForCompetency(
  sourceId: 'ASSESSMENT' | 'PROJECT',
  competency: SkillCompetency,
): boolean {
  const role = competency.role ?? 'supporting';
  const diffIdx = difficultyIndex(competency.difficulty);
  const intIdx = difficultyIndex('INTERMEDIATE');

  if (sourceId === 'ASSESSMENT') return true;

  if (sourceId === 'PROJECT') {
    if (role === 'core' && diffIdx <= intIdx) return false;
    return role === 'supporting' || role === 'critical';
  }

  return false;
}

export function meetsTrustTierForStatus(trustTier: TrustTier, status: CompetencyStatus): boolean {
  switch (status) {
    case 'DEMONSTRATED':
      return trustTier === 'TRUSTED';
    case 'PARTIALLY_DEMONSTRATED':
    case 'UNCERTAIN':
      return trustTier === 'TRUSTED' || trustTier === 'PROVISIONAL';
    default:
      return trustTier !== 'UNAVAILABLE';
  }
}

export function filterAdmissibleObservations(input: {
  competency: SkillCompetency;
  sources: readonly ObservationBundle[];
}): Array<{
  sourceId: 'ASSESSMENT' | 'PROJECT';
  observation: ObservationBundle['observations'][0];
}> {
  const out: Array<{
    sourceId: 'ASSESSMENT' | 'PROJECT';
    observation: ObservationBundle['observations'][0];
  }> = [];

  for (const bundle of input.sources) {
    if (!bundle.available || bundle.trustTier === 'UNAVAILABLE') continue;
    if (!isSourceAdmissibleForCompetency(bundle.sourceId, input.competency)) continue;

    const obs = bundle.observations.find((o) => o.competencyId === input.competency.competencyId);
    if (!obs) continue;
    if (!meetsTrustTierForStatus(bundle.trustTier, obs.claimedStatus)) continue;

    out.push({ sourceId: bundle.sourceId, observation: obs });
  }

  return out;
}
