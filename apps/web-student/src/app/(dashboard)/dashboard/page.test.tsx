import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CandidateApplicationDto, SkillClaimDto } from '@smart/contracts';
import DashboardPage from './page';

const me = vi.fn();
const getOnboarding = vi.fn();
const listSkillClaims = vi.fn();
const listMyApplications = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    auth: { me: (...args: unknown[]) => me(...args) },
    users: { getOnboarding: (...args: unknown[]) => getOnboarding(...args) },
    assessment: { listSkillClaims: (...args: unknown[]) => listSkillClaims(...args) },
    placement: { listMyApplications: (...args: unknown[]) => listMyApplications(...args) },
  },
}));

function claim(overrides: Partial<SkillClaimDto> = {}): SkillClaimDto {
  return {
    claimId: '44444444-4444-4444-8444-444444444444',
    studentId: '11111111-1111-4111-8111-111111111111',
    skillCode: 'GIT_VERSION_CONTROL',
    proficiency: 'BEGINNER',
    status: 'VERIFIED',
    strikes: 0,
    lockedUntil: null,
    lastAttemptId: null,
    ...overrides,
  };
}

function application(overrides: Partial<CandidateApplicationDto> = {}): CandidateApplicationDto {
  return {
    applicationId: '00000000-0000-4000-8000-000000000001',
    openingId: '00000000-0000-4000-8000-000000000010',
    studentId: '00000000-0000-4000-8000-000000000020',
    stage: 'SHORTLISTED',
    matchScore: 0.88,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    companyName: 'Acme Labs',
    roleTitle: 'Backend Engineer',
    location: 'Bengaluru',
    employmentType: 'FULL_TIME',
    domain: 'SOFTWARE_IT',
    ...overrides,
  };
}

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('DashboardPage live data', () => {
  beforeEach(() => {
    me.mockReset();
    getOnboarding.mockReset();
    listSkillClaims.mockReset();
    listMyApplications.mockReset();
    me.mockResolvedValue({
      fullName: 'Ada Lovelace',
      institutionName: 'Analytical Engine Lab',
      primaryTrack: 'MBA_FINANCE',
      onboardingCompleted: true,
    });
    getOnboarding.mockResolvedValue({
      onboardingCompleted: true,
      draft: null,
      profile: {
        experiences: [{ role: 'Researcher', company: 'USN', tags: [] }],
      },
    });
    listSkillClaims.mockResolvedValue([claim()]);
    listMyApplications.mockResolvedValue({ applications: [application()] });
  });

  it('welcomes the student from GET /users/me', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/Welcome back, Ada/)).toBeTruthy());
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
    expect(me).toHaveBeenCalled();
  });

  it('renders skill claims from GET /assessment/skill-claims', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/Git/i)).toBeTruthy());
    expect(screen.getByText('Verified')).toBeTruthy();
    expect(listSkillClaims).toHaveBeenCalled();
    expect(screen.queryByText('Tailwind CSS')).toBeNull();
    expect(screen.queryByText('Expiring')).toBeNull();
  });

  it('renders applications from GET /me/applications using the ATS mapper', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Backend Engineer')).toBeTruthy());
    expect(screen.getByText('Acme Labs')).toBeTruthy();
    expect(screen.getAllByText('Shortlisted').length).toBeGreaterThan(0);
    expect(listMyApplications).toHaveBeenCalled();
    expect(screen.queryByText('Stripe')).toBeNull();
    expect(screen.queryByText('Vercel')).toBeNull();
  });

  it('does not render fabricated KPI or calendar values', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/Welcome back, Ada/)).toBeTruthy());
    expect(screen.queryByText('2%')).toBeNull();
    expect(screen.queryByText('78')).toBeNull();
    expect(screen.queryByText('56')).toBeNull();
    expect(screen.queryByText('203')).toBeNull();
    expect(screen.queryByText('6.1')).toBeNull();
    expect(screen.queryByText('18%')).toBeNull();
    expect(screen.queryByText('HR Policy Review')).toBeNull();
    expect(screen.getByText(/no student activity-hours contract/i)).toBeTruthy();
    expect(screen.getByText(/no student interview calendar contract/i)).toBeTruthy();
  });

  it('shows empty skill and application states when the APIs return none', async () => {
    listSkillClaims.mockResolvedValue([]);
    listMyApplications.mockResolvedValue({ applications: [] });
    renderDashboard();
    await waitFor(() => expect(screen.getByText('No skills declared yet.')).toBeTruthy());
    expect(screen.getByText('No applications yet.')).toBeTruthy();
  });
});
