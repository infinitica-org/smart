'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ResumeParseDraft } from '@smart/contracts';

import { api } from '@/lib/api';
import ResumeUpload from './steps/ResumeUpload';
import ProfileSetup from './steps/ProfileSetup';
import {
  applyResumeDraft,
  applyServerDraft,
  buildOnboardingDraftPayload,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingProfileForm,
} from '@/lib/onboarding-form';

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<'resume' | 'profile'>('resume');
  const [formSeed, setFormSeed] = useState<OnboardingProfileForm>(loadOnboardingDraft);
  const router = useRouter();

  // Hydrate from whatever the server already has (a previous session, a
  // different browser). The local draft above is only a same-machine cache.
  useEffect(() => {
    let cancelled = false;
    api.users
      .getOnboarding()
      .then((response) => {
        if (cancelled || !response.draft) return;
        setFormSeed((prev) => {
          const next = applyServerDraft(prev, response.draft);
          saveOnboardingDraft(next);
          return next;
        });
        if (response.draft.firstName || response.draft.lastName) {
          setCurrentStep('profile');
        }
      })
      .catch(() => {
        // No persisted draft yet, or the request failed — fall back to the
        // local cache already loaded into formSeed.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleResumeContinue = (draft: ResumeParseDraft | null) => {
    const next = draft ? applyResumeDraft(formSeed, draft) : formSeed;
    setFormSeed(next);
    saveOnboardingDraft(next);
    void api.users.saveOnboarding(buildOnboardingDraftPayload(next)).catch(() => {});
    setCurrentStep('profile');
  };

  return (
    <div className="min-h-[100dvh] w-full bg-zinc-950 text-white font-sans flex flex-col items-center justify-start relative overflow-y-auto px-4 py-8 sm:py-12">
      {/* Subtle ambient background glow */}
      <div
        className="fixed inset-0 opacity-[0.2] pointer-events-none z-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Top Header Logo */}
      <header className="relative z-10 w-full max-w-2xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Image
            src="/img/Logo/white-logo.png"
            alt="SMART"
            width={130}
            height={32}
            className="h-7 w-auto object-contain"
            priority
          />
          <span className="text-xs text-zinc-500 font-axiforma border-l border-zinc-800 pl-3">
            Candidate onboarding
          </span>
        </div>
      </header>

      {/* Main Wizard Form Container (Clean format without outer card box border) */}
      <main className="relative z-10 w-full max-w-2xl flex flex-col">
        {currentStep === 'resume' ? (
          <ResumeUpload onContinue={handleResumeContinue} />
        ) : (
          <ProfileSetup
            initialForm={formSeed}
            onBack={() => setCurrentStep('resume')}
            onComplete={() => router.push('/dashboard')}
          />
        )}
      </main>
    </div>
  );
}
