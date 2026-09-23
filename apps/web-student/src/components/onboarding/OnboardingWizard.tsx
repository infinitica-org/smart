'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { api } from '@/lib/api';
import PhoneVerificationStep from './steps/PhoneVerificationStep';
import ConnectUniversityStep from './steps/ConnectUniversityStep';
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
import { DEFAULT_CANDIDATE_STREAM } from '@/lib/candidate-streams';
import { markTourAutostart } from '@/lib/tour';
import {
  ErrorBanner,
  ProgressDots,
  WIZARD_STEP_META,
  WizardPage,
  stepMotionProps,
  type WizardStepId,
} from './wizard-ui';

type Step = WizardStepId | 'done';

const STEP_ORDER: WizardStepId[] = WIZARD_STEP_META.map((s) => s.id);

function nextStepAfter(step: WizardStepId): Step {
  const idx = STEP_ORDER.indexOf(step);
  return (STEP_ORDER[idx + 1] ?? 'done') as Step;
}

function previousStepBefore(step: WizardStepId): WizardStepId | null {
  const idx = STEP_ORDER.indexOf(step);
  return STEP_ORDER[idx - 1] ?? null;
}

const VALID_STEP_IDS = new Set<string>(STEP_ORDER);

function furthestStep(form: OnboardingProfileForm): WizardStepId {
  if (form.onboardingStep && VALID_STEP_IDS.has(form.onboardingStep)) {
    return form.onboardingStep as WizardStepId;
  }
  if (form.firstName.trim() || form.academicProgram.studyProgram.trim()) return 'profile';
  if (form.phoneNumber.trim() && form.dpdpConsent) return 'school';
  return 'phone';
}

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('phone');
  const [formData, setFormData] = useState<OnboardingProfileForm>(loadOnboardingDraft);
  const [_saving, setSaving] = useState(false);
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
          const withPhoto = response.profilePhotoUrl
            ? { ...next, profilePhotoUrl: response.profilePhotoUrl }
            : next;
          setFormData(withPhoto);
          saveOnboardingDraft(withPhoto);
          setCurrentStep(furthestStep(withPhoto));
        } else if (response.profilePhotoUrl) {
          setFormData((prev) => {
            const withPhoto = { ...prev, profilePhotoUrl: response.profilePhotoUrl ?? '' };
            saveOnboardingDraft(withPhoto);
            return withPhoto;
          });
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

  const advanceFrom = (step: WizardStepId) => {
    const next = nextStepAfter(step);
    const updated = next !== 'done' ? { ...formData, onboardingStep: next } : formData;
    if (next !== 'done') {
      setFormData(updated);
      saveOnboardingDraft(updated);
    }
    persistDraft(updated);
    setCurrentStep(next);
  };

  const goBackTo = (step: WizardStepId) => {
    const prev = previousStepBefore(step);
    if (prev) setCurrentStep(prev);
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
      await api.auth.enrollTrack({ trackCode: DEFAULT_CANDIDATE_STREAM.trackCode });
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
        <div className="flex justify-center py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100/90 dark:bg-zinc-800/80">
            <div className="h-10 w-10 rounded-full border-[2.5px] border-zinc-200/80 dark:border-zinc-700 border-t-black dark:border-t-white animate-spin" />
          </div>
        </div>
      </WizardPage>
    );
  }

  return (
    <WizardPage>
      {currentStep !== 'done' ? (
        <div className="mb-3 sm:mb-4">
          <ProgressDots current={currentStep} />
        </div>
      ) : null}

      {completeError ? (
        <div className="mb-4">
          <ErrorBanner>{completeError}</ErrorBanner>
        </div>
      ) : null}

      <motion.div key={currentStep} {...stepMotionProps}>
        {currentStep === 'phone' && (
          <PhoneVerificationStep
            formData={formData}
            updateField={updateField}
            onContinue={() => advanceFrom('phone')}
          />
        )}

        {currentStep === 'school' && (
          <ConnectUniversityStep onContinue={() => advanceFrom('school')} />
        )}

        {currentStep === 'profile' && (
          <BasicProfileStep
            formData={formData}
            updateField={updateField}
            onBack={() => goBackTo('profile')}
            onContinue={() => void handleComplete()}
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
