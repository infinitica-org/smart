import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SkillVerifySessionDto } from '@smart/contracts';
import { SkillVerifyExam, isSkillVerifyAnswered } from './skill-verify-exam';

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
});
