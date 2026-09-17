import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkillVerifyLoading } from './skill-verify-loading';

describe('SkillVerifyLoading', () => {
  it('shows the wait game instead of a building-assessment card', () => {
    render(<SkillVerifyLoading generating error={null} />);
    expect(screen.queryByText('Building your assessment')).toBeNull();
    expect(screen.getByLabelText('Pulse wait game')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Skill verification' })).toBeTruthy();
    expect(screen.queryByText('Questions are generating')).toBeNull();
    expect(screen.getByText('Warming up')).toBeTruthy();
  });

  it('surfaces generate errors instead of the game', () => {
    render(
      <SkillVerifyLoading
        generating
        error={{
          kind: 'generation_failed',
          title: 'Assessment unavailable',
          message: 'We could not prepare your assessment right now.',
        }}
      />,
    );
    expect(screen.getByText('Assessment unavailable')).toBeTruthy();
    expect(screen.getByText(/could not prepare your assessment/i)).toBeTruthy();
    expect(screen.queryByLabelText('Pulse wait game')).toBeNull();
  });
});
