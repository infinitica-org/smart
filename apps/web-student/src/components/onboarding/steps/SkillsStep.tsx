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
  CONTROLLED_PROGRAMMING_LANGUAGES,
  FRONTEND_FRAMEWORKS,
  BACKEND_FRAMEWORKS,
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
  label: PROFICIENCY_LABELS[p] ?? p,
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
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <span className="text-sm font-medium text-zinc-100">{name}</span>
      <LightSelect
        value={value}
        onChange={onChange}
        placeholder="Proficiency"
        className="!w-48 shrink-0"
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
  required = false,
}: {
  title: string;
  helper: string;
  suggestions: string[];
  items: { id: string; name: string; proficiency: string }[];
  onAdd: () => void;
  onUpdate: (id: string, field: 'name' | 'proficiency', value: string) => void;
  onRemove: (id: string) => void;
  required?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <FieldLabel required={required}>{title}</FieldLabel>
      <p className="text-xs text-zinc-400 -mt-1 mb-3">{helper}</p>
      <div className="flex flex-col gap-2.5">
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
                placeholder="Select item"
                className="flex-1"
                options={suggestions.map((s) => ({ label: s, value: s }))}
              />
              <LightSelect
                value={item.proficiency}
                onChange={(val) => onUpdate(item.id, 'proficiency', val)}
                placeholder="Proficiency"
                className="!w-40 shrink-0"
                options={PROFICIENCY_OPTIONS}
              />
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="p-2 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
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
        className="mt-3 text-xs font-semibold text-[#00fad0] hover:text-[#7dffe6] hover:underline flex items-center gap-1 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add entry
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

  const addFrontend = () =>
    updateField('frontendFrameworks', [
      ...formData.frontendFrameworks,
      { id: crypto.randomUUID(), framework: '', proficiency: '' },
    ]);
  const updateFrontend = (id: string, field: 'name' | 'proficiency', value: string) =>
    updateField(
      'frontendFrameworks',
      formData.frontendFrameworks.map((item) =>
        item.id === id
          ? { ...item, [field === 'name' ? 'framework' : 'proficiency']: value }
          : item,
      ),
    );
  const removeFrontend = (id: string) =>
    updateField(
      'frontendFrameworks',
      formData.frontendFrameworks.filter((item) => item.id !== id),
    );

  const addBackend = () =>
    updateField('backendFrameworks', [
      ...formData.backendFrameworks,
      { id: crypto.randomUUID(), framework: '', proficiency: '' },
    ]);
  const updateBackend = (id: string, field: 'name' | 'proficiency', value: string) =>
    updateField(
      'backendFrameworks',
      formData.backendFrameworks.map((item) =>
        item.id === id
          ? { ...item, [field === 'name' ? 'framework' : 'proficiency']: value }
          : item,
      ),
    );
  const removeBackend = (id: string) =>
    updateField(
      'backendFrameworks',
      formData.backendFrameworks.filter((item) => item.id !== id),
    );

  const handleContinue = () => {
    setError(null);
    const allSingleValue = [...CORE_SKILLS, ...SINGLE_VALUE_NICHE_SKILLS];
    const missing = allSingleValue.find((skill) => !formData.catalogSkills[skill.code]?.trim());
    if (missing) {
      setError(`Set your proficiency level for "${missing.name}".`);
      return;
    }

    const validLangs = formData.codingProficiencies.filter(
      (l) => l.language.trim() && l.proficiency.trim(),
    );
    if (validLangs.length === 0) {
      setError('Please select at least one programming language with a proficiency level.');
      return;
    }

    const validFrontend = formData.frontendFrameworks.filter(
      (f) => f.framework.trim() && f.proficiency.trim(),
    );
    if (validFrontend.length === 0) {
      setError('Please select at least one Frontend Framework.');
      return;
    }

    const validBackend = formData.backendFrameworks.filter(
      (f) => f.framework.trim() && f.proficiency.trim(),
    );
    if (validBackend.length === 0) {
      setError('Please select at least one Backend Framework.');
      return;
    }

    onContinue();
  };

  return (
    <div>
      <StepHeading
        title="Your skills"
        subtitle="Rate your proficiency across programming languages, frontend, backend frameworks, and core skills."
      />

      <AnimatePresence>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</AnimatePresence>

      <div className="flex flex-col gap-8">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#00fad0] mb-3">
            Core Skills
          </h3>
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#00fad0] mb-3">
            Technical Proficiencies
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
              title="Programming Languages"
              helper="Select at least one programming language and set your proficiency."
              suggestions={CONTROLLED_PROGRAMMING_LANGUAGES}
              items={formData.codingProficiencies.map((l) => ({
                id: l.id,
                name: l.language,
                proficiency: l.proficiency,
              }))}
              onAdd={addLanguage}
              onUpdate={updateLanguage}
              onRemove={removeLanguage}
              required
            />

            <MultiItemSkillGroup
              title="Frontend Frameworks"
              helper="Select at least one frontend framework and set your proficiency."
              suggestions={FRONTEND_FRAMEWORKS}
              items={formData.frontendFrameworks.map((f) => ({
                id: f.id,
                name: f.framework,
                proficiency: f.proficiency,
              }))}
              onAdd={addFrontend}
              onUpdate={updateFrontend}
              onRemove={removeFrontend}
              required
            />

            <MultiItemSkillGroup
              title="Backend Frameworks"
              helper="Select at least one backend framework and set your proficiency."
              suggestions={BACKEND_FRAMEWORKS}
              items={formData.backendFrameworks.map((f) => ({
                id: f.id,
                name: f.framework,
                proficiency: f.proficiency,
              }))}
              onAdd={addBackend}
              onUpdate={updateBackend}
              onRemove={removeBackend}
              required
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
