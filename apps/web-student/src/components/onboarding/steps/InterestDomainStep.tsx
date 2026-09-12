'use client';

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Briefcase, Code2, Landmark, Sparkles } from 'lucide-react';
import { INTEREST_DOMAINS, INTEREST_DOMAIN_LABELS, type InterestDomain } from '@smart/contracts';
import type { OnboardingProfileForm } from '@/lib/onboarding-form';
import { ErrorBanner, PrimaryButton, StepHeading } from '../wizard-ui';

const DOMAIN_ICONS: Record<InterestDomain, typeof Code2> = {
  CS_IT: Code2,
  BUSINESS_MANAGEMENT: Briefcase,
  FINANCE: Landmark,
  OTHER: Sparkles,
};

interface InterestDomainStepProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
  onContinue: () => void;
}

export default function InterestDomainStep({
  formData,
  updateField,
  onContinue,
}: InterestDomainStepProps) {
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!formData.interestDomain) {
      setError('Please select an area of interest.');
      return;
    }
    setError(null);
    onContinue();
  };

  return (
    <div>
      <StepHeading
        title="Welcome to SMART"
        subtitle="What area are you interested in? This helps us personalize your experience — you are not picking a career role yet."
      />

      <AnimatePresence>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</AnimatePresence>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {INTEREST_DOMAINS.map((domain) => {
          const Icon = DOMAIN_ICONS[domain];
          const selected = formData.interestDomain === domain;
          return (
            <button
              key={domain}
              type="button"
              data-testid={`interest-domain-${domain}`}
              onClick={() => updateField('interestDomain', domain)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                selected
                  ? 'border-[#00fad0] bg-[#00fad0]/10 shadow-lg shadow-[#00fad0]/5'
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950/80">
                <Icon className={`h-5 w-5 ${selected ? 'text-[#00fad0]' : 'text-zinc-400'}`} />
              </div>
              <p className="text-sm font-semibold text-white">{INTEREST_DOMAIN_LABELS[domain]}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-10 flex justify-end">
        <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}
