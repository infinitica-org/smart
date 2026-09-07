import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GradeSdeSkillFormResponse } from '@smart/contracts';
import { SkillVerifyReport } from './skill-verify-report';

const grade: GradeSdeSkillFormResponse = {
  skillCode: 'SDE_DSA',
  proficiency: 'BEGINNER',
  marksEarned: 40,
  marksTotal: 50,
  scorePercent: 80,
  passed: true,
  promptRef: 'sde-skill-open-batch-grader@2',
  mcqCorrect: 6,
  mcqTotal: 8,
  traceCorrect: 2,
  traceTotal: 3,
  itemResults: [
    {
      index: 12,
      format: 'CODING',
      marksEarned: 7,
      marksMax: 10,
      testsPassed: 2,
      testsTotal: 3,
      missedTests: [
        {
          input: 'nums = [3,3], target = 6',
          expected: '[0,1]',
          reason: 'Did not handle duplicate values.',
        },
      ],
      feedback: 'Most cases passed; the duplicate-input path is missing.',
    },
  ],
};

describe('SkillVerifyReport', () => {
  it('shows MCQ counts and missed coding tests', () => {
    const onDone = vi.fn();
    render(<SkillVerifyReport grade={grade} onDone={onDone} />);
    expect(screen.getByText(/6 correct, 2 wrong/)).toBeDefined();
    expect(screen.getByText(/2 of 3 hidden tests passed/)).toBeDefined();
    expect(screen.getByText(/Did not handle duplicate values/)).toBeDefined();
    expect(screen.getByRole('button', { name: /back to skills/i })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /back to skills/i }));
    expect(onDone).toHaveBeenCalled();
  });
});
