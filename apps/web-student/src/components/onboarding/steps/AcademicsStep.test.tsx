import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AcademicsStep from './AcademicsStep';
import { emptyOnboardingForm, type OnboardingProfileForm } from '@/lib/onboarding-form';

describe('AcademicsStep', () => {
  it('shows a read-only confirmation of the name already captured earlier in onboarding', () => {
    const formData: OnboardingProfileForm = {
      ...emptyOnboardingForm(),
      firstName: 'Ada',
      lastName: 'Lovelace',
    };

    render(
      <AcademicsStep
        formData={formData}
        updateField={vi.fn()}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    const confirmation = screen.getByTestId('academics-name-confirmation');
    expect(confirmation.textContent).toContain('Ada Lovelace');
    expect(screen.queryByLabelText(/full name/i)).toBeNull();
  });

  it('does not render a name confirmation when no name has been captured yet', () => {
    render(
      <AcademicsStep
        formData={emptyOnboardingForm()}
        updateField={vi.fn()}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('academics-name-confirmation')).toBeNull();
  });

  it('calls updateField with a merged academicProgram when study program is typed', () => {
    const updateField = vi.fn();
    render(
      <AcademicsStep
        formData={emptyOnboardingForm()}
        updateField={updateField}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId('study-program-input'), {
      target: { value: 'B.Tech Computer Science' },
    });

    expect(updateField).toHaveBeenCalledWith('academicProgram', {
      studyProgram: 'B.Tech Computer Science',
      graduationYear: '',
    });
  });

  it('calls updateField with a merged academicProgram when graduation year is selected', () => {
    const updateField = vi.fn();
    const formData: OnboardingProfileForm = {
      ...emptyOnboardingForm(),
      academicProgram: { studyProgram: 'B.Tech CSE', graduationYear: '' },
    };
    render(
      <AcademicsStep
        formData={formData}
        updateField={updateField}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    const year = new Date().getFullYear().toString();
    fireEvent.change(screen.getByTestId('graduation-year-select'), {
      target: { value: year },
    });

    expect(updateField).toHaveBeenCalledWith('academicProgram', {
      studyProgram: 'B.Tech CSE',
      graduationYear: year,
    });
  });

  it('allows Continue with study program and graduation year left empty', () => {
    const onContinue = vi.fn();
    render(
      <AcademicsStep
        formData={emptyOnboardingForm()}
        updateField={vi.fn()}
        onBack={vi.fn()}
        onContinue={onContinue}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalled();
  });
});
