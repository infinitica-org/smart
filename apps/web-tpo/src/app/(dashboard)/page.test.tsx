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
  it('renders university KPIs and roster from API data', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Pilot TPO')).toBeDefined();
    expect(screen.getByText('Whitelisted')).toBeDefined();
    expect(screen.getByText('Fully verified')).toBeDefined();
    expect(screen.getByText('Opportunities matched')).toBeDefined();
    expect(screen.getByText('Student roster')).toBeDefined();
    expect(screen.getByText('Ada Lovelace')).toBeDefined();
  });

  it('links roster to students list', async () => {
    render(<DashboardPage />);

    await screen.findByText('Pilot TPO');
    expect(screen.getByRole('link', { name: /View all (students|candidates)/i }).getAttribute('href')).toBe(
      '/students',
    );
  });

  it('shows empty cohort copy when there are no students', async () => {
    apiMock.listTpoStudents.mockResolvedValueOnce([]);
    render(<DashboardPage />);

    expect(await screen.findByText('No students whitelisted yet')).toBeDefined();
    expect(screen.getByRole('link', { name: /Open whitelist/i }).getAttribute('href')).toBe(
      '/whitelist',
    );
  });

  it('does not use neon dashboard accent #00fad0 or global tpo-accent tokens', async () => {
    const { container } = render(<DashboardPage />);
    await screen.findByText('Pilot TPO');
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain('00fad0');
    expect(html).not.toContain('--tpo-accent');
  });
});
