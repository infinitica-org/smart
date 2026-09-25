import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SmartApiError } from '@smart/api-client';
import type { EmployerApplicantCard } from '@smart/contracts';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CandidatePanel } from './CandidatePanel';

const employer = vi.hoisted(() => ({
  listCandidateNotes: vi.fn(),
  addCandidateNote: vi.fn(),
  assignRecruiter: vi.fn(),
  recordOutcome: vi.fn(),
  listMembers: vi.fn(),
}));
const auth = vi.hoisted(() => ({ companyAccount: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { employer, auth } }));

const APP = 'a0000000-0000-4000-8000-000000000001';
const REC = 'b0000000-0000-4000-8000-000000000001';

const applicant = (status: EmployerApplicantCard['status']): EmployerApplicantCard => ({
  applicationId: APP,
  candidateName: 'Candidate 1',
  fit: null,
  fitRecalculated: false,
  status,
  statusLabel: status,
  allowedNext: [],
  appliedAt: '2026-09-01T00:00:00.000Z',
});

function renderPanel(status: EmployerApplicantCard['status'] = 'APPLIED') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CandidatePanel applicant={applicant(status)} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('CandidatePanel (Th6-416/417/420)', () => {
  beforeEach(() => {
    Object.values(employer).forEach((fn) => fn.mockReset());
    auth.companyAccount.mockReset().mockResolvedValue({ companyVerificationStatus: 'APPROVED' });
    employer.listCandidateNotes.mockResolvedValue({ notes: [] });
    employer.listMembers.mockResolvedValue({
      members: [
        {
          id: REC,
          fullName: 'Rita Recruiter',
          email: 'r@x.test',
          role: 'RECRUITER',
          status: 'ACTIVE',
          deactivatedAt: null,
        },
        {
          id: 'x',
          fullName: 'Gone Person',
          email: 'g@x.test',
          role: 'RECRUITER',
          status: 'DEACTIVATED',
          deactivatedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
    });
  });
  afterEach(cleanup);

  it('shows the empty notes state and adds a note with an Idempotency-Key', async () => {
    employer.addCandidateNote.mockResolvedValue({});
    renderPanel();
    expect(await screen.findByText('No notes yet.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('New note'), { target: { value: 'Strong portfolio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    await waitFor(() => expect(employer.addCandidateNote).toHaveBeenCalledTimes(1));
    const [id, body, key] = employer.addCandidateNote.mock.calls[0] ?? [];
    expect(id).toBe(APP);
    expect(body).toEqual({ body: 'Strong portfolio' });
    expect(typeof key).toBe('string');
  });

  it('will not add an empty note', async () => {
    renderPanel();
    await screen.findByText('No notes yet.');
    expect((screen.getByRole('button', { name: 'Add note' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('offers only active team members and assigns one', async () => {
    employer.assignRecruiter.mockResolvedValue({
      applicationId: APP,
      assigneeId: REC,
      assigneeName: 'Rita Recruiter',
    });
    renderPanel();
    await screen.findByText('Rita Recruiter');
    expect(screen.queryByText('Gone Person')).toBeNull();
    fireEvent.change(screen.getByLabelText('Assign recruiter'), { target: { value: REC } });
    await waitFor(() => expect(employer.assignRecruiter).toHaveBeenCalledTimes(1));
    expect(employer.assignRecruiter.mock.calls[0]?.[1]).toEqual({ assigneeId: REC });
    expect(await screen.findByText('Assigned to Rita Recruiter')).toBeTruthy();
  });

  it('only offers outcomes the stage allows', async () => {
    const view = renderPanel('APPLIED');
    await screen.findByText('No notes yet.');
    expect(screen.queryByLabelText('Offer outcome')).toBeNull();
    expect(screen.queryByLabelText('Joining outcome')).toBeNull();
    view.unmount();
    renderPanel('OFFERED');
    expect(await screen.findByLabelText('Offer outcome')).toBeTruthy();
    expect(screen.queryByLabelText('Joining outcome')).toBeNull();
    cleanup();
    renderPanel('HIRED');
    expect(await screen.findByLabelText('Joining outcome')).toBeTruthy();
  });

  it('records an offer outcome and explains a refusal', async () => {
    employer.recordOutcome.mockRejectedValueOnce(
      new SmartApiError({
        error: 'validation_failed',
        message: 'Move the candidate to Offered first.',
        statusCode: 422,
      } as never),
    );
    renderPanel('OFFERED');
    fireEvent.change(await screen.findByLabelText('Offer outcome'), {
      target: { value: 'ACCEPTED' },
    });
    expect(await screen.findByText('Move the candidate to Offered first.')).toBeTruthy();
    expect(employer.recordOutcome.mock.calls[0]?.[1]).toEqual({ offerOutcome: 'ACCEPTED' });
  });
  it('disables Message and explains why while the company is not verified (Th6-429)', async () => {
    auth.companyAccount.mockResolvedValue({ companyVerificationStatus: 'PENDING' });
    renderPanel();
    expect(
      await screen.findByText(/must be verified before you can message students/i),
    ).toBeDefined();
    expect((screen.getByRole('button', { name: 'Message' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByRole('link', { name: /complete verification/i }).getAttribute('href')).toBe(
      '/company',
    );
  });

  it('leaves Message enabled for a verified company', async () => {
    renderPanel();
    await waitFor(() => expect(auth.companyAccount).toHaveBeenCalled());
    expect((screen.getByRole('button', { name: 'Message' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(screen.queryByText(/must be verified/i)).toBeNull();
  });
});
