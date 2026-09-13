import type { ProficiencyRequirementLevel, SkillProficiency } from '@smart/contracts';

import { proficiencyMeetsTarget } from '@smart/scoring-engine';

export function hasDemonstratedProficiency(
  demonstrated: ProficiencyRequirementLevel | null,
): demonstrated is ProficiencyRequirementLevel {
  return demonstrated !== null;
}

export function claimProficiencyFromDemonstrated(
  demonstrated: ProficiencyRequirementLevel,
): SkillProficiency {
  if (demonstrated === 'PROFESSIONAL') {
    return 'PROFESSIONAL';
  }

  if (demonstrated === 'ADVANCED') {
    return 'ADVANCED';
  }

  if (demonstrated === 'INTERMEDIATE') {
    return 'INTERMEDIATE';
  }

  return 'BEGINNER';
}

export function assessmentMeetsTarget(
  supported: ProficiencyRequirementLevel,

  target: SkillProficiency,
): boolean {
  return proficiencyMeetsTarget(
    supported,

    target as ProficiencyRequirementLevel,
  );
}
