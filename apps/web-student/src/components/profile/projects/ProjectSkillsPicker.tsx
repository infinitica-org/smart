'use client';

import { X } from 'lucide-react';

import type { ProjectSkillOption } from '@/lib/project-form-skills';
import { nativeOptionClass, nativeSelectClass } from '@/lib/native-select';

type ProjectSkillsPickerProps = {
  options: readonly ProjectSkillOption[];
  selectedCodes: readonly string[];
  onChange: (codes: string[]) => void;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
};

export function ProjectSkillsPicker({
  options,
  selectedCodes,
  onChange,
  error,
  disabled,
  loading,
}: ProjectSkillsPickerProps) {
  const selectedSet = new Set(selectedCodes);
  const available = options.filter((option) => !selectedSet.has(option.code));

  const addSkill = (code: string) => {
    if (!code || selectedSet.has(code)) return;
    onChange([...selectedCodes, code]);
  };

  const removeSkill = (code: string) => {
    onChange(selectedCodes.filter((row) => row !== code));
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label className="font-medium text-[var(--ds-text)]" htmlFor="project-skills-add">
        Skills
      </label>
      <select
        id="project-skills-add"
        className={nativeSelectClass}
        disabled={disabled || loading || available.length === 0}
        value=""
        onChange={(event) => {
          addSkill(event.target.value);
          event.target.value = '';
        }}
        aria-describedby={error ? 'project-skills-error' : undefined}
      >
        <option value="" className={nativeOptionClass}>
          {loading
            ? 'Loading skills…'
            : available.length === 0
              ? 'All skills selected'
              : 'Add a skill…'}
        </option>
        {available.map((option) => (
          <option key={option.code} value={option.code} className={nativeOptionClass}>
            {option.name} · {option.categoryName}
          </option>
        ))}
      </select>
      {selectedCodes.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selectedCodes.map((code) => {
            const option = options.find((row) => row.code === code);
            const label = option?.name ?? code;
            return (
              <li key={code}>
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-hover)] py-0.5 pl-2.5 pr-1 text-xs font-medium text-[var(--ds-text)]">
                  <span className="truncate">{label}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    className="rounded-full p-0.5 text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface)] hover:text-[var(--ds-text)]"
                    aria-label={`Remove ${label}`}
                    onClick={() => removeSkill(code)}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-[var(--ds-text-muted)]">
          Choose the SMART skills this project demonstrates. They appear on your profile and
          assessment list.
        </p>
      )}
      {error ? (
        <span id="project-skills-error" className="text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
