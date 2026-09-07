import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SkillVerifySessionDto } from '@smart/contracts';
import { SkillVerifyExam, isSkillVerifyAnswered, splitProblemProse } from './skill-verify-exam';

function session(overrides: Partial<SkillVerifySessionDto> = {}): SkillVerifySessionDto {
  return {
    sessionId: '55555555-5555-4555-8555-555555555555',
    claimId: '44444444-4444-4444-8444-444444444444',
    skillCode: 'GIT_VERSION_CONTROL',
    proficiency: 'BEGINNER',
    timeMinutes: 30,
    passMarkPercent: 70,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    serverRemainingSeconds: 1800,
    items: [
      {
        index: 1,
        format: 'MCQ',
        prompt: 'First stem',
        options: { A: 'One', B: 'Two', C: 'Three', D: 'Four' },
      },
      {
        index: 2,
        format: 'SCENARIO',
        prompt: 'Second stem',
        options: null,
      },
    ],
    answers: [],
    ...overrides,
  };
}

describe('SkillVerifyExam layout', () => {
  it('shows only the current question stem', () => {
    render(
      <SkillVerifyExam
        session={session()}
        currentIndex={0}
        answers={{}}
        pending={false}
        error={null}
        onSelectKey={vi.fn()}
        onChangeText={vi.fn()}
        onGoTo={vi.fn()}
        onClear={vi.fn()}
        onExit={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('First stem')).toBeDefined();
    expect(screen.queryByText('Second stem')).toBeNull();
    expect(screen.getByText('Question 1 of 2')).toBeDefined();
    expect(screen.getByText('Single Choice')).toBeDefined();
    expect(screen.queryByText(/Pass bar/)).toBeNull();
    expect(screen.getByRole('button', { name: /submit and see results/i })).toBeDefined();
    expect(screen.queryByText('Monitoring')).toBeNull();
  });

  it('jumps from the question palette and clears an MCQ', () => {
    const onGoTo = vi.fn();
    const onClear = vi.fn();
    render(
      <SkillVerifyExam
        session={session()}
        currentIndex={0}
        answers={{ 1: { selectedKey: 'B' } }}
        pending={false}
        error={null}
        onSelectKey={vi.fn()}
        onChangeText={vi.fn()}
        onGoTo={onGoTo}
        onClear={onClear}
        onExit={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Question 2' }));
    expect(onGoTo).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: /clear response/i }));
    expect(onClear).toHaveBeenCalledWith(1);
  });

  it('treats whitespace-only text as unanswered', () => {
    expect(isSkillVerifyAnswered({ text: '   ' })).toBe(false);
    expect(isSkillVerifyAnswered({ selectedKey: 'A' })).toBe(true);
  });

  it('splits numbered requirements out of a coding stem', () => {
    const blocks = splitProblemProse('Intro line.\n\n1. First rule\n2. Second rule');
    expect(blocks).toEqual([
      { type: 'p', text: 'Intro line.' },
      { type: 'ol', items: ['First rule', 'Second rule'] },
    ]);
  });

  it('renders a LeetCode-style statement and visible test cases for coding items', () => {
    render(
      <SkillVerifyExam
        session={session({
          items: [
            {
              index: 1,
              format: 'CODING',
              title: 'Two Sum',
              prompt:
                'Create a component named StepCounter.\n\n1. Keep count in state\n2. Expose data-testid attributes',
              options: null,
              constraints: 'Use React 18+\n- Functional components only',
              examples: [
                { input: 'nums = [2,7], target = 9', output: '[0,1]', explanation: '2+7=9' },
              ],
            },
          ],
        })}
        currentIndex={0}
        answers={{}}
        pending={false}
        error={null}
        onSelectKey={vi.fn()}
        onChangeText={vi.fn()}
        onGoTo={vi.fn()}
        onClear={vi.fn()}
        onExit={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('Two Sum')).toBeDefined();
    expect(screen.getByText('Examples')).toBeDefined();
    expect(screen.getByText('Keep count in state')).toBeDefined();
    expect(screen.queryByText(/Pass bar/)).toBeNull();
    expect(screen.queryByPlaceholderText(/hidden tests/i)).toBeNull();
    expect(screen.getByPlaceholderText('Write your solution')).toBeDefined();
    expect(screen.getByLabelText('Code solution')).toBeDefined();
    expect(
      screen.getAllByRole('button', { name: /submit and see results/i }).length,
    ).toBeGreaterThan(0);
  });
});
