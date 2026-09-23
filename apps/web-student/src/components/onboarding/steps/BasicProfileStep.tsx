'use client';

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { LightSelect } from '../../ui/LightSelect';
import type { OnboardingProfileForm } from '@/lib/onboarding-form';
import {
  BackButton,
  ErrorBanner,
  FieldLabel,
  PrimaryButton,
  StepHeading,
  TextInput,
} from '../wizard-ui';

interface BasicProfileStepProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
  onBack?: () => void;
  isFirstWizardStep?: boolean;
  onContinue: () => void;
}

const GRADUATION_YEARS = Array.from({ length: 10 }, (_, i) =>
  (new Date().getFullYear() + 4 - i).toString(),
);

export default function BasicProfileStep({
  formData,
  updateField,
  onBack,
  isFirstWizardStep = false,
  onContinue,
}: BasicProfileStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const firstNameInvalid = attempted && !formData.firstName.trim();
  const lastNameInvalid = attempted && !formData.lastName.trim();
  const majorInvalid = attempted && !formData.academicProgram.studyProgram.trim();

  const handleContinue = () => {
    setAttempted(true);
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    if (!formData.academicProgram.studyProgram.trim()) {
      setError('Please specify your major / field of study.');
      return;
    }

    if (!formData.academicProgram.graduationYear.trim()) {
      setError('Please select your graduation year.');
      return;
    }

    onContinue();
  };

  return (
    <div data-testid="basic-profile-step">
      <StepHeading
        title="Basic Profile"
        subtitle="Tell us your name, field of study and graduation year."
      />

      <AnimatePresence>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</AnimatePresence>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <FieldLabel required>First Name</FieldLabel>
          <TextInput
            data-testid="first-name-input"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            autoComplete="given-name"
            invalid={firstNameInvalid}
            placeholder="First name (e.g. Satheswaran)"
          />
        </div>

        <div>
          <FieldLabel required>Last Name</FieldLabel>
          <TextInput
            data-testid="last-name-input"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            autoComplete="family-name"
            invalid={lastNameInvalid}
            placeholder="Last name (e.g. V)"
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabel required>Major / Field of Study</FieldLabel>
          <TextInput
            data-testid="major-study-program-input"
            value={formData.academicProgram.studyProgram}
            onChange={(e) =>
              updateField('academicProgram', {
                ...formData.academicProgram,
                studyProgram: e.target.value,
              })
            }
            invalid={majorInvalid}
            placeholder="e.g. B.Tech Computer Science & Engineering"
          />
        </div>

        <div className="md:col-span-2" data-testid="graduation-year-select">
          <FieldLabel required>Graduation Year</FieldLabel>
          <LightSelect
            data-testid="graduation-year-select"
            value={formData.academicProgram.graduationYear}
            onChange={(val) =>
              updateField('academicProgram', {
                ...formData.academicProgram,
                graduationYear: val,
              })
            }
            placeholder="Select graduation year"
            options={GRADUATION_YEARS.map((y) => ({ label: y, value: y }))}
          />
        </div>
      </div>

      <div className={`mt-10 flex ${!isFirstWizardStep ? 'justify-between' : 'justify-end'}`}>
        {!isFirstWizardStep ? <BackButton onClick={onBack} /> : null}
        <PrimaryButton data-testid="profile-continue-btn" onClick={handleContinue}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
