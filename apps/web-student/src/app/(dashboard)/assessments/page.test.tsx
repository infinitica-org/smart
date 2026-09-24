import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AssessmentsPage from './page';

vi.mock('@/components/assessment/StudentAssessmentHub', () => ({
  StudentAssessmentHub: () => <div data-testid="assessment-hub" />,
}));

// The former Skill Repository page (add-skill dialog, claim evidence panels) was replaced by
// StudentAssessmentHub; skill selection now lives in SkillsSection, which has its own tests.
describe('AssessmentsPage', () => {
  it('renders the assessment hub', () => {
    render(<AssessmentsPage />);
    expect(screen.getByTestId('assessment-hub')).toBeTruthy();
  });
});
