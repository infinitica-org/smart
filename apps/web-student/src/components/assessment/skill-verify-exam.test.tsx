import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SkillVerifySessionDto } from '@smart/contracts';
import {
  SkillVerifyExam,
  isSkillVerifyAnswered,
  splitProblemProse,
  splitPromptSegments,
} from './skill-verify-exam';

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
    expect(
      screen.getByRole('heading', { name: /git & version control · beginner/i }),
    ).toBeDefined();
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
    expect(screen.queryByRole('button', { name: /^run$/i })).toBeNull();
  });

  it('splits fenced code out of a trace stem', () => {
    expect(
      splitPromptSegments('What prints?\n```js\nconsole.log(1)\n```\nChoose the output.'),
    ).toEqual([
      { type: 'prose', text: 'What prints?' },
      { type: 'code', language: 'js', text: 'console.log(1)' },
      { type: 'prose', text: 'Choose the output.' },
    ]);
  });

  it('renders a split studio pane for TRACE items', () => {
    const onSelectKey = vi.fn();
    render(
      <SkillVerifyExam
        session={session({
          items: [
            {
              index: 1,
              format: 'TRACE',
              prompt: 'What is printed?\n```js\nconsole.log(a)\n```',
              options: { A: '42', B: 'undefined', C: 'Error', D: 'null' },
            },
          ],
        })}
        currentIndex={0}
        answers={{}}
        pending={false}
        error={null}
        onSelectKey={onSelectKey}
        onChangeText={vi.fn()}
        onGoTo={vi.fn()}
        onClear={vi.fn()}
        onExit={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Trace the snippet' })).toBeDefined();
    expect(screen.getByText('Answer')).toBeDefined();
    expect(screen.getByText('console.log(a)')).toBeDefined();
    fireEvent.click(screen.getByRole('radio', { name: /42/ }));
    expect(onSelectKey).toHaveBeenCalledWith(1, 'A');
  });

  it('renders a split studio pane for DEBUG items', () => {
    render(
      <SkillVerifyExam
        session={session({
          items: [
            {
              index: 1,
              format: 'DEBUG',
              title: 'Null pointer in parser',
              prompt: 'Find the bug.\n```ts\nfoo(null)\n```',
              options: null,
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
    expect(screen.getByText('Null pointer in parser')).toBeDefined();
    expect(screen.getByText('Root cause and fix')).toBeDefined();
    expect(screen.getByPlaceholderText('Describe the bug and the fix')).toBeDefined();
    expect(screen.getByLabelText('Debug response')).toBeDefined();
    expect(screen.queryByRole('button', { name: /^run$/i })).toBeNull();
  });

  it('runs coding source against visible examples without grading', async () => {
    const onRunCode = vi.fn().mockResolvedValue({
      compileError: null,
      testsPassed: 1,
      testsTotal: 1,
      tests: [
        {
          input: 'nums = [2,7], target = 9',
          expected: '[0,1]',
          actual: '[0,1]',
          passed: true,
        },
      ],
      promptRef: 'sde-skill-code-runner@1',
    });
    render(
      <SkillVerifyExam
        session={session({
          items: [
            {
              index: 1,
              format: 'CODING',
              title: 'Two Sum',
              prompt: 'Return two indices.',
              options: null,
              examples: [{ input: 'nums = [2,7], target = 9', output: '[0,1]' }],
            },
          ],
        })}
        currentIndex={0}
        answers={{ 1: { text: 'function twoSum() { return [0,1]; }' } }}
        pending={false}
        error={null}
        onSelectKey={vi.fn()}
        onChangeText={vi.fn()}
        onGoTo={vi.fn()}
        onClear={vi.fn()}
        onExit={vi.fn()}
        onSubmit={vi.fn()}
        onRunCode={onRunCode}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }));
    await waitFor(() => {
      expect(onRunCode).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'CODING', title: 'Two Sum' }),
        'function twoSum() { return [0,1]; }',
      );
    });
    expect(await screen.findByText('1/1 tests passed')).toBeDefined();
    expect(screen.getByText(/PASS/)).toBeDefined();
  });

  it('splits fenced code out of a trace stem', () => {
    expect(
      splitPromptSegments('What prints?\n```js\nconsole.log(1)\n```\nChoose the output.'),
    ).toEqual([
      { type: 'prose', text: 'What prints?' },
      { type: 'code', language: 'js', text: 'console.log(1)' },
      { type: 'prose', text: 'Choose the output.' },
    ]);
  });

  it('renders a split studio pane for TRACE items', () => {
    const onSelectKey = vi.fn();
    render(
      <SkillVerifyExam
        session={session({
          items: [
            {
              index: 1,
              format: 'TRACE',
              prompt: 'What is printed?\n```js\nconsole.log(a)\n```',
              options: { A: '42', B: 'undefined', C: 'Error', D: 'null' },
            },
          ],
        })}
        currentIndex={0}
        answers={{}}
        pending={false}
        error={null}
        onSelectKey={onSelectKey}
        onChangeText={vi.fn()}
        onGoTo={vi.fn()}
        onClear={vi.fn()}
        onExit={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Trace the snippet' })).toBeDefined();
    expect(screen.getByText('Answer')).toBeDefined();
    expect(screen.getByText('console.log(a)')).toBeDefined();
    fireEvent.click(screen.getByRole('radio', { name: /42/ }));
    expect(onSelectKey).toHaveBeenCalledWith(1, 'A');
  });

  it('renders a split studio pane for DEBUG items', () => {
    render(
      <SkillVerifyExam
        session={session({
          items: [
            {
              index: 1,
              format: 'DEBUG',
              title: 'Null pointer in parser',
              prompt: 'Find the bug.\n```ts\nfoo(null)\n```',
              options: null,
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
    expect(screen.getByText('Null pointer in parser')).toBeDefined();
    expect(screen.getByText('Root cause and fix')).toBeDefined();
    expect(screen.getByPlaceholderText('Describe the bug and the fix')).toBeDefined();
    expect(screen.getByLabelText('Debug response')).toBeDefined();
  });
});
