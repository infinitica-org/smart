import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SkillClaimDto } from '@smart/contracts';
import { SkillVerifyRow } from './skill-verify-row';

function claim(overrides: Partial<SkillClaimDto> = {}): SkillClaimDto {
  return {
    claimId: '44444444-4444-4444-8444-444444444444',
    studentId: '11111111-1111-4111-8111-111111111111',
    skillCode: 'GITOPS_CONTINUOUS_DELIVERY',
    proficiency: 'BEGINNER',
    status: 'LOCKED',
    strikes: 2,
    lockedUntil: '2099-09-07T09:30:00.000Z',
    lastAttemptId: null,
    retryAvailableAt: '2099-09-07T09:30:00.000Z',
    skillFocus: 'Branching',
    ...overrides,
  };
}

describe('SkillVerifyRow lock time', () => {
  it('does not render a proficiency picker', () => {
    render(
      <SkillVerifyRow
        skillCode="SQL_QUERY_OPTIMIZATION"
        skillName="SQL"
        claim={claim({
          skillCode: 'SQL_QUERY_OPTIMIZATION',
          status: 'DECLARED',
          lockedUntil: null,
          retryAvailableAt: null,
        })}
        focus="Query tuning"
        pending={false}
        onFocus={vi.fn()}
        onVerify={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/Proficiency for SQL/i)).toBeNull();
    expect(screen.getByLabelText(/Focus for SQL/i)).toBeTruthy();
  });

  it('shows the unlock time next to the skill name', () => {
    render(
      <SkillVerifyRow
        skillCode="GITOPS_CONTINUOUS_DELIVERY"
        skillName="Git"
        claim={claim()}
        focus="Branching"
        pending={false}
        onFocus={vi.fn()}
        onVerify={vi.fn()}
      />,
    );
    expect(screen.getByText('Git')).toBeTruthy();
    expect(screen.getByText(/locked until/i)).toBeTruthy();
  });
});
