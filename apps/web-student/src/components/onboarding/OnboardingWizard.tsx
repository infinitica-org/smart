'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import type { ResumeParseDraft } from '@smart/contracts';

import { api } from '@/lib/api';
import ResumeUpload from './steps/ResumeUpload';
import BasicProfileStep from './steps/BasicProfileStep';
import StreamStep from './steps/StreamStep';
import SkillsStep from './steps/SkillsStep';
import LanguagesStep from './steps/LanguagesStep';
import SocialStep from './steps/SocialStep';
import JobPreferencesStep from './steps/JobPreferencesStep';
import UsernameStep from './steps/UsernameStep';
import DoneStep from './steps/DoneStep';
import {
  applyResumeDraft,
  applyServerDraft,
  buildCompleteOnboardingRequest,
  buildOnboardingDraftPayload,
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingProfileForm,
} from '@/lib/onboarding-form';
import {
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

/**
 * Infers the furthest step the candidate already reached, from whatever data
 * is already on the form — there is no server-side step-index column, so
 * this mirrors (and extends) the single `firstName` heuristic the old wizard used.
 */
function furthestStep(form: OnboardingProfileForm): WizardStepId {
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('linkedinVerified') !== null
  ) {
    return 'social';
  }
  const hasPreferences = Boolean(form.jobPreferences.expectedCtcLakhs.trim());
  if (hasPreferences) return 'preferences';
  const hasSocial = Boolean(form.socialVerification.linkedin?.verified || form.githubUrl.trim());
  if (hasSocial) return 'social';
  if (form.languages.some((l) => l.language.trim())) return 'languages';
  const hasSkills =
    Object.keys(form.catalogSkills).length > 0 ||
    form.codingProficiencies.length > 0 ||
    form.frameworkProficiencies.length > 0;
  if (hasSkills) return 'skills';
  if (form.firstName.trim() || form.lastName.trim()) return 'profile';
  return 'resume';
}

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('resume');
  const [formData, setFormData] = useState<OnboardingProfileForm>(loadOnboardingDraft);
  const [saving, setSaving] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  // Blocks step navigation until the one-time server-draft hydration below
  // finishes — otherwise a slow response could land after the candidate has
  // already clicked forward and silently snap them back a step.
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

  const handleResumeContinue = (draft: ResumeParseDraft | null) => {
    const next = draft ? applyResumeDraft(formData, draft) : formData;
    setFormData(next);
    saveOnboardingDraft(next);
    persistDraft(next);
    setCurrentStep('profile');
  };

  const advanceFrom = (step: WizardStepId) => {
    persistDraft(formData);
    setCurrentStep(nextStepAfter(step));
  };

  const goBackTo = (step: WizardStepId) => {
    const prev = previousStepBefore(step);
    setCurrentStep(prev ?? 'resume');
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
      setCurrentStep('username');
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

  return (
    <WizardPage>
      {currentStep !== 'done' ? (
        <div className="mb-8">
          <ProgressDots current={currentStep} />
        </div>
      ) : null}

      <motion.div key={currentStep} {...stepMotionProps}>
        {currentStep === 'resume' && <ResumeUpload onContinue={handleResumeContinue} />}

        {currentStep === 'profile' && (
          <BasicProfileStep
            formData={formData}
            updateField={updateField}
            onBack={() => setCurrentStep('resume')}
            onContinue={() => advanceFrom('profile')}
          />
        )}

        {currentStep === 'stream' && (
          <StreamStep onBack={() => goBackTo('stream')} onContinue={() => advanceFrom('stream')} />
        )}

        {currentStep === 'skills' && (
          <SkillsStep
            formData={formData}
            updateField={updateField}
            onBack={() => goBackTo('skills')}
            onContinue={() => advanceFrom('skills')}
          />
        )}

        {currentStep === 'languages' && (
          <LanguagesStep
            formData={formData}
            updateField={updateField}
            onBack={() => goBackTo('languages')}
            onContinue={() => advanceFrom('languages')}
          />
        )}

        {currentStep === 'social' && (
          <SocialStep
            formData={formData}
            updateField={updateField}
            onBack={() => goBackTo('social')}
            onContinue={() => advanceFrom('social')}
          />
        )}

        {currentStep === 'preferences' && (
          <JobPreferencesStep
            formData={formData}
            updateField={updateField}
            onBack={() => goBackTo('preferences')}
            onComplete={() => void handleComplete()}
            saving={saving}
            error={completeError}
          />
        )}

        {currentStep === 'username' && <UsernameStep onContinue={() => setCurrentStep('done')} />}

        {currentStep === 'done' && <DoneStep onGoToDashboard={() => router.push('/dashboard')} />}
      </motion.div>
    </WizardPage>
  );
}
