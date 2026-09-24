import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PhoneVerificationStep from './PhoneVerificationStep';
import { emptyOnboardingForm } from '@/lib/onboarding-form';

describe('PhoneVerificationStep', () => {
  const onContinue = vi.fn();
  const updateField = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders phone number input, country code, 6-digit OTP code, and DPDP checkbox', () => {
    render(
      <PhoneVerificationStep
        formData={emptyOnboardingForm()}
        updateField={updateField}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByText('Verify your mobile number')).toBeDefined();
    expect(screen.getByTestId('phone-number-input')).toBeDefined();
    expect(screen.getByTestId('otp-code-input')).toBeDefined();
    expect(screen.getByTestId('dpdp-consent-checkbox')).toBeDefined();
    expect(screen.getByTestId('verify-phone-submit')).toBeDefined();
  });

  it('shows error when phone is invalid or DPDP is not checked', async () => {
    const emptyForm = { ...emptyOnboardingForm(), phoneNumber: '' };
    render(
      <PhoneVerificationStep
        formData={emptyForm}
        updateField={updateField}
        onContinue={onContinue}
      />,
    );

    fireEvent.change(screen.getByTestId('phone-number-input'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('verify-phone-submit'));

    await waitFor(() => {
      expect(screen.getByText(/Mobile number must contain|agree to the DPDP/i)).toBeDefined();
    });
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('sends OTP code and enables resend cooldown', async () => {
    const form = {
      ...emptyOnboardingForm(),
      phoneNumber: '9876543210',
    };

    render(
      <PhoneVerificationStep formData={form} updateField={updateField} onContinue={onContinue} />,
    );

    fireEvent.click(screen.getByTestId('resend-otp-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Resend code in/i)).toBeDefined();
    });
  });

  it('submits successfully when phone, OTP, and DPDP consent are valid', async () => {
    const form = {
      ...emptyOnboardingForm(),
      phoneNumber: '9876543210',
      dpdpConsent: true,
    };

    render(
      <PhoneVerificationStep formData={form} updateField={updateField} onContinue={onContinue} />,
    );

    fireEvent.change(screen.getByTestId('otp-code-input'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('verify-phone-submit'));

    await waitFor(() => {
      expect(onContinue).toHaveBeenCalled();
    });
  });
});
