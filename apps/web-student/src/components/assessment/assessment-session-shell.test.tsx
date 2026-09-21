import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssessmentSessionShell, SessionProgressBar } from './assessment-session-shell';

describe('AssessmentSessionShell', () => {
  it('renders title, progress, and regions', () => {
    render(
      <AssessmentSessionShell
        title="Skill verification — React"
        subtitle="Timed assessment"
        progressValue={0.5}
        progressLabel="Question 2 of 4"
        main={<p>Main content</p>}
        aside={<p>Aside content</p>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Skill verification — React' })).toBeDefined();
    expect(screen.getByText('Timed assessment')).toBeDefined();
    expect(screen.getByText('Main content')).toBeDefined();
    expect(screen.getByText('Aside content')).toBeDefined();
    expect(
      screen.getByRole('progressbar', { name: 'Question 2 of 4' }).getAttribute('aria-valuenow'),
    ).toBe('50');
  });
});

describe('SessionProgressBar', () => {
  it('clamps progress values', () => {
    render(<SessionProgressBar value={1.5} label="Done" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });
});
