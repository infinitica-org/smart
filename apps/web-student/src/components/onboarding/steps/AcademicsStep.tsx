'use client';

import type { OnboardingProfileForm } from '@/lib/onboarding-form';
import { BackButton, FieldLabel, PrimaryButton, StepHeading, TextInput } from '../wizard-ui';

interface AcademicsStepProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}

/** All three fields are optional (progressive profile) — nothing here blocks "Continue". */
export default function AcademicsStep({
  formData,
  updateField,
  onBack,
  onContinue,
}: AcademicsStepProps) {
  const scores = formData.academicScores;
  const updateScores = <K extends keyof OnboardingProfileForm['academicScores']>(
    field: K,
    value: OnboardingProfileForm['academicScores'][K],
  ) => updateField('academicScores', { ...scores, [field]: value });

  return (
    <div>
      <StepHeading
        title="Your academic scores"
        subtitle="Help TPOs match you to the right opportunities — these help narrow down eligibility for companies with academic cutoffs. You can skip and add them later from your profile."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div>
          <FieldLabel>CGPA</FieldLabel>
          <TextInput
            type="number"
            inputMode="decimal"
            min={0}
            max={10}
            step={0.01}
            value={scores.cgpa}
            onChange={(e) => updateScores('cgpa', e.target.value)}
            placeholder="e.g. 8.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">Out of 10</p>
        </div>

        <div>
          <FieldLabel>10th (SSC) %</FieldLabel>
          <TextInput
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.01}
            value={scores.sscPercentage}
            onChange={(e) => updateScores('sscPercentage', e.target.value)}
            placeholder="e.g. 92.4"
          />
          <p className="mt-1 text-xs text-muted-foreground">Out of 100</p>
        </div>

        <div>
          <FieldLabel>12th (HSC) %</FieldLabel>
          <TextInput
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.01}
            value={scores.hscPercentage}
            onChange={(e) => updateScores('hscPercentage', e.target.value)}
            placeholder="e.g. 88.1"
          />
          <p className="mt-1 text-xs text-muted-foreground">Out of 100</p>
        </div>
      </div>

      <div className="flex justify-between">
        <BackButton onClick={onBack} />
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}
