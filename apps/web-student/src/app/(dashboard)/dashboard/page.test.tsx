import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { StudentDashboardSummary } from '@smart/contracts';
import DashboardPage from './page';

const { getDashboard } = vi.hoisted(() => ({ getDashboard: vi.fn() }));

vi.mock('@/lib/candidate-identity', () => ({
  useCurrentUser: () => ({
    data: {
      userId: 'usr_1',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      profilePhotoUrl: null,
    },
    isLoading: false,
  }),
  firstNameOf: (name?: string) => name?.split(' ')[0] ?? '',
}));

vi.mock('@/lib/api', () => ({ api: { users: { getDashboard } } }));

const OPENING = '11111111-1111-4111-8111-111111111111';
const APPLICATION = '22222222-2222-4222-8222-222222222222';

function summary(overrides: Partial<StudentDashboardSummary> = {}): StudentDashboardSummary {
  return {
    generatedAt: '2026-09-25T00:00:00.000Z',
    completion: {
      percent: 50,
      completedAreas: ['skills', 'languages'],
      incompleteAreas: ['education'],
    },
    nextAction: {
      title: 'Complete your education profile',
      description: 'Add your degree.',
      ctaLabel: 'Continue to education',
      href: '/profile?section=education',
    },
    attentionItems: [],
    topMatches: [],
    opportunities: { total: 0, items: [] },
    activeApplications: { total: 0, items: [] },
    recentActivity: [],
    profileViews: { visible: false, employerViews: null, windowDays: 30 },
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('DashboardPage (STU-03)', () => {
  beforeEach(() => {
    getDashboard.mockReset().mockResolvedValue(summary());
  });

  it('shows the greeting and the completion status from the summary', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /Ada/i })).toBeTruthy();
    expect(screen.getByTestId('student-verification-banner')).toBeTruthy();
    expect(screen.getByText('Your profile is 50% verified')).toBeTruthy();
  });

  it('shows explicit empty states and never fabricates data when nothing exists', async () => {
    renderPage();
    await screen.findByText('Your profile is 50% verified');

    expect(screen.getByText('Nothing needs your attention')).toBeTruthy();
    expect(screen.getByText('No new opportunities')).toBeTruthy();
    expect(screen.getByText('No active applications')).toBeTruthy();
    expect(screen.getByText(/No active job matches yet/i)).toBeTruthy();
    expect(screen.getByText(/No activity recorded yet/i)).toBeTruthy();
    // No invented default score or role.
    expect(screen.queryByText(/85%/)).toBeNull();
    expect(screen.queryByText('Software Engineer')).toBeNull();
  });

  it('lists verification steps with their processing, action and failure states', async () => {
    getDashboard.mockResolvedValue(
      summary({
        attentionItems: [
          {
            id: 'credential-1',
            kind: 'CREDENTIAL',
            state: 'FAILED',
            title: 'AWS SA (AWS)',
            detail: 'Verification did not pass.',
            href: '/profile?section=credentials',
          },
          {
            id: 'education-1',
            kind: 'EDUCATION',
            state: 'NEEDS_ACTION',
            title: 'MIT',
            detail: 'Attach proof.',
            href: '/profile?section=education',
          },
          {
            id: 'work-1',
            kind: 'WORK_EXPERIENCE',
            state: 'PROCESSING',
            title: 'Intern at Acme',
            detail: 'Waiting for your employer.',
            href: '/profile?section=experience',
          },
        ],
      }),
    );
    renderPage();

    await screen.findByText('AWS SA (AWS)');
    const panel = screen.getByTestId('attention-panel');
    expect(panel.textContent).toContain('AWS SA (AWS)');
    expect(panel.textContent).toContain('Failed');
    expect(panel.textContent).toContain('Needs action');
    expect(panel.textContent).toContain('In progress');
    expect(screen.queryByText('Nothing needs your attention')).toBeNull();
  });

  it('shows real opportunities, applications, matches and activity', async () => {
    getDashboard.mockResolvedValue(
      summary({
        topMatches: [
          {
            source: 'APPLICATION',
            applicationId: APPLICATION,
            openingId: OPENING,
            roleTitle: 'Backend Engineer',
            companyName: 'Acme',
            location: 'Pune',
            matchPercent: 88,
            stage: 'SHORTLISTED',
          },
        ],
        opportunities: {
          total: 7,
          items: [
            {
              openingId: OPENING,
              roleTitle: 'Data Analyst',
              companyName: 'Globex',
              location: 'Remote',
              employmentType: 'FULL_TIME',
              lastDateToApply: '2026-10-15',
              postedAt: '2026-09-20T00:00:00.000Z',
            },
          ],
        },
        activeApplications: {
          total: 2,
          items: [
            {
              applicationId: APPLICATION,
              openingId: OPENING,
              roleTitle: 'Backend Engineer',
              companyName: 'Acme',
              stage: 'INTERVIEW',
              updatedAt: '2026-09-24T00:00:00.000Z',
            },
          ],
        },
        recentActivity: [
          {
            id: 'audit-1',
            kind: 'VERIFICATION',
            byYou: false,
            label: 'Candidate education updated',
            occurredAt: '2026-09-24T00:00:00.000Z',
          },
        ],
      }),
    );
    renderPage();

    expect(await screen.findByText('Data Analyst')).toBeTruthy();
    expect(screen.getByText('Apply by 2026-10-15')).toBeTruthy();
    expect(screen.getByText('Showing 1 of 7')).toBeTruthy();
    expect(screen.getByTestId('applications-panel').textContent).toContain('Interview');
    expect(screen.getByText('Candidate education updated')).toBeTruthy();
    expect(screen.getAllByText('Backend Engineer').length).toBeGreaterThan(0);
  });

  it('says it is loading instead of claiming there is nothing to show', async () => {
    getDashboard.mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect((await screen.findAllByText('Loading…')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Nothing needs your attention')).toBeNull();
    expect(screen.queryByText('No new opportunities')).toBeNull();
  });

  it('hides the employer view count until the student opts in', async () => {
    renderPage();
    expect(await screen.findByText('Hidden. Turn on in Settings')).toBeTruthy();
    expect(screen.queryByText(/Last 30 days/)).toBeNull();
  });

  it('shows the employer view count once the student has opted in', async () => {
    getDashboard.mockResolvedValue(
      summary({ profileViews: { visible: true, employerViews: 4, windowDays: 30 } }),
    );
    renderPage();

    expect(await screen.findByText('Last 30 days')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.queryByText('Hidden. Turn on in Settings')).toBeNull();
  });

  it('links the next recommended action directly', async () => {
    renderPage();

    const cta = await screen.findByRole('link', { name: /Continue to education/i });
    expect(cta.getAttribute('href')).toBe('/profile?section=education');
  });

  it('says so when there is no next action left', async () => {
    getDashboard.mockResolvedValue(summary({ nextAction: null }));
    renderPage();

    expect(await screen.findByText('Your profile is complete')).toBeTruthy();
  });

  it('shows a recoverable error and reloads on retry', async () => {
    getDashboard.mockRejectedValueOnce(new Error('network')).mockResolvedValue(summary());
    renderPage();

    expect((await screen.findByRole('alert')).textContent).toMatch(
      /could not load your dashboard/i,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(getDashboard).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Your profile is 50% verified')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows an unapplied opening as a scored match', async () => {
    getDashboard.mockResolvedValue(
      summary({
        topMatches: [
          {
            source: 'OPENING',
            applicationId: null,
            openingId: OPENING,
            roleTitle: 'Platform Engineer',
            companyName: 'Initech',
            location: null,
            matchPercent: 91,
            stage: null,
          },
        ],
      }),
    );
    renderPage();

    expect(await screen.findByText('Platform Engineer')).toBeTruthy();
    expect(screen.getByText(/Initech · Location not specified/)).toBeTruthy();
    expect(screen.getByText(/91/)).toBeTruthy();
  });

  it('lists certificate and project verification steps that need attention', async () => {
    getDashboard.mockResolvedValue(
      summary({
        attentionItems: [
          {
            id: 'certificate-1',
            kind: 'CERTIFICATE',
            state: 'FAILED',
            title: 'Cloud Basics (Coursera)',
            detail: 'Verification did not pass.',
            href: '/profile?section=certifications',
          },
          {
            id: 'project-1',
            kind: 'PROJECT',
            state: 'PROCESSING',
            title: 'Weather API',
            detail: 'Your project is being reviewed.',
            href: '/profile?section=projects',
          },
        ],
      }),
    );
    renderPage();

    await screen.findByText('Cloud Basics (Coursera)');
    expect(screen.getByText('Weather API')).toBeTruthy();
  });
});
