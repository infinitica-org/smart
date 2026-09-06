'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import { LightSelect } from '../../ui/LightSelect';
import type { OnboardingProfileForm } from '@/lib/onboarding-form';
import {
  CORE_SKILLS,
  SINGLE_VALUE_NICHE_SKILLS,
  PROFICIENCY_LABELS,
  SELF_DECLARED_PROFICIENCIES,
  COMMON_PROGRAMMING_LANGUAGES,
  COMMON_FRAMEWORKS,
} from '@/lib/skills-catalog';
import { BackButton, ErrorBanner, FieldLabel, PrimaryButton, StepHeading } from '../wizard-ui';

interface SkillsStepProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}

const PROFICIENCY_OPTIONS = SELF_DECLARED_PROFICIENCIES.map((p) => ({
  label: PROFICIENCY_LABELS[p],
  value: p,
}));

function SingleValueSkillRow({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3">
      <span className="text-sm font-medium text-gray-900">{name}</span>
      <LightSelect
        value={value}
        onChange={onChange}
        placeholder="Proficiency"
        className="!w-48"
        options={PROFICIENCY_OPTIONS}
      />
    </div>
  );
}

function MultiItemSkillGroup({
  title,
  helper,
  suggestions,
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  helper: string;
  suggestions: string[];
  items: { id: string; name: string; proficiency: string }[];
  onAdd: () => void;
  onUpdate: (id: string, field: 'name' | 'proficiency', value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <FieldLabel required>{title}</FieldLabel>
      <p className="text-xs text-gray-500 -mt-1 mb-3">{helper}</p>
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2"
            >
              <LightSelect
                value={item.name}
                onChange={(val) => onUpdate(item.id, 'name', val)}
                placeholder="Select or type"
                className="flex-1"
                options={suggestions.map((s) => ({ label: s, value: s }))}
              />
              <LightSelect
                value={item.proficiency}
                onChange={(val) => onUpdate(item.id, 'proficiency', val)}
                placeholder="Proficiency"
                className="!w-40"
                options={PROFICIENCY_OPTIONS}
              />
              <button
                type="button"
                onClick={() => onRemove(item.id)}
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
        onClick={onAdd}
        className="mt-2 text-sm font-medium text-gray-900 hover:underline flex items-center gap-1"
      >
        <Plus className="w-4 h-4" /> Add another
      </button>
    </div>
  );
}

export default function SkillsStep({ formData, updateField, onBack, onContinue }: SkillsStepProps) {
  const [error, setError] = useState<string | null>(null);

  const setCatalogSkill = (code: string, value: string) =>
    updateField('catalogSkills', { ...formData.catalogSkills, [code]: value });

  const addLanguage = () =>
    updateField('codingProficiencies', [
      ...formData.codingProficiencies,
      { id: crypto.randomUUID(), language: '', proficiency: '' },
    ]);
  const updateLanguage = (id: string, field: 'name' | 'proficiency', value: string) =>
    updateField(
      'codingProficiencies',
      formData.codingProficiencies.map((item) =>
        item.id === id ? { ...item, [field === 'name' ? 'language' : 'proficiency']: value } : item,
      ),
    );
  const removeLanguage = (id: string) =>
    updateField(
      'codingProficiencies',
      formData.codingProficiencies.filter((item) => item.id !== id),
    );

  const addFramework = () =>
    updateField('frameworkProficiencies', [
      ...formData.frameworkProficiencies,
      { id: crypto.randomUUID(), framework: '', proficiency: '' },
    ]);
  const updateFramework = (id: string, field: 'name' | 'proficiency', value: string) =>
    updateField(
      'frameworkProficiencies',
      formData.frameworkProficiencies.map((item) =>
        item.id === id
          ? { ...item, [field === 'name' ? 'framework' : 'proficiency']: value }
          : item,
      ),
    );
  const removeFramework = (id: string) =>
    updateField(
      'frameworkProficiencies',
      formData.frameworkProficiencies.filter((item) => item.id !== id),
    );

  const handleContinue = () => {
    setError(null);
    const allSingleValue = [...CORE_SKILLS, ...SINGLE_VALUE_NICHE_SKILLS];
    const missing = allSingleValue.find((skill) => !formData.catalogSkills[skill.code]?.trim());
    if (missing) {
      setError(`Set your proficiency for "${missing.name}".`);
      return;
    }
    if (!formData.codingProficiencies.some((l) => l.language.trim() && l.proficiency.trim())) {
      setError('Add at least one programming language.');
      return;
    }
    if (!formData.frameworkProficiencies.some((f) => f.framework.trim() && f.proficiency.trim())) {
      setError('Add at least one frontend or backend framework.');
      return;
    }
    onContinue();
  };

  return (
    <div>
      <StepHeading
        title="Your skills"
        subtitle="Every skill below is required for the Software Engineering stream. Rate yourself honestly — you'll get to prove it later."
      />

      <AnimatePresence>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</AnimatePresence>

      <div className="flex flex-col gap-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Core Skills</h3>
          <div className="flex flex-col gap-2">
            {CORE_SKILLS.map((skill) => (
              <SingleValueSkillRow
                key={skill.code}
                name={skill.name}
                value={formData.catalogSkills[skill.code] ?? ''}
                onChange={(val) => setCatalogSkill(skill.code, val)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Niche Skills — Software Engineering
          </h3>
          <div className="flex flex-col gap-4">
            {SINGLE_VALUE_NICHE_SKILLS.map((skill) => (
              <SingleValueSkillRow
                key={skill.code}
                name={skill.name}
                value={formData.catalogSkills[skill.code] ?? ''}
                onChange={(val) => setCatalogSkill(skill.code, val)}
              />
            ))}

            <MultiItemSkillGroup
              title="Programming languages"
              helper="Add every language you're comfortable in, with your own proficiency for each."
              suggestions={COMMON_PROGRAMMING_LANGUAGES}
              items={formData.codingProficiencies.map((l) => ({
                id: l.id,
                name: l.language,
                proficiency: l.proficiency,
              }))}
              onAdd={addLanguage}
              onUpdate={updateLanguage}
              onRemove={removeLanguage}
            />

            <MultiItemSkillGroup
              title="Frontend / backend frameworks"
              helper="Add every framework you've built with, with your own proficiency for each."
              suggestions={COMMON_FRAMEWORKS}
              items={formData.frameworkProficiencies.map((f) => ({
                id: f.id,
                name: f.framework,
                proficiency: f.proficiency,
              }))}
              onAdd={addFramework}
              onUpdate={updateFramework}
              onRemove={removeFramework}
            />
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-between">
        <BackButton onClick={onBack} />
        <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}
