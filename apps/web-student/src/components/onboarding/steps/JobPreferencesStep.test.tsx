import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import JobPreferencesStep from './JobPreferencesStep';
import { emptyOnboardingForm } from '@/lib/onboarding-form';

describe('JobPreferencesStep', () => {
  it('renders DPDP consent label with a valid hyperlink pointing to /dpdp-policy', () => {
    const formData = emptyOnboardingForm();
    const updateField = vi.fn();
    const onBack = vi.fn();
    const onComplete = vi.fn();

    render(
      <JobPreferencesStep
        formData={formData}
        updateField={updateField}
        onBack={onBack}
        onComplete={onComplete}
        saving={false}
        error={null}
      />,
    );

    const hyperlink = screen.getByRole('link', { name: /DPDP Act 2023 consent terms/i });
    expect(hyperlink).toBeTruthy();
    expect(hyperlink.getAttribute('href')).toBe('/dpdp-policy');
    expect(hyperlink.getAttribute('target')).toBe('_blank');
    expect(hyperlink.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
