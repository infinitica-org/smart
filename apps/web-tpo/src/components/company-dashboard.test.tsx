import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SmartApiError } from '@smart/api-client';
import type { ApplicationDto, JobOpeningDto } from '@smart/contracts';
import { applicationsApi, openingsApi } from '../lib/api';
import { CompanyDashboard } from './company-dashboard';

vi.mock('../lib/api', () => ({
  openingsApi: {
    list: vi.fn(),
  },
  applicationsApi: {
    listForOpening: vi.fn(),
  },
}));

const createdAt = '2026-09-02T06:00:00.000Z';

const openOpening: JobOpeningDto = {
  openingId: '11111111-1111-4111-8111-111111111111',
  institutionId: '22222222-2222-4222-8222-222222222222',
  companyName: 'Infinitica Labs',
  roleTitle: 'Backend Engineer',
  domain: 'SOFTWARE_IT',
  requiredSkills: [],
  minYearsExperience: 1,
  maxYearsExperience: 3,
  location: 'Coimbatore',
  employmentType: 'FULL_TIME',
  headcount: 2,
  status: 'OPEN',
  createdAt,
};

const draftOpening: JobOpeningDto = {
  ...openOpening,
  openingId: '11111111-1111-4111-8111-111111111112',
  roleTitle: 'Draft Analyst',
  status: 'DRAFT',
};

const applications: ApplicationDto[] = [
  {
    applicationId: '33333333-3333-4333-8333-333333333331',
    openingId: openOpening.openingId,
    studentId: '55555555-5555-4555-8555-555555555551',
    studentName: 'Aarav Sharma',
    stage: 'APPLIED',
    matchScore: 0.9,
    createdAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-02T12:00:00.000Z',
  },
  {
    applicationId: '33333333-3333-4333-8333-333333333332',
    openingId: openOpening.openingId,
    studentId: '55555555-5555-4555-8555-555555555552',
    studentName: 'Bhavna Patel',
    stage: 'SHORTLISTED',
    matchScore: 0.8,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    applicationId: '33333333-3333-4333-8333-333333333333',
    openingId: draftOpening.openingId,
    studentId: '55555555-5555-4555-8555-555555555553',
    studentName: 'Chirag Iyer',
    stage: 'INTERVIEW',
    matchScore: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
];

function mockLiveData() {
  vi.mocked(openingsApi.list).mockResolvedValue({ openings: [openOpening, draftOpening] });
  vi.mocked(applicationsApi.listForOpening).mockImplementation(async (openingId: string) => ({
    applications: applications.filter((application) => application.openingId === openingId),
  }));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CO-T04 company dashboard', () => {
  it('shows a loading state before live data arrives', () => {
    let resolveOpenings: (value: { openings: [] }) => void = () => undefined;
    vi.mocked(openingsApi.list).mockReturnValue(
      new Promise((resolve) => {
        resolveOpenings = resolve;
      }),
    );

    render(<CompanyDashboard />);

    expect(screen.getByText('Loading company dashboard…')).toBeDefined();
    resolveOpenings({ openings: [] });
  });

  it('maps live CO-T01 openings and CO-T02 applications onto dashboard sections', async () => {
    mockLiveData();
    render(<CompanyDashboard />);

    expect(await screen.findByText('Company dashboard')).toBeDefined();
    expect(screen.getAllByText('Active openings').length).toBeGreaterThan(0);
    expect(screen.getByText('Backend Engineer')).toBeDefined();
    expect(screen.getByText(/Infinitica Labs · Coimbatore · 2 headcount/)).toBeDefined();
    expect(screen.queryByText('Draft Analyst')).toBeNull();
    expect(screen.getByText('New matches')).toBeDefined();
    expect(screen.getByText('Applied / New Matches')).toBeDefined();
    expect(screen.getByText('Shortlisted')).toBeDefined();
    expect(screen.getByText('Interviewing')).toBeDefined();
    expect(screen.getByText('Aarav Sharma')).toBeDefined();
    expect(
      screen.getByText(/Backend Engineer · Infinitica Labs · Applied \/ New Matches · 90% match/),
    ).toBeDefined();
    expect(screen.getByText('Bhavna Patel')).toBeDefined();
    expect(screen.getByText('Chirag Iyer')).toBeDefined();
    expect(screen.getByText('AI-Verified')).toBeDefined();
    expect(screen.getByText('Hired')).toBeDefined();
    expect(screen.queryByText('SENT_TO_COMPANY')).toBeNull();
  });

  it('calls live placement APIs without a client-supplied institution id', async () => {
    mockLiveData();
    render(<CompanyDashboard />);

    await screen.findByText('Aarav Sharma');

    expect(openingsApi.list).toHaveBeenCalledTimes(1);
    expect(openingsApi.list).toHaveBeenCalledWith();
    const listArg = vi.mocked(openingsApi.list).mock.calls[0]?.[0];
    expect(listArg).toBeUndefined();
    expect(applicationsApi.listForOpening).toHaveBeenCalledWith(openOpening.openingId);
    expect(applicationsApi.listForOpening).toHaveBeenCalledWith(draftOpening.openingId);
    for (const call of vi.mocked(applicationsApi.listForOpening).mock.calls) {
      expect(call).toHaveLength(1);
      expect(call[0]).not.toEqual(expect.objectContaining({ institutionId: expect.anything() }));
    }
  });

  it('shows empty states when the institution has no live rows', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [] });

    render(<CompanyDashboard />);

    expect(await screen.findByText('No openings posted yet.')).toBeDefined();
    expect(
      screen.getByText('No applications yet. Shortlist a candidate to populate the ATS.'),
    ).toBeDefined();
    expect(screen.getByText('No recent matches yet.')).toBeDefined();
    expect(applicationsApi.listForOpening).not.toHaveBeenCalled();
  });

  it('does not treat DRAFT openings as active', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [draftOpening] });
    vi.mocked(applicationsApi.listForOpening).mockResolvedValue({ applications: [] });

    render(<CompanyDashboard />);

    expect(await screen.findByText(/No OPEN openings/)).toBeDefined();
    expect(screen.queryByText('Draft Analyst')).toBeNull();
  });

  it('shows section errors without fabricating fallback pipeline metrics', async () => {
    vi.mocked(openingsApi.list).mockRejectedValue(
      new SmartApiError({
        statusCode: 403,
        error: 'forbidden',
        message: 'Placement staff must belong to an institution.',
      }),
    );

    render(<CompanyDashboard />);

    expect(await screen.findByText('Could not load job openings')).toBeDefined();
    expect(screen.getByText('Placement staff must belong to an institution.')).toBeDefined();
    expect(screen.queryByText('Could not load applications')).toBeNull();
    expect(screen.queryByText('Backend Engineer')).toBeNull();
    expect(screen.queryByText('78')).toBeNull();
    expect(applicationsApi.listForOpening).not.toHaveBeenCalled();
  });

  it('shows an applications error when openings load but ATS list fails', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [openOpening] });
    vi.mocked(applicationsApi.listForOpening).mockRejectedValue(
      new SmartApiError({
        statusCode: 404,
        error: 'not_found',
        message: 'Job opening not found.',
      }),
    );

    render(<CompanyDashboard />);

    expect(await screen.findByText('Backend Engineer')).toBeDefined();
    expect(screen.getByText('Could not load applications')).toBeDefined();
    expect(screen.getByText('Job opening not found.')).toBeDefined();
    expect(screen.queryByText('Aarav Sharma')).toBeNull();
    await waitFor(() => {
      expect(applicationsApi.listForOpening).toHaveBeenCalledWith(openOpening.openingId);
    });
  });
});
