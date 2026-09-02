'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ResumeParseDraft } from '@smart/contracts';

import ResumeUpload from './steps/ResumeUpload';
import ProfileSetup from './steps/ProfileSetup';
import {
  applyResumeDraft,
  emptyOnboardingForm,
  saveOnboardingDraft,
  type OnboardingProfileForm,
} from '@/lib/onboarding-form';

const STEPS = [
  { id: 'resume' as const, label: 'Resume', minutes: 1 },
  { id: 'profile' as const, label: 'Profile', minutes: 3 },
];

const TRACKS = [
  'Finance',
  'Business Analytics',
  'Software',
  'Data',
  'Product',
  'Consulting',
  'Marketing',
  'Operations',
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<'resume' | 'profile'>('resume');
  const [formSeed, setFormSeed] = useState<OnboardingProfileForm>(emptyOnboardingForm);
  const router = useRouter();

  const handleResumeContinue = (draft: ResumeParseDraft | null) => {
    const next = draft ? applyResumeDraft(emptyOnboardingForm(), draft) : emptyOnboardingForm();
    setFormSeed(next);
    saveOnboardingDraft(next);
    setCurrentStep('profile');
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      <section className="flex w-full lg:w-[46%] flex-col h-full border-r border-white/8 bg-[#0c0c0c]">
        <header className="shrink-0 px-8 pt-8 pb-6">
          <div className="flex items-center gap-3">
            <Image
              src="/img/Logo/white-logo.png"
              alt="SMART"
              width={140}
              height={36}
              className="h-8 w-auto object-contain"
              priority
            />
            <span className="text-xs text-white/35 font-axiforma border-l border-white/10 pl-3">
              Candidate onboarding
            </span>
          </div>

          <nav className="mt-8 flex items-center gap-1" aria-label="Onboarding steps">
            {STEPS.map((step) => {
              const active = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (step.id === 'resume' || currentStep === 'profile') {
                      setCurrentStep(step.id);
                    }
                  }}
                  disabled={step.id === 'profile' && currentStep === 'resume'}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-axiforma transition-colors ${
                    active
                      ? 'bg-white/8 text-white'
                      : 'text-white/40 hover:text-white/70 disabled:hover:text-white/40 disabled:cursor-not-allowed'
                  }`}
                >
                  {step.label}
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/35">
                    <Clock className="w-3 h-3" />
                    {step.minutes} min
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-4 flex gap-2">
            {STEPS.map((step) => (
              <div key={step.id} className="h-0.5 flex-1 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full bg-[#00fad0] transition-[width] duration-300"
                  style={{
                    width: step.id === 'resume' || currentStep === 'profile' ? '100%' : '0%',
                  }}
                />
              </div>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-10">
          {currentStep === 'resume' ? (
            <ResumeUpload onContinue={handleResumeContinue} />
          ) : (
            <ProfileSetup
              initialForm={formSeed}
              onBack={() => setCurrentStep('resume')}
              onComplete={() => router.push('/dashboard')}
            />
          )}
        </div>
      </section>

      <aside className="hidden lg:flex flex-1 flex-col items-center justify-center relative px-16">
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,250,208,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,250,208,0.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 w-full max-w-md">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/35 font-axiforma mb-3">
            Role-specific readiness
          </p>
          <h2 className="font-display text-4xl font-medium tracking-tight text-white leading-[1.15] mb-3">
            Show who is ready — and show the work.
          </h2>
          <p className="text-sm text-white/45 font-axiforma leading-relaxed mb-10">
            Ten specialisation tracks. Five levels, three tiers. Verification status is the same
            everywhere an employer looks.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { value: '5 × 3', label: 'Levels and tiers' },
              { value: '10', label: 'Tracks in V1' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5"
              >
                <p className="font-display text-2xl font-medium text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-white/40 font-axiforma">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
            <p className="text-sm font-display text-white mb-4">Tracks you can certify on</p>
            <div className="flex flex-wrap gap-2">
              {TRACKS.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full border border-white/8 bg-white/[0.03] text-[11px] text-white/65 font-axiforma"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
