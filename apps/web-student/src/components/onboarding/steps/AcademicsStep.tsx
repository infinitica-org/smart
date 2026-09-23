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

const CURRENT_YEAR = new Date().getFullYear();
const GRADUATION_YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR + i);

/** All fields here are optional (progressive profile) — nothing blocks "Continue". */
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

  const program = formData.academicProgram;
  const updateProgram = <K extends keyof OnboardingProfileForm['academicProgram']>(
    field: K,
    value: OnboardingProfileForm['academicProgram'][K],
  ) => updateField('academicProgram', { ...program, [field]: value });

  const fullName = `${formData.firstName} ${formData.lastName}`.trim();

  return (
    <div>
      <StepHeading
        title="Complete your university details"
        subtitle="Help TPOs match you to the right opportunities — these help narrow down eligibility for companies with academic cutoffs. You can skip and add them later from your profile."
      />

      {fullName ? (
        <p data-testid="academics-name-confirmation" className="mb-6 text-sm text-muted-foreground">
          Full name: <span className="font-medium text-foreground">{fullName}</span>
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <FieldLabel>Study program</FieldLabel>
          <TextInput
            data-testid="study-program-input"
            value={program.studyProgram}
            onChange={(e) => updateProgram('studyProgram', e.target.value)}
            placeholder="e.g. B.Tech Computer Science"
          />
        </div>

        <div>
          <FieldLabel>Graduation year</FieldLabel>
          <select
            data-testid="graduation-year-select"
            value={program.graduationYear}
            onChange={(e) => updateProgram('graduationYear', e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-foreground dark:border-zinc-800 dark:bg-zinc-900"
          >
            <option value="">Select year</option>
            {GRADUATION_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

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
