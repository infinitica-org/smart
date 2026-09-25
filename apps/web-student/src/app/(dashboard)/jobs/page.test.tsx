import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SmartApiError } from '@smart/api-client';
import type { StudentJobCard } from '@smart/contracts';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentSearch, nav, resetNavigation } from '@/test-utils/navigation';
import JobsPage from './page';

vi.mock('next/navigation', async () => (await import('@/test-utils/navigation')).navigationModule);

const studentJobs = vi.hoisted(() => ({
  list: vi.fn(),
  listSaved: vi.fn(),
  save: vi.fn(),
  unsave: vi.fn(),
  hide: vi.fn(),
  unhide: vi.fn(),
  report: vi.fn(),
}));
vi.mock('@/lib/api', () => ({ api: { studentJobs } }));

const COMPANY = '11111111-1111-4111-8111-111111111111';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function job(n: number, over: Partial<StudentJobCard> = {}): StudentJobCard {
  return {
    id: id(n),
    roleTitle: `Role ${n}`,
    companyName: `Company ${n}`,
    companyId: null,
    companyVerified: false,
    companyVerifiedAt: null,
    location: 'Pune',
    employmentType: 'FULL_TIME',
    workMode: 'HYBRID',
    lastDateToApply: null,
    postedAt: '2026-09-20T00:00:00.000Z',
    fit: null,
    applied: false,
    saved: false,
    ...over,
  };
}

const page = (jobs: StudentJobCard[], over: Record<string, unknown> = {}) => ({
  jobs,
  nextCursor: null,
  counts: { strong: 1, good: 2, all: jobs.length },
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <JobsPage />
    </QueryClientProvider>,
  );
}

