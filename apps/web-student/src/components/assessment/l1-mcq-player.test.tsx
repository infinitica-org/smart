import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttemptSessionDto, DeliverableItemDto, NextItemDto } from '@smart/contracts';
import { L1McqPlayer, L1McqQuestion } from './l1-mcq-player';

const sessionMock = vi.fn();
const nextItemMock = vi.fn();
const saveAnswerMock = vi.fn();
const completeMock = vi.fn();

vi.mock('../../lib/api', () => ({
  api: {
    assessment: {
      session: (...args: unknown[]) => sessionMock(...args),
      nextItem: (...args: unknown[]) => nextItemMock(...args),
      saveAnswer: (...args: unknown[]) => saveAnswerMock(...args),
      complete: (...args: unknown[]) => completeMock(...args),
    },
  },
}));

const ITEM: DeliverableItemDto = {
  itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  competencyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  domainCode: 'A',
  itemType: 'MCQ_SINGLE',
  difficulty: 'EASY',
  promptText: 'Which hook runs after render?',
  options: [
    { optionId: 'opt-a', label: 'useEffect' },
    { optionId: 'opt-b', label: 'useMemo' },
  ],
  itemWeight: 1,
};

function session(overrides: Partial<AttemptSessionDto> = {}): AttemptSessionDto {
  return {
    attemptId: '55555555-5555-4555-8555-555555555555',
    studentId: '11111111-1111-4111-8111-111111111111',
    trackCode: 'MBA_FINANCE',
    levelNumber: 1,
    levelFormat: 'MCQ',
    status: 'IN_PROGRESS',
    formId: 'A',
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    serverRemainingSeconds: 3540,
    totalItems: 2,
    answeredItems: 0,
    currentItemIndex: 0,
    integrityFlag: 'CLEAN',
    locked: false,
    ...overrides,
  };
}

function nextPage(overrides: Partial<NextItemDto> = {}): NextItemDto {
  return {
    attemptId: '55555555-5555-4555-8555-555555555555',
    item: ITEM,
    index: 0,
    totalItems: 2,
    serverRemainingSeconds: 3540,
    ...overrides,
  };
}

describe('L1McqQuestion', () => {
  it('renders a DeliverableItemDto MCQ and keeps the selected option locally', () => {
    const onSelect = vi.fn();
    render(
      <L1McqQuestion
        item={ITEM}
        selectedOptionIds={['opt-a']}
        disabled={false}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('Which hook runs after render?')).toBeDefined();
    expect(screen.getByText('useEffect').closest('button')?.getAttribute('aria-checked')).toBe(
      'true',
    );
    fireEvent.click(screen.getByText('useMemo'));
    expect(onSelect).toHaveBeenCalledWith('opt-b');
    expect(screen.queryByText('isCorrect')).toBeNull();
  });
});

