'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import SocialVerification from './SocialVerification';
import RepoPicker from './RepoPicker';
import type { OnboardingProfileForm } from '@/lib/onboarding-form';
import { BackButton, ErrorBanner, PrimaryButton, StepHeading } from '../wizard-ui';

interface SocialStepProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function SocialStep({ formData, updateField, onBack, onContinue }: SocialStepProps) {
  const [error, setError] = useState<string | null>(null);
  const githubConfirmed = Boolean(formData.socialVerification.github?.verified);

  // Land back here from the LinkedIn OAuth redirect (`?linkedinVerified=1|0`)
  // and scrub the query string so a refresh doesn't re-trigger it.
  const [linkedinBanner, setLinkedinBanner] = useState<'ok' | 'failed' | null>(null);
  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get('linkedinVerified');
    if (flag === null) return;
    setLinkedinBanner(flag === '1' ? 'ok' : 'failed');
    window.history.replaceState(null, '', '/onboarding');
  }, []);

  const handleContinue = () => {
    setError(null);
    onContinue();
  };

  return (
    <div>
      <StepHeading
        title="LinkedIn & GitHub"
        subtitle="Connect your LinkedIn or GitHub profiles (optional, but recommended to build trust with employers)."
      />

      <AnimatePresence>
        {linkedinBanner ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mb-5 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              linkedinBanner === 'ok'
                ? 'border-border bg-muted text-foreground'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {linkedinBanner === 'ok'
              ? 'LinkedIn verified successfully.'
              : "Couldn't verify LinkedIn — you can try again or continue without it."}
            <button
              type="button"
              onClick={() => setLinkedinBanner(null)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              Dismiss
            </button>
          </motion.div>
        ) : null}
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      </AnimatePresence>

      <SocialVerification formData={formData} updateField={updateField} />

      <AnimatePresence>
        {githubConfirmed ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6"
          >
            <RepoPicker formData={formData} updateField={updateField} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-10 flex justify-between">
        <BackButton onClick={onBack} />
        <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}
