import type {
  CapabilityProfileEntry,
  SkillCompetency,
  ProficiencyRequirement,
  ProficiencyLevel,
} from '@smart/contracts';

export function buildCapabilityGaps(
  profile: readonly CapabilityProfileEntry[],
  model: readonly SkillCompetency[],
  target: ProficiencyLevel,
  requirements: readonly ProficiencyRequirement[],
): string[] {
  const req = requirements.find((r) => r.level === target);
  const gaps: string[] = [];

  for (const comp of model) {
    const row = profile.find((p) => p.competencyId === comp.competencyId);
    const status = row?.inferredStatus ?? 'NOT_TESTED';

    if (status === 'NOT_TESTED') {
      gaps.push(`${comp.capability}: not tested`);
    } else if (status === 'UNCERTAIN' || status === 'NOT_DEMONSTRATED') {
      gaps.push(`${comp.capability}: ${status.toLowerCase().replace(/_/g, ' ')}`);
    }

    if (req?.criticalCompetencyIds.includes(comp.competencyId) && status !== 'DEMONSTRATED') {
      gaps.push(`${comp.capability}: critical competency not demonstrated`);
    }
  }

  return gaps.slice(0, 30);
}
