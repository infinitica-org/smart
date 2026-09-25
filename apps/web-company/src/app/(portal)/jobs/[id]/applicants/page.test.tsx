/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SmartApiError } from '@smart/api-client';
import type { EmployerApplicantCard } from '@smart/contracts';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JobApplicantsPage from './page';

const employer = vi.hoisted(() => ({ listApplicants: vi.fn(), transitionApplication: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { employer } }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '00000000-0000-4000-8000-000000000001' }),
}));
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => children,
  DragOverlay: () => null,
  KeyboardSensor: class {},
  PointerSensor: class {},
  useSensor: (s: unknown) => s,
  useSensors: (...s: unknown[]) => s,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    isDragging: false,
  }),
  useDroppable: () => ({ setNodeRef: () => undefined, isOver: false }),
}));

const JOB = '00000000-0000-4000-8000-000000000001';

const applicant = (
  n: number,
  over: Partial<EmployerApplicantCard> = {},
): EmployerApplicantCard => ({
  applicationId: `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  candidateName: `Candidate ${n}`,
  fit: { band: 'STRONG', matchPercent: 90 - n, topReason: null },
  fitRecalculated: false,
  status: 'APPLIED',
  statusLabel: 'Applied',
  allowedNext: ['REVIEWING', 'REJECTED'],
  appliedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

const page = (applicants: EmployerApplicantCard[], over: Record<string, unknown> = {}) => ({
  job: { id: JOB, roleTitle: 'Backend Engineer' },
  applicants,
  nextCursor: null,
  total: applicants.length,
  ...over,
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <JobApplicantsPage />
    </QueryClientProvider>,
  );
}

describe('Job applicants page (Th6-390/391/414)', () => {
  beforeEach(() => Object.values(employer).forEach((fn) => fn.mockReset()));
  afterEach(cleanup);

  it('shows loading, empty and error states (error retries)', async () => {
    employer.listApplicants.mockResolvedValueOnce(page([]));
    renderPage();
    expect(screen.getByText('Loading applicants…')).toBeTruthy();
    expect(await screen.findByText('No applicants yet')).toBeTruthy();
    cleanup();
    employer.listApplicants.mockRejectedValueOnce(new Error('down'));
    renderPage();
    expect(await screen.findByText('Could not load applicants')).toBeTruthy();
    employer.listApplicants.mockResolvedValue(page([applicant(1)]));
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    expect(await screen.findByText('Candidate 1')).toBeTruthy();
  });

  it('lists name, fit, status and applied date, with the recalculated hint', async () => {
    employer.listApplicants.mockResolvedValue(
      page([applicant(1, { fitRecalculated: true }), applicant(2)]),
    );
    renderPage();
    expect(await screen.findByText('Applicants: Backend Engineer')).toBeTruthy();
    expect(screen.getByText('Candidate 1')).toBeTruthy();
    expect(screen.getAllByText('Strong fit · 89%').length).toBe(1);
    expect(screen.getAllByTestId('recalculated-hint')).toHaveLength(1);
    expect(screen.getAllByText('01 Sep 2026').length).toBeGreaterThan(0);
  });

  it('asks the API for the chosen sort and stage, using only whitelisted sort keys', async () => {
    employer.listApplicants.mockResolvedValue(page([applicant(1)]));
    renderPage();
    await screen.findByText('Candidate 1');
    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'status' } });
    await waitFor(() =>
      expect(employer.listApplicants.mock.calls.at(-1)?.[1]).toMatchObject({ sort: 'status' }),
    );
    fireEvent.change(screen.getByLabelText('Stage'), { target: { value: 'REVIEWING' } });
    await waitFor(() =>
      expect(employer.listApplicants.mock.calls.at(-1)?.[1]).toMatchObject({
        sort: 'status',
        status: 'REVIEWING',
      }),
    );
    const sortOptions = [...(screen.getByLabelText('Sort') as HTMLSelectElement).options].map(
      (o) => o.value,
    );
    expect(sortOptions).toEqual(['fit', 'applied', 'status']);
  });

  it('moves a candidate from the status dropdown with the expected status and an Idempotency-Key', async () => {
    employer.listApplicants.mockResolvedValue(page([applicant(1)]));
    employer.transitionApplication.mockResolvedValue({});
    renderPage();
    const select = await screen.findByLabelText('Status for Candidate 1');
    fireEvent.change(select, { target: { value: 'REVIEWING' } });
    await waitFor(() => expect(employer.transitionApplication).toHaveBeenCalledTimes(1));
    const [id, body, key] = employer.transitionApplication.mock.calls[0] ?? [];
    expect(id).toBe(applicant(1).applicationId);
    expect(body).toEqual({ toStatus: 'REVIEWING', expectedFromStatus: 'APPLIED' });
    expect(typeof key).toBe('string');
  });

  it('shows the new status immediately (optimistic) while the server is still working', async () => {
    employer.listApplicants.mockResolvedValue(page([applicant(1)]));
    employer.transitionApplication.mockReturnValue(new Promise(() => undefined)); // never answers
    renderPage();
    fireEvent.change(await screen.findByLabelText('Status for Candidate 1'), {
      target: { value: 'REVIEWING' },
    });
    await waitFor(() => {
      const select = screen.getByLabelText('Status for Candidate 1') as HTMLSelectElement;
      expect(select.value).toBe('REVIEWING');
      // and the dropdown now offers only what comes after Reviewing
      expect([...select.options].map((o) => o.text)).toEqual([
        'Reviewing',
        'Move to Interviewing',
        'Move to Rejected',
      ]);
    });
  });

  it('rolls the card back and explains a 409 (someone else moved it), then refreshes', async () => {
    employer.listApplicants.mockResolvedValue(page([applicant(1)]));
    employer.transitionApplication.mockRejectedValue(
      new SmartApiError({
        error: 'stale_status',
        message: 'This application is now Reviewing. Refresh and try again.',
        statusCode: 409,
      } as never),
    );
    renderPage();
    fireEvent.change(await screen.findByLabelText('Status for Candidate 1'), {
      target: { value: 'REJECTED' },
    });
    expect(await screen.findByText(/This application is now Reviewing/)).toBeTruthy();
    await waitFor(() =>
      expect((screen.getByLabelText('Status for Candidate 1') as HTMLSelectElement).value).toBe(
        'APPLIED',
      ),
    );
    await waitFor(() => expect(employer.listApplicants.mock.calls.length).toBeGreaterThan(1)); // board refreshed
  });

  it('rolls the card back and explains a 422 (not an allowed move)', async () => {
    employer.listApplicants.mockResolvedValue(page([applicant(1)]));
    employer.transitionApplication.mockRejectedValue(
      new SmartApiError({
        error: 'transition_not_allowed',
        message: "Can't move from Applied to Offered",
        statusCode: 422,
      } as never),
    );
    renderPage();
    fireEvent.change(await screen.findByLabelText('Status for Candidate 1'), {
      target: { value: 'REVIEWING' },
    });
    expect(await screen.findByText("Can't move from Applied to Offered")).toBeTruthy();
    await waitFor(() =>
      expect((screen.getByLabelText('Status for Candidate 1') as HTMLSelectElement).value).toBe(
        'APPLIED',
      ),
    );
  });

  it('shows finished and withdrawn applicants as plain status text with nothing to change', async () => {
    employer.listApplicants.mockResolvedValue(
      page([
        applicant(1, { status: 'WITHDRAWN', statusLabel: 'Withdrawn', allowedNext: [] }),
        applicant(2, { status: 'HIRED', statusLabel: 'Hired', allowedNext: [] }),
      ]),
    );
    renderPage();
    expect(await screen.findByText('Withdrawn')).toBeTruthy();
    expect(screen.getByText('Hired')).toBeTruthy();
    expect(screen.queryByLabelText('Status for Candidate 1')).toBeNull();
  });

  it('switches to the pipeline board with one column per stage', async () => {
    employer.listApplicants.mockResolvedValue(page([applicant(1)]));
    renderPage();
    await screen.findByText('Candidate 1');
    fireEvent.click(screen.getByRole('tab', { name: 'Pipeline board' }));
    expect(await screen.findByTestId('pipeline-board')).toBeTruthy();
    expect(screen.getByTestId('column-APPLIED')).toBeTruthy();
    expect(screen.getByTestId('column-OFFERED')).toBeTruthy();
  });

  it('loads more applicants with the server cursor', async () => {
    employer.listApplicants.mockImplementation(async (_id: string, query: { cursor?: string }) =>
      query.cursor === 'c1'
        ? page([applicant(3)])
        : page([applicant(1), applicant(2)], { nextCursor: 'c1' }),
    );
    renderPage();
    await screen.findByText('Candidate 2');
    fireEvent.click(screen.getByRole('button', { name: 'Load more applicants' }));
    expect(await screen.findByText('Candidate 3')).toBeTruthy();
    expect(employer.listApplicants.mock.calls.at(-1)?.[1]).toMatchObject({ cursor: 'c1' });
  });
});