describe('Jobs page (Th6-379..386)', () => {
  beforeEach(() => {
    resetNavigation();
    Object.values(studentJobs).forEach((fn) => fn.mockReset());
    studentJobs.listSaved.mockResolvedValue({ jobs: [] });
  });
  afterEach(cleanup);

  describe('browse (Th6-379)', () => {
    it('shows loading, then real cards with company, location, fit band and top reason', async () => {
      studentJobs.list.mockResolvedValue(
        page([
          job(1, {
            fit: {
              band: 'STRONG',
              matchPercent: 92,
              topReason: 'Your verified React meets the requirement',
            },
          }),
        ]),
      );
      renderPage();
      expect(screen.getByText('Finding jobs for you…')).toBeTruthy();
      expect(await screen.findByRole('link', { name: 'Role 1' })).toBeTruthy();
      expect(screen.getByText('Pune')).toBeTruthy();
      expect(screen.getByTestId('fit-band').textContent).toContain('Strong fit · 92%');
      expect(screen.getByText('Your verified React meets the requirement')).toBeTruthy();
    });

    it('shows the verified badge only on verified-company jobs, and the applied badge only when applied', async () => {
      studentJobs.list.mockResolvedValue(
        page([
          job(1, {
            companyId: COMPANY,
            companyVerified: true,
            companyVerifiedAt: '2026-09-01T10:00:00.000Z',
          }),
          job(2, { applied: true }),
        ]),
      );
      renderPage();
      await screen.findByRole('link', { name: 'Role 1' });
      const cards = screen
        .getAllByRole('listitem')
        .filter((el) => el.tagName === 'LI' && el.textContent?.includes('Role'));
      expect(within(cards[0] as HTMLElement).getByTestId('verified-badge')).toBeTruthy();
      expect(within(cards[0] as HTMLElement).queryByTestId('applied-badge')).toBeNull();
      expect(within(cards[1] as HTMLElement).queryByTestId('verified-badge')).toBeNull();
      expect(within(cards[1] as HTMLElement).getByTestId('applied-badge')).toBeTruthy();
    });

    it('shows the empty state when there are no jobs, and an error state that retries', async () => {
      studentJobs.list.mockResolvedValueOnce(page([]));
      renderPage();
      expect(await screen.findByText('No jobs to show yet')).toBeTruthy();
      cleanup();

      studentJobs.list.mockRejectedValueOnce(new Error('down'));
      renderPage();
      expect(await screen.findByText('Could not load jobs')).toBeTruthy();
      studentJobs.list.mockResolvedValue(page([job(1)]));
      fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
      expect(await screen.findByRole('link', { name: 'Role 1' })).toBeTruthy();
    });

    it('loads the next page with the server cursor and keeps the order', async () => {
      studentJobs.list.mockImplementation(async (query: { cursor?: string }) =>
        query.cursor === 'c1' ? page([job(3)]) : page([job(1), job(2)], { nextCursor: 'c1' }),
      );
      renderPage();
      await screen.findByRole('link', { name: 'Role 2' });
      fireEvent.click(screen.getByRole('button', { name: 'Load more jobs' }));
      await screen.findByRole('link', { name: 'Role 3' });
      expect(
        screen
          .getAllByRole('link')
          .map((el) => el.textContent)
          .filter((t) => t?.startsWith('Role')),
      ).toEqual(['Role 1', 'Role 2', 'Role 3']);
      expect(studentJobs.list.mock.calls.at(-1)?.[0]).toMatchObject({ cursor: 'c1' });
      expect(screen.queryByRole('button', { name: 'Load more jobs' })).toBeNull();
    });
  });

  describe('filters (Th6-380)', () => {
    it('keeps the filters in the URL, sends them to the API, and shows chips with clear-all', async () => {
      studentJobs.list.mockResolvedValue(page([job(1)]));
      renderPage();
      await screen.findByRole('link', { name: 'Role 1' });

      fireEvent.change(screen.getByLabelText('Employment type'), {
        target: { value: 'INTERNSHIP' },
      });
      fireEvent.change(screen.getByLabelText('Work mode'), { target: { value: 'REMOTE' } });
      await waitFor(() => expect(currentSearch()).toBe('type=INTERNSHIP&mode=REMOTE'));
      await waitFor(() =>
        expect(studentJobs.list.mock.calls.at(-1)?.[0]).toMatchObject({
          type: 'INTERNSHIP',
          mode: 'REMOTE',
        }),
      );
      expect(screen.getByRole('button', { name: 'Remove filter Internship' })).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'Remove filter Remote' }));
      await waitFor(() => expect(currentSearch()).toBe('type=INTERNSHIP'));
      fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
      await waitFor(() => expect(currentSearch()).toBe(''));
    });

    it('restores filters from the URL on load (refresh and shared links)', async () => {
      resetNavigation('fit=GOOD&type=FULL_TIME&location=Pune');
      studentJobs.list.mockResolvedValue(page([job(1)]));
      renderPage();
      await screen.findByRole('link', { name: 'Role 1' });
      expect(studentJobs.list.mock.calls[0]?.[0]).toMatchObject({
        fit: 'GOOD',
        type: 'FULL_TIME',
        location: 'Pune',
      });
      expect((screen.getByLabelText('Employment type') as HTMLSelectElement).value).toBe(
        'FULL_TIME',
      );
    });

    it('offers to clear filters when nothing matches them', async () => {
      resetNavigation('type=CONTRACT');
      studentJobs.list.mockResolvedValue(page([]));
      renderPage();
      expect(await screen.findByText('No jobs match these filters')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
      await waitFor(() => expect(currentSearch()).toBe(''));
    });
  });

  describe('fit tabs (Th6-381)', () => {
    it('shows the server counts, stores the tab in the URL, and asks the API for that band', async () => {
      studentJobs.list.mockResolvedValue(page([job(1), job(2), job(3)]));
      renderPage();
      await screen.findByRole('link', { name: 'Role 1' });
      expect(screen.getByRole('tab', { name: /Strong fit/ }).textContent).toContain('1');
      expect(screen.getByRole('tab', { name: /Good fit/ }).textContent).toContain('2');
      expect(screen.getByRole('tab', { name: /All/ }).textContent).toContain('3');

      fireEvent.click(screen.getByRole('tab', { name: /Strong fit/ }));
      await waitFor(() => expect(currentSearch()).toBe('fit=STRONG'));
      await waitFor(() =>
        expect(studentJobs.list.mock.calls.at(-1)?.[0]).toMatchObject({ fit: 'STRONG' }),
      );
      expect(screen.getByRole('tab', { name: /Strong fit/ }).getAttribute('aria-selected')).toBe(
        'true',
      );
    });
  });

  describe('save (Th6-384)', () => {
    it('flips the bookmark instantly and keeps it when the server agrees', async () => {
      studentJobs.list.mockResolvedValue(page([job(1)]));
      let release: (value: unknown) => void = () => undefined;
      studentJobs.save.mockReturnValue(new Promise((resolve) => (release = resolve)));
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Save Role 1' }));
      // The server has not answered yet (its promise is still pending), so this flip is optimistic.
      expect(await screen.findByRole('button', { name: 'Unsave Role 1' })).toBeTruthy();
      release({ jobId: id(1), active: true });
      await waitFor(() => expect(studentJobs.save).toHaveBeenCalledWith(id(1)));
      expect(screen.getByRole('button', { name: 'Unsave Role 1' })).toBeTruthy();
    });

    it('rolls the bookmark back and shows an error when the server fails', async () => {
      studentJobs.list.mockResolvedValue(page([job(1)]));
      studentJobs.save.mockRejectedValue(new Error('boom'));
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Save Role 1' }));
      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Save Role 1' })).toBeTruthy();
    });

    it('unsaves through DELETE and lists saved jobs with an empty state', async () => {
      studentJobs.list.mockResolvedValue(page([job(1, { saved: true })]));
      studentJobs.unsave.mockResolvedValue({ jobId: id(1), active: false });
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Unsave Role 1' }));
      await waitFor(() => expect(studentJobs.unsave).toHaveBeenCalledWith(id(1)));

      fireEvent.click(screen.getByRole('tab', { name: 'Saved jobs' }));
      await waitFor(() => expect(currentSearch()).toBe('view=saved'));
      expect(await screen.findByText('No saved jobs yet')).toBeTruthy();
    });

    it('lists my saved jobs', async () => {
      resetNavigation('view=saved');
      studentJobs.listSaved.mockResolvedValue({ jobs: [job(5, { saved: true })] });
      renderPage();
      expect(await screen.findByRole('link', { name: 'Role 5' })).toBeTruthy();
    });
  });

  describe('hide (Th6-385)', () => {
    it('hides with an optional reason, removes the job at once, and Undo restores it', async () => {
      const hidden = new Set<string>();
      studentJobs.list.mockImplementation(async () =>
        page([job(1), job(2)].filter((j) => !hidden.has(j.id))),
      );
      studentJobs.hide.mockImplementation(async (jobId: string) => {
        hidden.add(jobId);
        return { jobId, active: true };
      });
      studentJobs.unhide.mockImplementation(async (jobId: string) => {
        hidden.delete(jobId);
        return { jobId, active: false };
      });
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Hide Role 1' }));
      fireEvent.click(screen.getByLabelText('Wrong location'));
      fireEvent.click(screen.getByRole('button', { name: 'Hide job' }));

      await waitFor(() => expect(screen.queryByRole('link', { name: 'Role 1' })).toBeNull());
      expect(studentJobs.hide).toHaveBeenCalledWith(id(1), { reason: 'Wrong location' });
      fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
      await waitFor(() => expect(studentJobs.unhide).toHaveBeenCalledWith(id(1)));
      expect(await screen.findByRole('link', { name: 'Role 1' })).toBeTruthy();
    });

    it('hides without a reason and restores the job if the server fails', async () => {
      studentJobs.list.mockResolvedValue(page([job(1)]));
      studentJobs.hide.mockRejectedValue(new Error('boom'));
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Hide Role 1' }));
      fireEvent.click(screen.getByRole('button', { name: 'Hide job' }));
      await waitFor(() => expect(studentJobs.hide).toHaveBeenCalledWith(id(1), {}));
      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(await screen.findByRole('link', { name: 'Role 1' })).toBeTruthy();
    });
  });

  describe('report (Th6-386)', () => {
    it('requires a reason, and requires details for "something else"', async () => {
      studentJobs.list.mockResolvedValue(page([job(1)]));
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Report Role 1' }));
      fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
      expect(await screen.findByText('Choose a reason.')).toBeTruthy();
      fireEvent.click(screen.getByLabelText('Something else'));
      fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
      expect(await screen.findByText(/at least 10 characters/)).toBeTruthy();
      expect(studentJobs.report).not.toHaveBeenCalled();
    });

    it('sends the report with an Idempotency-Key and tells the student the job is hidden', async () => {
      studentJobs.list.mockResolvedValue(page([job(1)]));
      studentJobs.report.mockResolvedValue({ id: 'r1', alreadyReported: false });
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Report Role 1' }));
      fireEvent.click(screen.getByLabelText('Looks like a scam'));
      fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
      await waitFor(() => expect(studentJobs.report).toHaveBeenCalledTimes(1));
      const [body, key] = studentJobs.report.mock.calls[0] ?? [];
      expect(body).toMatchObject({ targetType: 'JOB', targetId: id(1), reason: 'SCAM' });
      expect(typeof key).toBe('string');
      expect(await screen.findByText(/We hid this job for you/)).toBeTruthy();
    });

    it('reuses the key on retry and says so when the job was already reported', async () => {
      studentJobs.list.mockResolvedValue(page([job(1)]));
      studentJobs.report
        .mockRejectedValueOnce(
          new SmartApiError({
            error: 'server_error',
            message: 'Try later',
            statusCode: 500,
          } as never),
        )
        .mockResolvedValueOnce({ id: 'r1', alreadyReported: true });
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'Report Role 1' }));
      fireEvent.click(screen.getByLabelText('Misleading or false'));
      fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
      expect(await screen.findByText('Try later')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
      await waitFor(() => expect(studentJobs.report).toHaveBeenCalledTimes(2));
      expect(studentJobs.report.mock.calls[1]?.[1]).toBe(studentJobs.report.mock.calls[0]?.[1]);
      expect(await screen.findByText(/already reported this job/)).toBeTruthy();
    });
  });

  it('never navigates on its own when filters are untouched', async () => {
    studentJobs.list.mockResolvedValue(page([job(1)]));
    renderPage();
    await screen.findByRole('link', { name: 'Role 1' });
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
