'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

import { api } from '@/lib/api';
import InterestDomainStep from './steps/InterestDomainStep';
import BasicProfileStep from './steps/BasicProfileStep';
import CompletionSequence from './steps/CompletionSequence';
import {
  applyServerDraft,
  buildCompleteOnboardingRequest,
  buildOnboardingDraftPayload,
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingProfileForm,
} from '@/lib/onboarding-form';
import { markTourAutostart } from '@/lib/tour';
import {
  ProgressDots,
  WIZARD_STEP_META,
  WizardPage,
  stepMotionProps,
  type WizardStepId,
} from './wizard-ui';

type Step = WizardStepId | 'done';

const STEP_ORDER: WizardStepId[] = WIZARD_STEP_META.map((s) => s.id);

function furthestStep(form: OnboardingProfileForm): WizardStepId {
  if (form.firstName.trim() || form.lastName.trim() || form.phoneNumber.trim()) {
    return 'profile';
  }
  if (form.interestDomain) return 'profile';
  return 'domain';
}

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('domain');
  const [formData, setFormData] = useState<OnboardingProfileForm>(loadOnboardingDraft);
  const [saving, setSaving] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    api.users
      .getOnboarding()
      .then((response) => {
        if (cancelled) return;
        if (response.draft) {
          const next = applyServerDraft(formData, response.draft);
          setFormData(next);
          saveOnboardingDraft(next);
          setCurrentStep(furthestStep(next));
        }
      })
      .catch(() => {
        // No persisted draft yet, or the request failed — fall back to the local cache.
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      saveOnboardingDraft(next);
      return next;
    });
  };

  const persistDraft = (form: OnboardingProfileForm) => {
    void api.users.saveOnboarding(buildOnboardingDraftPayload(form)).catch(() => {});
  };

  const advanceFromDomain = () => {
    persistDraft(formData);
    setCurrentStep('profile');
  };

  const handleComplete = async () => {
    setCompleteError(null);
    const payload = buildCompleteOnboardingRequest(formData);
    if ('error' in payload) {
      setCompleteError(payload.error);
      return;
    }
    setSaving(true);
    try {
      await api.users.completeOnboarding(payload);
      clearOnboardingDraft();
      setCurrentStep('done');
    } catch {
      setCompleteError(
        'Could not save your profile to the server. Check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated) {
    return (
      <WizardPage>
        <div className="flex justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
        </div>
      </WizardPage>
    );
  }

  const progressStep: WizardStepId =
    currentStep === 'done'
      ? (STEP_ORDER[STEP_ORDER.length - 1] ?? 'profile')
      : (currentStep as WizardStepId);

  return (
    <WizardPage>
      {currentStep !== 'done' ? (
        <div className="mb-8">
          <ProgressDots current={progressStep} />
        </div>
      ) : null}

      <motion.div key={currentStep} {...stepMotionProps}>
        {currentStep === 'domain' && (
          <InterestDomainStep
            formData={formData}
            updateField={updateField}
            onContinue={advanceFromDomain}
          />
        )}

        {currentStep === 'profile' && (
          <BasicProfileStep
            formData={formData}
            updateField={updateField}
            onBack={() => setCurrentStep('domain')}
            onComplete={() => void handleComplete()}
            saving={saving}
            completeError={completeError}
          />
        )}

        {currentStep === 'done' && (
          <CompletionSequence
            firstName={formData.firstName}
            onFinished={() => {
              markTourAutostart();
              router.push('/dashboard');
            }}
          />
        )}
      </motion.div>
    </WizardPage>
  );
}
