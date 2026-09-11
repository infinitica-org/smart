import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkExperienceVerificationPage from './page';

const getWorkExperienceVerificationByToken = vi.fn();
const submitWorkExperienceVerificationByToken = vi.fn();

vi.mock('../../../lib/api', () => ({
  api: {
    users: {
      getWorkExperienceVerificationByToken: (...args: unknown[]) =>
        getWorkExperienceVerificationByToken(...args),
      submitWorkExperienceVerificationByToken: (...args: unknown[]) =>
        submitWorkExperienceVerificationByToken(...args),
    },
  },
}));

vi.mock('react', async () => {
  const reactActual = await vi.importActual<Record<string, unknown>>('react');
  const useHook = reactActual.use as (value: unknown) => unknown;
  return {
    ...reactActual,
    use: (value: unknown) => {
      if (value instanceof Promise) {
        return { token: 'test-token' };
      }
      return useHook(value);
    },
  };
});

const mockData = {
  experienceId: 'exp-1',
  candidateName: 'Jane Candidate',
  companyName: 'Acme Corp',
  role: 'Software Engineer',
  employmentType: 'FULL_TIME',
  startDate: '2022-01-01',
  endDate: null,
  isCurrent: true,
  responsibilities: 'Built APIs',
  verifierName: 'Manager',
  verifierEmail: 'manager@acme.com',
  verifierDesignation: 'Engineering Manager',
  status: 'PENDING_EMPLOYER',
  expiresAt: '2026-09-12T00:00:00.000Z',
  isExpired: false,
  isAlreadyResponded: false,
};

describe('WorkExperienceVerificationPage', () => {
  beforeEach(() => {
    getWorkExperienceVerificationByToken.mockResolvedValue(mockData);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  async function renderPage() {
    render(<WorkExperienceVerificationPage params={Promise.resolve({ token: 'test-token' })} />);
    expect(await screen.findByText(/Work Experience Verification Request/i)).toBeDefined();
  }

  it('submits YES decision', async () => {
    submitWorkExperienceVerificationByToken.mockResolvedValueOnce({
      success: true,
      status: 'VERIFIED',
      message: 'Verified',
    });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Confirm fully/i }));
    fireEvent.click(screen.getByRole('button', { name: /Submit verification response/i }));
    await waitFor(() => {
      expect(submitWorkExperienceVerificationByToken).toHaveBeenCalledWith('test-token', {
        decision: 'YES',
        comments: undefined,
      });
    });
  });

  it('submits NO decision', async () => {
    submitWorkExperienceVerificationByToken.mockResolvedValueOnce({
      success: true,
      status: 'REJECTED',
      message: 'Rejected',
    });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Cannot confirm/i }));
    fireEvent.click(screen.getByRole('button', { name: /Submit verification response/i }));
    await waitFor(() => {
      expect(submitWorkExperienceVerificationByToken).toHaveBeenCalledWith('test-token', {
        decision: 'NO',
        comments: undefined,
      });
    });
  });

  it('requires comments for PARTIAL', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Partially confirm/i }));
    fireEvent.click(screen.getByRole('button', { name: /Submit verification response/i }));
    expect(
      await screen.findByText(/Comments of at least 8 characters are required/i),
    ).toBeDefined();
    expect(submitWorkExperienceVerificationByToken).not.toHaveBeenCalled();
  });

  it('submits PARTIAL with required comments', async () => {
    submitWorkExperienceVerificationByToken.mockResolvedValueOnce({
      success: true,
      status: 'VERIFIED',
      message: 'Partially verified',
    });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Partially confirm/i }));
    fireEvent.change(screen.getByPlaceholderText(/Add verification notes/i), {
      target: { value: 'Dates match with minor title variance.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit verification response/i }));
    await waitFor(() => {
      expect(submitWorkExperienceVerificationByToken).toHaveBeenCalledWith('test-token', {
        decision: 'PARTIAL',
        comments: 'Dates match with minor title variance.',
      });
    });
  });

  it('shows expired state', async () => {
    getWorkExperienceVerificationByToken.mockResolvedValueOnce({
      ...mockData,
      isExpired: true,
    });
    await renderPage();
    expect(screen.getByText(/verification invitation link has expired/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Submit verification response/i })).toBeNull();
  });
});
