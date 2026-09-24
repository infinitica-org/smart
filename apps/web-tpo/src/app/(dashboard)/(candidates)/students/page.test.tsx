import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CandidatesPage from './page';
import { api, staffApi } from '../../../../lib/api';

vi.mock('../../../../lib/api', () => ({
  api: {
    assessment: { listSkillClaims: vi.fn().mockResolvedValue([]) },
    onboarding: { listTpoStudents: vi.fn().mockResolvedValue([]) },
  },
  staffApi: {
    listAssignedStudents: vi.fn().mockResolvedValue([]),
  },
}));

describe('CandidatesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.assessment.listSkillClaims).mockResolvedValue([]);
    vi.mocked(api.onboarding.listTpoStudents).mockResolvedValue([]);
    vi.mocked(staffApi.listAssignedStudents).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders unified filter toolbar controls', async () => {
    render(<CandidatesPage />);

    expect(await screen.findByRole('searchbox', { name: /Search candidates/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Filter by skill category/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Filter by Skills/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Filter by Proficiency/i })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Level 4' })).toBeDefined();
    expect(screen.queryByRole('link', { name: /Onboard Candidates/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Whitelist/i })).toBeNull();
    expect(await screen.findByRole('heading', { name: /^Students$/i })).toBeDefined();
  });

  it('switches to My Assigned Students view and calls listAssignedStudents', async () => {
    vi.mocked(staffApi.listAssignedStudents).mockResolvedValue([
      {
        userId: 'stu_1',
        email: 'assigned@univ.edu',
        fullName: 'Assigned Student',
        batchId: null,
        batchName: null,
        inviteStatus: 'ACCEPTED',
        lastSentAt: null,
        acceptedAt: '2026-01-15T00:00:00.000Z',
        heldAt: null,
        linkedinUrl: null,
        githubUrl: null,
      },
    ]);

    render(<CandidatesPage />);

    const assignedTab = screen.getByRole('button', { name: /My Assigned Students/i });
    fireEvent.click(assignedTab);

    await waitFor(() => {
      expect(staffApi.listAssignedStudents).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Assigned Student')).toBeDefined();
    });
  });

  it('shows assigned empty state when list is empty', async () => {
    vi.mocked(staffApi.listAssignedStudents).mockResolvedValue([]);

    render(<CandidatesPage />);

    const assignedTab = screen.getByRole('button', { name: /My Assigned Students/i });
    fireEvent.click(assignedTab);

    await waitFor(() => {
      expect(
        screen.getByText(
          /No students are currently assigned to your department or campus scope\./i,
        ),
      ).toBeDefined();
    });
  });

  it('handles error state and allows retry', async () => {
    vi.mocked(staffApi.listAssignedStudents).mockRejectedValueOnce(new Error('API failure'));

    render(<CandidatesPage />);

    const assignedTab = screen.getByRole('button', { name: /My Assigned Students/i });
    fireEvent.click(assignedTab);

    await waitFor(() => {
      expect(screen.getByText('API failure')).toBeDefined();
    });

    vi.mocked(staffApi.listAssignedStudents).mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(staffApi.listAssignedStudents).toHaveBeenCalledTimes(2);
    });
  });
});
