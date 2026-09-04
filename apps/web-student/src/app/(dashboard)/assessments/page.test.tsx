import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssessmentsPage from './page';
import { L1_LAST_ATTEMPT_STORAGE_KEY } from '@/lib/l1-mcq';

const push = vi.fn();
const startMock = vi.fn();
const meMock = vi.fn();
const sessionMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    auth: { me: (...args: unknown[]) => meMock(...args) },
    assessment: {
      start: (...args: unknown[]) => startMock(...args),
      session: (...args: unknown[]) => sessionMock(...args),
    },
  },
}));

const liveSession = {
  attemptId: '55555555-5555-4555-8555-555555555555',
  studentId: '11111111-1111-4111-8111-111111111111',
  trackCode: 'MBA_FINANCE',
  levelNumber: 1,
  levelFormat: 'MCQ',
  status: 'IN_PROGRESS' as const,
  formId: 'A',
  startedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  serverRemainingSeconds: 3600,
  totalItems: 2,
  answeredItems: 1,
  currentItemIndex: 1,
  integrityFlag: 'CLEAN' as const,
  locked: false,
};

describe('AssessmentsPage L1 start', () => {
  beforeEach(() => {
    sessionStorage.clear();
    push.mockReset();
    startMock.mockReset();
    meMock.mockReset();
    sessionMock.mockReset();
    meMock.mockResolvedValue({ primaryTrack: 'MBA_FINANCE' });
    startMock.mockResolvedValue(liveSession);
  });

  it('starts an L1 attempt with the enrolled track and routes to the player', async () => {
    render(<AssessmentsPage />);
    const start = await screen.findByRole('button', { name: /Start/i });
    fireEvent.click(start);
    await waitFor(() => {
      expect(startMock).toHaveBeenCalledWith({ trackCode: 'MBA_FINANCE', levelNumber: 1 });
    });
    expect(push).toHaveBeenCalledWith('/assessments/55555555-5555-4555-8555-555555555555');
  });

  it('does not pick a catalog track when primaryTrack is missing', async () => {
    meMock.mockResolvedValue({ primaryTrack: null });
    render(<AssessmentsPage />);
    expect(await screen.findByText('No enrolled track')).toBeDefined();
    expect(screen.getByRole('link', { name: /Enroll in a track/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Start/i })).toBeNull();
    expect(startMock).not.toHaveBeenCalled();
  });

  it('resumes an in-progress attempt from sessionStorage without calling start', async () => {
    sessionStorage.setItem(L1_LAST_ATTEMPT_STORAGE_KEY, liveSession.attemptId);
    sessionMock.mockResolvedValue(liveSession);
    render(<AssessmentsPage />);
    const resume = await screen.findByRole('button', { name: /Resume/i });
    fireEvent.click(resume);
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/assessments/55555555-5555-4555-8555-555555555555');
    });
    expect(startMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Score \d|Score %/i)).toBeNull();
  });
});
