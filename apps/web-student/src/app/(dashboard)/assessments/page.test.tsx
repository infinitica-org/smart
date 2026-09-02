import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssessmentsPage from './page';

const push = vi.fn();
const startMock = vi.fn();
const meMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    auth: { me: (...args: unknown[]) => meMock(...args) },
    catalog: { tracks: vi.fn() },
    assessment: { start: (...args: unknown[]) => startMock(...args) },
  },
}));

describe('AssessmentsPage L1 start', () => {
  beforeEach(() => {
    push.mockReset();
    startMock.mockReset();
    meMock.mockReset();
    meMock.mockResolvedValue({ primaryTrack: 'MBA_FINANCE' });
    startMock.mockResolvedValue({
      attemptId: '55555555-5555-4555-8555-555555555555',
      studentId: '11111111-1111-4111-8111-111111111111',
      trackCode: 'MBA_FINANCE',
      levelNumber: 1,
      levelFormat: 'MCQ',
      status: 'IN_PROGRESS',
      formId: 'A',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      serverRemainingSeconds: 3600,
      totalItems: 2,
      answeredItems: 0,
      currentItemIndex: 0,
      integrityFlag: 'CLEAN',
      locked: false,
    });
  });

  it('starts an L1 attempt with the enrolled track and routes to the player', async () => {
    render(<AssessmentsPage />);
    const ready = screen
      .getAllByRole('button', { name: /Start/i })
      .find((button) => !(button as HTMLButtonElement).disabled);
    if (!ready) {
      throw new Error('Expected an enabled Start button');
    }
    fireEvent.click(ready);
    await waitFor(() => {
      expect(startMock).toHaveBeenCalledWith({ trackCode: 'MBA_FINANCE', levelNumber: 1 });
    });
    expect(push).toHaveBeenCalledWith('/assessments/55555555-5555-4555-8555-555555555555');
  });
});
