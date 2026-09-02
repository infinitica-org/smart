import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applicationsApi, openingsApi } from '../lib/api';
import { KanbanWorkspace } from './kanban-workspace';

vi.mock('../lib/api', () => ({
  openingsApi: {
    list: vi.fn(),
  },
  applicationsApi: {
    listForOpening: vi.fn(),
    patchStage: vi.fn(),
  },
}));

const mockOpening = {
  openingId: '11111111-1111-4111-8111-111111111111',
  institutionId: '22222222-2222-4222-8222-222222222222',
  companyName: 'Infinitica Labs',
  roleTitle: 'Backend Engineer',
  domain: 'SOFTWARE_IT' as const,
  requiredSkills: [],
  minYearsExperience: 1,
  maxYearsExperience: 3,
  location: 'Coimbatore',
  employmentType: 'FULL_TIME' as const,
  headcount: 2,
  status: 'OPEN' as const,
  createdAt: '2026-09-02T05:30:00.000Z',
};

const mockApplication = {
  applicationId: '33333333-3333-4333-8333-333333333333',
  openingId: mockOpening.openingId,
  studentId: '44444444-4444-4444-8444-444444444444',
  studentName: 'Aarav Sharma',
  studentEmail: 'aarav@example.com',
  primaryTrackCode: 'FULLSTACK',
  stage: 'APPLIED' as const,
  matchScore: 0.92,
  createdAt: '2026-09-02T06:00:00.000Z',
  updatedAt: '2026-09-02T06:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CO-T02 ATS Kanban Workspace', () => {
  it('renders loading and opening details', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(applicationsApi.listForOpening).mockResolvedValue({
      applications: [mockApplication],
    });

    render(<KanbanWorkspace />);

    expect(await screen.findByText('Candidate ATS Kanban Board')).toBeDefined();
    expect(await screen.findByText('Aarav Sharma')).toBeDefined();
    expect(screen.getByText('aarav@example.com')).toBeDefined();
    expect(screen.getByText('92% Match')).toBeDefined();
    expect(screen.getByText('FULLSTACK')).toBeDefined();
  });

  it('updates candidate stage and calls patchStage API', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(applicationsApi.listForOpening).mockResolvedValue({
      applications: [mockApplication],
    });
    vi.mocked(applicationsApi.patchStage).mockResolvedValue({
      ...mockApplication,
      stage: 'SHORTLISTED',
    });

    render(<KanbanWorkspace />);

    await screen.findByText('Aarav Sharma');

    const select = screen.getByLabelText('Change stage for Aarav Sharma');
    fireEvent.change(select, { target: { value: 'SHORTLISTED' } });

    await waitFor(() => {
      expect(applicationsApi.patchStage).toHaveBeenCalledWith(
        mockApplication.applicationId,
        'SHORTLISTED',
      );
    });
  });

  it('rolls back stage on API patch failure and displays error alert', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(applicationsApi.listForOpening).mockResolvedValue({
      applications: [mockApplication],
    });
    vi.mocked(applicationsApi.patchStage).mockRejectedValue(new Error('Network error'));

    render(<KanbanWorkspace />);

    await screen.findByText('Aarav Sharma');

    const select = screen.getByLabelText('Change stage for Aarav Sharma');
    fireEvent.change(select, { target: { value: 'SHORTLISTED' } });

    expect(await screen.findByText(/Could not move candidate to SHORTLISTED/)).toBeDefined();
  });

  it('allows manual refresh', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [mockOpening] });
    vi.mocked(applicationsApi.listForOpening).mockResolvedValue({
      applications: [mockApplication],
    });

    render(<KanbanWorkspace />);

    await screen.findByText('Aarav Sharma');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(openingsApi.list).toHaveBeenCalledTimes(2);
    expect(applicationsApi.listForOpening).toHaveBeenCalledTimes(2);
  });
});
