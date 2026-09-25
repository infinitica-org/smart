import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SmartApiError } from '@smart/api-client';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplyJobDialog } from './ApplyJobDialog';

const studentApplications = vi.hoisted(() => ({ preview: vi.fn(), apply: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { studentApplications } }));

const JOB = '00000000-0000-4000-8000-000000000001';

const preview = (over: Record<string, unknown> = {}) => ({
  jobId: JOB,
  roleTitle: 'Backend Engineer',
  companyName: 'Acme Robotics',
  profile: {
    fullName: 'Aarav Sharma',
    trackName: 'Full-stack Development',
    skills: [{ skillCode: 'NODE', skillName: 'Node.js', proficiency: 'ADVANCED' }],
    projects: [{}, {}],
    workExperience: [{}],
    education: [],
  },
  fit: { band: 'STRONG', matchPercent: 91, topReason: 'x' },
  alreadyApplied: false,
  ...over,
});

const applied = (over: Record<string, unknown> = {}) => ({
  applicationId: '99999999-9999-4999-8999-999999999999',
  referenceNumber: 'APP-99999999',
  jobId: JOB,
  roleTitle: 'Backend Engineer',
  companyName: 'Acme Robotics',
  appliedAt: '2026-09-25T10:00:00.000Z',
  status: 'APPLIED',
  statusLabel: 'Submitted',
  alreadyApplied: false,
  ...over,
});

function renderDialog() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ApplyJobDialog open jobId={JOB} onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
}

describe('ApplyJobDialog (Th6-387/388/389)', () => {
  beforeEach(() => Object.values(studentApplications).forEach((fn) => fn.mockReset()));
  afterEach(cleanup);

  it('step 1 shows what the employer will see, and cannot continue until it is confirmed', async () => {
    studentApplications.preview.mockResolvedValue(preview());
    renderDialog();
    expect(screen.getByText('Preparing what the employer will see…')).toBeTruthy();
    const section = await screen.findByLabelText('What the employer will see');
    expect(section.textContent).toContain('Aarav Sharma');
    expect(section.textContent).toContain('Node.js · Advanced');
    expect(section.textContent).toContain('Strong fit · 91% match');
    const next = screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/I've reviewed what this employer will see/));
    expect(next.disabled).toBe(false);
  });

  it('step 2 sends reviewedPreview=true, the trimmed note and an Idempotency-Key, then confirms', async () => {
    studentApplications.preview.mockResolvedValue(preview());
    studentApplications.apply.mockResolvedValue(applied());
    renderDialog();
    fireEvent.click(await screen.findByLabelText(/I've reviewed/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Cover note'), {
      target: { value: '  Excited to apply  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => expect(studentApplications.apply).toHaveBeenCalledTimes(1));
    const [jobId, body, key] = studentApplications.apply.mock.calls[0] ?? [];
    expect(jobId).toBe(JOB);
    expect(body).toEqual({ reviewedPreview: true, coverNote: 'Excited to apply' });
    expect(typeof key).toBe('string');

    expect(await screen.findByText('Your application is in.')).toBeTruthy();
    expect(screen.getByTestId('reference-number').textContent).toBe('APP-99999999');
    expect(screen.getByText('Acme Robotics')).toBeTruthy();
    expect(screen.getByText('What happens next')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View my application' }).getAttribute('href')).toBe(
      '/applications',
    );
  });

  it('omits the note when empty and says so when the student had already applied', async () => {
    studentApplications.preview.mockResolvedValue(preview());
    studentApplications.apply.mockResolvedValue(applied({ alreadyApplied: true }));
    renderDialog();
    fireEvent.click(await screen.findByLabelText(/I've reviewed/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    await waitFor(() => expect(studentApplications.apply).toHaveBeenCalled());
    expect(studentApplications.apply.mock.calls[0]?.[1]).toEqual({ reviewedPreview: true });
    expect(await screen.findByText('You already applied to this job.')).toBeTruthy();
  });

  it('shows the server error and reuses the same key when the same submission is retried', async () => {
    studentApplications.preview.mockResolvedValue(preview());
    studentApplications.apply
      .mockRejectedValueOnce(
        new SmartApiError({
          error: 'job_closed',
          message: 'This job is no longer accepting applications.',
          statusCode: 409,
        } as never),
      )
      .mockResolvedValueOnce(applied());
    renderDialog();
    fireEvent.click(await screen.findByLabelText(/I've reviewed/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByText('This job is no longer accepting applications.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    await waitFor(() => expect(studentApplications.apply).toHaveBeenCalledTimes(2));
    expect(studentApplications.apply.mock.calls[1]?.[2]).toBe(
      studentApplications.apply.mock.calls[0]?.[2],
    );
  });

  it('shows a 422 field message from the server', async () => {
    studentApplications.preview.mockResolvedValue(preview());
    studentApplications.apply.mockRejectedValue(
      new SmartApiError({
        error: 'validation_failed',
        message: 'Request failed validation.',
        statusCode: 422,
        details: [{ path: 'coverNote', message: 'Too long.' }],
      } as never),
    );
    renderDialog();
    fireEvent.click(await screen.findByLabelText(/I've reviewed/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByText('Too long.')).toBeTruthy();
  });

  it('shows an error state that retries, and blocks re-applying to a job already applied to', async () => {
    studentApplications.preview.mockRejectedValueOnce(new Error('down'));
    renderDialog();
    expect(await screen.findByText('Could not prepare your application')).toBeTruthy();
    studentApplications.preview.mockResolvedValue(preview({ alreadyApplied: true }));
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    fireEvent.click(await screen.findByLabelText(/I've reviewed/));
    expect(
      (screen.getByRole('button', { name: 'Already applied' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('says the job is closed when the preview is refused with 409', async () => {
    studentApplications.preview.mockRejectedValue(
      new SmartApiError({ error: 'job_closed', message: 'closed', statusCode: 409 } as never),
    );
    renderDialog();
    expect(await screen.findByText('This job is no longer accepting applications.')).toBeTruthy();
  });
});