describe('L1McqPlayer', () => {
  beforeEach(() => {
    sessionMock.mockReset();
    nextItemMock.mockReset();
    saveAnswerMock.mockReset();
    completeMock.mockReset();
    saveAnswerMock.mockResolvedValue({
      accepted: true,
      superseded: false,
      answeredItems: 1,
      serverRemainingSeconds: 3500,
    });
    completeMock.mockResolvedValue({
      attemptId: '55555555-5555-4555-8555-555555555555',
      status: 'SUBMITTED',
      evaluationJobId: null,
      estimatedResultSeconds: null,
    });
  });

  it('resumes session + savedDraft from the server', async () => {
    sessionMock.mockResolvedValue(session({ currentItemIndex: 0 }));
    nextItemMock.mockResolvedValue(
      nextPage({ savedDraft: { kind: 'MCQ', selectedOptionIds: ['opt-b'] } }),
    );
    render(<L1McqPlayer attemptId="55555555-5555-4555-8555-555555555555" />);
    await waitFor(() => {
      expect(screen.getByText('Which hook runs after render?')).toBeDefined();
    });
    expect(sessionMock).toHaveBeenCalledWith('55555555-5555-4555-8555-555555555555');
    expect(nextItemMock).toHaveBeenCalledWith('55555555-5555-4555-8555-555555555555', undefined);
    expect(screen.getByText('useMemo').closest('button')?.getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it('asks the server to advance the question index', async () => {
    sessionMock.mockResolvedValue(session());
    nextItemMock
      .mockResolvedValueOnce(nextPage())
      .mockResolvedValueOnce(
        nextPage({ index: 1, item: { ...ITEM, promptText: 'Second question' } }),
      );
    render(<L1McqPlayer attemptId="55555555-5555-4555-8555-555555555555" />);
    await waitFor(() => expect(screen.getByText('Which hook runs after render?')).toBeDefined());
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() =>
      expect(nextItemMock).toHaveBeenLastCalledWith('55555555-5555-4555-8555-555555555555', {
        index: 1,
      }),
    );
  });

  it('shows an empty form as ready to submit', async () => {
    sessionMock.mockResolvedValue(session({ currentItemIndex: 2 }));
    nextItemMock.mockResolvedValue(nextPage({ item: null, index: 2 }));
    render(<L1McqPlayer attemptId="55555555-5555-4555-8555-555555555555" />);
    await waitFor(() => expect(screen.getByText('Ready to submit')).toBeDefined());
  });

  it('locks options when the server reports locked', async () => {
    sessionMock.mockResolvedValue(session({ locked: true, serverRemainingSeconds: 0 }));
    nextItemMock.mockResolvedValue(nextPage());
    render(<L1McqPlayer attemptId="55555555-5555-4555-8555-555555555555" />);
    await waitFor(() => expect(screen.getByText('Attempt locked')).toBeDefined());
    expect(screen.getByText('useEffect').closest('button')?.hasAttribute('disabled')).toBe(true);
  });

  it('surfaces 404 empty-bank and 429 errors', async () => {
    const { SmartApiError } = await import('@smart/api-client');
    sessionMock.mockRejectedValue(
      new SmartApiError({
        error: 'not_found',
        message: 'Item bank for form A is empty.',
        statusCode: 404,
      }),
    );
    nextItemMock.mockRejectedValue(
      new SmartApiError({
        error: 'not_found',
        message: 'Item bank for form A is empty.',
        statusCode: 404,
      }),
    );
    const { rerender } = render(<L1McqPlayer attemptId="55555555-5555-4555-8555-555555555555" />);
    await waitFor(() => expect(screen.getByText('Question bank unavailable')).toBeDefined());

    sessionMock.mockRejectedValue(
      new SmartApiError({
        error: 'rate_limit_exceeded',
        message: 'Slow down.',
        statusCode: 429,
        retryAfterSeconds: 9,
      }),
    );
    nextItemMock.mockRejectedValue(
      new SmartApiError({
        error: 'rate_limit_exceeded',
        message: 'Slow down.',
        statusCode: 429,
        retryAfterSeconds: 9,
      }),
    );
    rerender(<L1McqPlayer attemptId="66666666-6666-4666-8666-666666666666" />);
    await waitFor(() => expect(screen.getByText(/Retry after 9s/)).toBeDefined());
  });

  it('submits through the complete contract without inventing a score', async () => {
    sessionMock.mockResolvedValue(session({ currentItemIndex: 2 }));
    nextItemMock.mockResolvedValue(nextPage({ item: null, index: 2 }));
    render(<L1McqPlayer attemptId="55555555-5555-4555-8555-555555555555" />);
    await waitFor(() => expect(screen.getByText('Submit attempt')).toBeDefined());
    fireEvent.click(screen.getByText('Submit attempt'));
    await waitFor(() =>
      expect(completeMock).toHaveBeenCalledWith({
        attemptId: '55555555-5555-4555-8555-555555555555',
      }),
    );
    await waitFor(() => expect(screen.getByText(/Status SUBMITTED/)).toBeDefined());
    expect(screen.queryByText(/Score \d/)).toBeNull();
  });
});
