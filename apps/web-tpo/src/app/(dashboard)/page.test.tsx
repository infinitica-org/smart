import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';

const apiMock = vi.hoisted(() => ({
  listTpoStudents: vi.fn(),
  listSkillClaims: vi.fn(),
  me: vi.fn(),
  listOpenings: vi.fn(),
  listApplicationsForOpening: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  api: {
    onboarding: { listTpoStudents: apiMock.listTpoStudents },
    assessment: { listSkillClaims: apiMock.listSkillClaims },
    auth: { me: apiMock.me },
  },
  openingsApi: { list: apiMock.listOpenings },
  applicationsApi: { listForOpening: apiMock.listApplicationsForOpening },
}));

beforeEach(() => {
  apiMock.listTpoStudents.mockResolvedValue([
    {
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'ada@school.edu',
      fullName: 'Ada Lovelace',
      batchId: null,
      batchName: null,
      inviteStatus: 'ACCEPTED',
      lastSentAt: null,
      acceptedAt: null,
      heldAt: null,
      linkedinUrl: null,
      githubUrl: null,
    },
  ]);
  apiMock.listSkillClaims.mockResolvedValue([
    {
      claimId: '00000000-0000-4000-8000-000000000099',
      studentId: '00000000-0000-4000-8000-000000000001',
      skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      proficiency: 'INTERMEDIATE',
      status: 'VERIFIED',
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: null,
    },
  ]);
  apiMock.me.mockResolvedValue({ fullName: 'Pilot TPO', role: 'INSTITUTION_ADMIN' });
  apiMock.listOpenings.mockResolvedValue({ openings: [] });
  apiMock.listApplicationsForOpening.mockResolvedValue({ applications: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DashboardPage', () => {
  it('renders bento sections and KPI values from API data', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Pilot TPO')).toBeDefined();
    expect(screen.getByText('Total Onboarded')).toBeDefined();
    expect(screen.getAllByText('Verified Skills').length).toBeGreaterThan(0);
    expect(screen.getByText('Recent Candidates')).toBeDefined();
    expect(screen.getByText('No upcoming activities')).toBeDefined();

    expect(screen.queryByText('Domain Readiness')).toBeNull();
    expect(screen.queryByText('Invites Accepted')).toBeNull();
    expect(screen.queryByText('Onboarding Completion')).toBeNull();
    expect(screen.getByText('Ada Lovelace')).toBeDefined();
  });

  it('links onboarding and roster actions to existing routes', async () => {
    render(<DashboardPage />);

    await screen.findByText('Pilot TPO');
    expect(
      screen.getAllByRole('link', { name: /Onboard Candidates/i })[0]?.getAttribute('href'),
    ).toBe('/provisioning');
    expect(screen.getByRole('link', { name: /View all/i }).getAttribute('href')).toBe('/students');
    expect(screen.getByRole('link', { name: /Manage Openings/i }).getAttribute('href')).toBe(
      '/openings',
    );
  });

  it('shows empty cohort copy when there are no students', async () => {
    apiMock.listTpoStudents.mockResolvedValueOnce([]);
    render(<DashboardPage />);

    expect((await screen.findAllByText('No candidates onboarded yet')).length).toBeGreaterThan(0);
  });

  it('does not use neon dashboard accent #00fad0 or global tpo-accent tokens', async () => {
    const { container } = render(<DashboardPage />);
    await screen.findByText('Pilot TPO');
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain('00fad0');
    expect(html).not.toContain('--tpo-accent');
  });
});
