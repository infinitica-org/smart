'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import { LightSelect } from '../../ui/LightSelect';
import {
  LANGUAGE_OPTIONS,
  FLUENCY_OPTIONS,
  type OnboardingProfileForm,
} from '@/lib/onboarding-form';
import { BackButton, ErrorBanner, PrimaryButton, StepHeading } from '../wizard-ui';

interface LanguagesStepProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function LanguagesStep({
  formData,
  updateField,
  onBack,
  onContinue,
}: LanguagesStepProps) {
  const [error, setError] = useState<string | null>(null);

  const addLanguage = () =>
    updateField('languages', [
      ...formData.languages,
      { id: crypto.randomUUID(), language: '', proficiency: '' },
    ]);
  const updateLanguage = (id: string, field: string, value: string) =>
    updateField(
      'languages',
      formData.languages.map((lang) => (lang.id === id ? { ...lang, [field]: value } : lang)),
    );
  const removeLanguage = (id: string) =>
    updateField(
      'languages',
      formData.languages.filter((lang) => lang.id !== id),
    );

  const handleContinue = () => {
    if (!formData.languages.some((l) => l.language.trim() && l.proficiency.trim())) {
      setError('Add at least one language.');
      return;
    }
    setError(null);
    onContinue();
  };

  return (
    <div>
      <StepHeading
        title="Languages you know"
        subtitle="Add every language you speak, with your fluency level."
      />

      <AnimatePresence>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</AnimatePresence>

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {formData.languages.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-3 items-center rounded-xl border border-gray-200 bg-gray-50 p-3"
            >
              <LightSelect
                value={item.language}
                onChange={(val) => updateLanguage(item.id, 'language', val)}
                placeholder="Select language"
                className="flex-1"
                options={LANGUAGE_OPTIONS.map((lang) => ({ label: lang, value: lang }))}
              />
              <LightSelect
                value={item.proficiency}
                onChange={(val) => updateLanguage(item.id, 'proficiency', val)}
                placeholder="Fluency"
                className="!w-48"
                options={FLUENCY_OPTIONS.map((f) => ({ label: f, value: f }))}
              />
              <button
                type="button"
                onClick={() => removeLanguage(item.id)}
                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={addLanguage}
        className="mt-3 text-sm font-medium text-gray-900 hover:underline flex items-center gap-1"
      >
        <Plus className="w-4 h-4" /> Add a language
      </button>

      <div className="mt-10 flex justify-between">
        <BackButton onClick={onBack} />
        <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}
