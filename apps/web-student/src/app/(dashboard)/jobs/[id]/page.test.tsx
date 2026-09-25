import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SmartApiError } from '@smart/api-client';
import type { StudentJobDetail } from '@smart/contracts';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nav, resetNavigation } from '@/test-utils/navigation';
import JobDetailPage from './page';

vi.mock('next/navigation', async () => (await import('@/test-utils/navigation')).navigationModule);

const studentJobs = vi.hoisted(() => ({
  detail: vi.fn(),
  save: vi.fn(),
  unsave: vi.fn(),
  hide: vi.fn(),
  unhide: vi.fn(),
  report: vi.fn(),
}));
vi.mock('@/lib/api', () => ({ api: { studentJobs } }));

const JOB = '00000000-0000-4000-8000-000000000001';
const COMPANY = '11111111-1111-4111-8111-111111111111';

function detail(over: Partial<StudentJobDetail> = {}): StudentJobDetail {
  return {
    id: JOB,
    roleTitle: 'Backend Engineer',
    companyName: 'Acme Robotics',
    companyId: COMPANY,
    companyVerified: true,
    companyVerifiedAt: '2026-09-01T10:00:00.000Z',
    location: 'Pune',
    employmentType: 'FULL_TIME',
    workMode: 'HYBRID',
    lastDateToApply: '2026-10-30',
    postedAt: '2026-09-20T00:00:00.000Z',
    fit: {
      band: 'MODERATE',
      matchPercent: 64,
      topReason: 'Your verified Node meets the requirement',
    },
    applied: false,
    saved: false,
    description: 'Build APIs that matter.',
    aboutCompany: 'We build robots.',
    companyOffers: null,
    salaryDetails: null,
    logoUrl: null,
    acceptingApplications: true,
    applicationId: null,
    hidden: false,
    whyItMatches: ['Your verified Node meets the Intermediate requirement'],
    requirements: [
      {
        skillCode: 'NODE',
        skillName: 'Node.js',
        requiredProficiency: 'INTERMEDIATE',
        importance: 'MANDATORY',
        studentProficiency: 'ADVANCED',
        status: 'MET',
        evidenceRequired: 1,
        evidenceMet: 1,
        action: null,
      },
      {
        skillCode: 'SQL',
        skillName: 'SQL',
        requiredProficiency: 'ADVANCED',
        importance: 'MANDATORY',
        studentProficiency: null,
        status: 'MISSING',
        evidenceRequired: 2,
        evidenceMet: 0,
        action: { label: 'Verify this skill', href: '/skills/verify?skill=SQL' },
      },
      {
        skillCode: 'DOCKER',
        skillName: 'Docker',
        requiredProficiency: 'BEGINNER',
        importance: 'MANDATORY',
        studentProficiency: 'BEGINNER',
        status: 'PARTIAL',
        evidenceRequired: 1,
        evidenceMet: 0,
        action: { label: 'Add or verify this skill', href: '/skills' },
      },
    ],
    ...over,
  } as StudentJobDetail;
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <JobDetailPage />
    </QueryClientProvider>,
  );
}

