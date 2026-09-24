import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BasicProfileStep from './BasicProfileStep';
import { emptyOnboardingForm } from '@/lib/onboarding-form';

describe('BasicProfileStep', () => {
  const onContinue = vi.fn();
  const updateField = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders First name, Last name, Major, and Grad Year fields', () => {
    render(
      <BasicProfileStep
        formData={emptyOnboardingForm()}
        updateField={updateField}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByText('Basic Profile')).toBeDefined();
    expect(screen.getByTestId('first-name-input')).toBeDefined();
    expect(screen.getByTestId('last-name-input')).toBeDefined();
    expect(screen.getByTestId('major-study-program-input')).toBeDefined();
    expect(screen.getByTestId('graduation-year-select')).toBeDefined();
  });

  it('validates required fields before allowing continue', async () => {
    render(
      <BasicProfileStep
        formData={emptyOnboardingForm()}
        updateField={updateField}
        onContinue={onContinue}
      />,
    );

    fireEvent.click(screen.getByTestId('profile-continue-btn'));

    await waitFor(() => {
      expect(screen.getByText(/First name and last name are required/i)).toBeDefined();
    });
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('calls onContinue when all fields are valid', async () => {
    const form = {
      ...emptyOnboardingForm(),
      firstName: 'Satheswaran',
      lastName: 'V',
      academicProgram: {
        studyProgram: 'B.Tech Computer Science & Engineering',
        graduationYear: '2026',
      },
    };

    render(<BasicProfileStep formData={form} updateField={updateField} onContinue={onContinue} />);

    fireEvent.click(screen.getByTestId('profile-continue-btn'));

    await waitFor(() => {
      expect(onContinue).toHaveBeenCalled();
    });
  });
});
