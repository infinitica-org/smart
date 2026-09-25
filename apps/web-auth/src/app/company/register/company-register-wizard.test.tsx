import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { COMPANY_SIZE_BANDS, COMPANY_WORK_EMAIL_REQUIRED_MESSAGE } from '@smart/contracts';
import { SmartApiError } from '@smart/api-client';

const getSession = vi.fn();
const updateDraft = vi.fn();
const sendVerification = vi.fn();
const startOnboarding = vi.fn();

vi.mock('../../../lib/api', () => ({
  api: {
    public: {
      startCompanyOnboarding: (...a: unknown[]) => startOnboarding(...a),
      getCompanyOnboardingSession: (...a: unknown[]) => getSession(...a),
      updateCompanyOnboardingDraft: (...a: unknown[]) => updateDraft(...a),
      sendCompanyOnboardingEmailVerification: (...a: unknown[]) => sendVerification(...a),
    },
  },
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { CompanyRegisterWizard } from './company-register-wizard';
import { COMPANY_ONBOARDING_SESSION_KEY } from '../../../lib/company-onboarding-session';

async function openDetailsStep() {
  window.localStorage.setItem(COMPANY_ONBOARDING_SESSION_KEY, 'token');
  window.sessionStorage.setItem(COMPANY_ONBOARDING_SESSION_KEY, 'token');
  getSession.mockResolvedValue({
    onboardingStatus: 'DRAFT',
    representative: { fullName: 'Ada', workEmail: 'ada@acme.example' },
    profile: {},
  });
  render(<CompanyRegisterWizard />);
  return screen.findByLabelText('Phone number');
}

beforeEach(() => {
  getSession.mockReset();
  updateDraft.mockReset();
  sendVerification.mockReset();
  startOnboarding.mockReset();
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('CompanyRegisterWizard details step', () => {
  it('offers company size as a dropdown of the predefined bands', async () => {
    await openDetailsStep();
    const select = screen.getByLabelText('Number of employees') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(Array.from(select.options).map((o) => o.value)).toEqual([...COMPANY_SIZE_BANDS]);
  });

  it('strips non-digits from the phone number as the user types', async () => {
    const phone = (await openDetailsStep()) as HTMLInputElement;
    fireEvent.change(phone, { target: { value: '+91 98-76abc' } });
    expect(phone.value).toBe('+919876');
  });

  it('shows which fields failed instead of a generic validation message', async () => {
    const phone = await openDetailsStep();
    updateDraft.mockRejectedValue(
      new SmartApiError({
        statusCode: 422,
        error: 'validation_failed',
        message: 'Request failed validation.',
        details: [{ path: 'representative.phone', message: 'Enter a valid phone number.' }],
      }),
    );
    fireEvent.change(phone, { target: { value: '9876543210' } });
    const form = phone.closest('form');
    if (!form) throw new Error('form missing');
    fireEvent.submit(form);
    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert.textContent).toContain('Phone: Enter a valid phone number.'));
    expect(alert.textContent).not.toBe('Request failed validation.');
  });
});

describe('CompanyRegisterWizard after changes were requested', () => {
  it('opens the application from the emailed link and shows what to fix', async () => {
    window.history.replaceState(null, '', '/company/register?session=emailed-token');
    getSession.mockResolvedValue({
      onboardingStatus: 'RESUBMISSION_ALLOWED',
      verificationReason: 'The GST certificate is unreadable.',
      representative: { fullName: 'Ada', workEmail: 'ada@acme.example' },
      profile: {},
      documents: [
        {
          documentId: 'd1',
          fileName: 'gst.pdf',
          reviewStatus: 'REJECTED',
          reviewReason: 'Blurry.',
        },
        { documentId: 'd2', fileName: 'coi.pdf', reviewStatus: 'ACCEPTED', reviewReason: null },
      ],
    });

    render(<CompanyRegisterWizard />);

    expect(await screen.findByText('The GST certificate is unreadable.')).toBeTruthy();
    expect(screen.getByText('gst.pdf: Blurry.')).toBeTruthy();
    expect(screen.queryByText(/coi\.pdf/)).toBeNull();
    expect(getSession).toHaveBeenCalledWith('emailed-token');
    // The token doesn't linger in the address bar.
    expect(window.location.search).toBe('');
  });
});

describe('CompanyRegisterWizard start step', () => {
  it('rejects a personal email address before calling the API', async () => {
    render(<CompanyRegisterWizard />);
    const email = await screen.findByLabelText('Work email');
    fireEvent.change(email, { target: { value: 'ada@gmail.com' } });
    expect(screen.getByText(COMPANY_WORK_EMAIL_REQUIRED_MESSAGE)).toBeTruthy();

    const form = email.closest('form');
    if (!form) throw new Error('form missing');
    fireEvent.submit(form);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(COMPANY_WORK_EMAIL_REQUIRED_MESSAGE);
    expect(startOnboarding).not.toHaveBeenCalled();
  });
});