describe('Job detail page (Th6-382/383)', () => {
  beforeEach(() => {
    resetNavigation();
    nav.params = { id: JOB };
    Object.values(studentJobs).forEach((fn) => fn.mockReset());
  });
  afterEach(cleanup);

  it('shows the description, company card with verified badge and company page link, and why it matches', async () => {
    studentJobs.detail.mockResolvedValue(detail());
    renderPage();
    expect(screen.getByText('Loading job…')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Backend Engineer' })).toBeTruthy();
    expect(screen.getByText('Build APIs that matter.')).toBeTruthy();
    const company = screen.getByLabelText('Company');
    expect(within(company).getByTestId('verified-badge')).toBeTruthy();
    expect(
      within(company).getByRole('link', { name: 'View company page' }).getAttribute('href'),
    ).toBe(`http://localhost:3004/companies/${COMPANY}`);
    expect(screen.getByTestId('detail-fit').textContent).toContain('Good fit');
    expect(screen.getByLabelText('Why it matches').textContent).toContain(
      'meets the Intermediate requirement',
    );
  });

  it('hides the badge and company link for a university-posted job', async () => {
    studentJobs.detail.mockResolvedValue(
      detail({ companyId: null, companyVerified: false, companyVerifiedAt: null }),
    );
    renderPage();
    await screen.findByRole('heading', { name: 'Backend Engineer' });
    expect(screen.queryByTestId('verified-badge')).toBeNull();
    expect(screen.queryByRole('link', { name: 'View company page' })).toBeNull();
  });

  it('lists each requirement with level, status and evidence, and highlights mandatory gaps', async () => {
    studentJobs.detail.mockResolvedValue(detail());
    renderPage();
    await screen.findByRole('heading', { name: 'Backend Engineer' });
    const met = screen.getByTestId('requirement-NODE');
    expect(met.getAttribute('data-mandatory-gap')).toBe('false');
    expect(within(met).getByText('Met')).toBeTruthy();
    const missing = screen.getByTestId('requirement-SQL');
    expect(missing.getAttribute('data-mandatory-gap')).toBe('true');
    expect(within(missing).getByText('Missing')).toBeTruthy();
    expect(within(missing).getByText('Not verified')).toBeTruthy();
    expect(within(missing).getByText('0 of 2')).toBeTruthy();
    expect(screen.getByTestId('requirement-DOCKER').getAttribute('data-mandatory-gap')).toBe(
      'true',
    );
    expect(within(screen.getByTestId('requirement-DOCKER')).getByText('Partly met')).toBeTruthy();
  });

  it('links each gap to its recommendation, or the Skills page', async () => {
    studentJobs.detail.mockResolvedValue(detail());
    renderPage();
    await screen.findByRole('heading', { name: 'Backend Engineer' });
    expect(screen.getByRole('link', { name: 'Verify this skill' }).getAttribute('href')).toBe(
      '/skills/verify?skill=SQL',
    );
    expect(
      screen.getByRole('link', { name: 'Add or verify this skill' }).getAttribute('href'),
    ).toBe('/skills');
    expect(within(screen.getByTestId('requirement-NODE')).queryByRole('link')).toBeNull();
  });

  it('says so when the job lists no required skills', async () => {
    studentJobs.detail.mockResolvedValue(detail({ requirements: [] }));
    renderPage();
    expect(await screen.findByText(/does not list required skills/)).toBeTruthy();
  });

  it('shows the applied badge and a View application link instead of Apply', async () => {
    studentJobs.detail.mockResolvedValue(detail({ applied: true, applicationId: 'app-1' }));
    renderPage();
    await screen.findByRole('heading', { name: 'Backend Engineer' });
    expect(screen.getByTestId('applied-badge')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View application' }).getAttribute('href')).toBe(
      '/applications',
    );
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
  });

  it('shows "No longer accepting applications" for a closed job the student applied to or saved', async () => {
    studentJobs.detail.mockResolvedValue(detail({ acceptingApplications: false, saved: true }));
    renderPage();
    expect(await screen.findByText('No longer accepting applications')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Backend Engineer' })).toBeTruthy();
  });

  it('shows a not-available state for a 404 and an error state that retries', async () => {
    studentJobs.detail.mockRejectedValueOnce(
      new SmartApiError({
        error: 'not_found',
        message: 'Job not found.',
        statusCode: 404,
      } as never),
    );
    renderPage();
    expect(await screen.findByText('This job is not available')).toBeTruthy();
    cleanup();

    studentJobs.detail.mockRejectedValueOnce(new Error('down'));
    renderPage();
    expect(await screen.findByText('Could not load this job')).toBeTruthy();
    studentJobs.detail.mockResolvedValue(detail());
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    expect(await screen.findByRole('heading', { name: 'Backend Engineer' })).toBeTruthy();
  });

  it('saves optimistically and rolls back on failure', async () => {
    studentJobs.detail.mockResolvedValue(detail());
    studentJobs.save.mockRejectedValue(new Error('boom'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('hides the job with an optional reason and returns to the list', async () => {
    studentJobs.detail.mockResolvedValue(detail());
    studentJobs.hide.mockResolvedValue({ jobId: JOB, active: true });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Hide' }));
    fireEvent.click(screen.getByLabelText('Not relevant to me'));
    fireEvent.click(screen.getByRole('button', { name: 'Hide job' }));
    await waitFor(() =>
      expect(studentJobs.hide).toHaveBeenCalledWith(JOB, { reason: 'Not relevant to me' }),
    );
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/jobs'));
  });

  it('reports the job and returns to the list', async () => {
    studentJobs.detail.mockResolvedValue(detail());
    studentJobs.report.mockResolvedValue({ id: 'r1', alreadyReported: false });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Report' }));
    fireEvent.click(screen.getByLabelText('Discriminatory'));
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(studentJobs.report).toHaveBeenCalledTimes(1));
    expect(studentJobs.report.mock.calls[0]?.[0]).toMatchObject({
      targetId: JOB,
      reason: 'DISCRIMINATORY',
    });
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/jobs'));
  });

  it('keeps Apply disabled: applying is not part of job discovery', async () => {
    studentJobs.detail.mockResolvedValue(detail());
    renderPage();
    const apply = (await screen.findByRole('button', { name: 'Apply' })) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
  });
});
