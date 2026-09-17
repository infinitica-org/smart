import { describe, expect, it } from 'vitest';

import type { SkillClaimDto } from '@smart/contracts';

import {
  SKILL_PROFICIENCY_DISCOVERY_COPY,
  isProjectTaggedSkillClaim,
  skillClaimOriginHint,
} from './skill-claim-origin-ui';

function claim(partial: Partial<SkillClaimDto>): SkillClaimDto {
  return {
    claimId: 'c1',
    studentId: 's1',
    skillCode: 'SE_PYTHON',
    proficiency: 'BEGINNER',
    status: 'DECLARED',
    strikes: 0,
    lockedUntil: null,
    lastAttemptId: null,
    ...partial,
  };
}

describe('skill-claim-origin-ui', () => {
  it('shows discovery copy for project-tagged claims', () => {
    const row = claim({ declareOrigin: 'PROJECT_TAGGED' });
    expect(isProjectTaggedSkillClaim(row)).toBe(true);
    expect(skillClaimOriginHint(row)).toBe(SKILL_PROFICIENCY_DISCOVERY_COPY);
  });

  it('hides hint once verified', () => {
    expect(
      skillClaimOriginHint(claim({ status: 'VERIFIED', declareOrigin: 'PROJECT_TAGGED' })),
    ).toBe(null);
  });
});
