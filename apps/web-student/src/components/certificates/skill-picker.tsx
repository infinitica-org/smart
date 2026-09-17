'use client';

import { useMemo, useState } from 'react';
import { SKILL_DEFINITIONS, type CertificateProficiency } from '@smart/contracts';
import { X } from 'lucide-react';
import { nativeOptionClass, nativeSelectClass } from '@/lib/native-select';
import { isUnlistedSkillCode, unlistedSkillCode } from '@/lib/unlisted-skill';

export interface CertificateSkillSelection {
  skillCode: string;
  selfAssessedProficiency: CertificateProficiency;
}

const PROFICIENCY_OPTIONS: readonly CertificateProficiency[] = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
];
const PROFICIENCY_LABELS: Record<CertificateProficiency, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
};

const MAX_MATCHES = 6;

interface SkillPickerProps {
  selected: CertificateSkillSelection[];
  onChange: (next: CertificateSkillSelection[]) => void;
  disabled?: boolean;
}

/**
 * Taxonomy-constrained, reusing the exact search+dropdown+chip pattern from
 * `apps/web-student/src/components/onboarding/steps/SkillDiscovery.tsx` —
 * nothing added here can fail to map to a real skill.
 */
export function SkillPicker({ selected, onChange, disabled }: SkillPickerProps) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const chosen = new Set(selected.map((skill) => skill.skillCode));
    return SKILL_DEFINITIONS.filter(
      (skill) => skill.name.toLowerCase().includes(q) && !chosen.has(skill.code),
    ).slice(0, MAX_MATCHES);
  }, [query, selected]);

  const addSkill = (skillCode?: string) => {
    const code =
      skillCode ??
      matches[0]?.code ??
      (query.trim().length >= 2 ? unlistedSkillCode(query) : undefined);
    if (!code || selected.some((skill) => skill.skillCode === code)) {
      setQuery('');
      return;
    }
    onChange([...selected, { skillCode: code, selfAssessedProficiency: 'BEGINNER' }]);
    setQuery('');
  };

  const removeSkill = (skillCode: string) =>
    onChange(selected.filter((skill) => skill.skillCode !== skillCode));

  const setProficiency = (skillCode: string, proficiency: CertificateProficiency) => {
    onChange(
      selected.map((skill) =>
        skill.skillCode === skillCode ? { ...skill, selfAssessedProficiency: proficiency } : skill,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {selected.length > 0 ? (
        <div className="flex flex-col gap-2">
          {selected.map((sel) => {
            const definition = SKILL_DEFINITIONS.find((skill) => skill.code === sel.skillCode);
            return (
              <div
                key={sel.skillCode}
                className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2"
              >
                <span className="flex-1 text-sm font-medium text-foreground">
                  {definition?.name ??
                    (isUnlistedSkillCode(sel.skillCode)
                      ? sel.skillCode.replace(/^UL_/, '').replace(/_/g, ' ')
                      : sel.skillCode)}
                </span>
                <select
                  value={sel.selfAssessedProficiency}
                  disabled={disabled}
                  onChange={(event) =>
                    setProficiency(sel.skillCode, event.target.value as CertificateProficiency)
                  }
                  className={`${nativeSelectClass} h-8 w-auto min-w-[8rem]`}
                >
                  {PROFICIENCY_OPTIONS.map((proficiency) => (
                    <option key={proficiency} value={proficiency} className={nativeOptionClass}>
                      {PROFICIENCY_LABELS[proficiency]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeSkill(sel.skillCode)}
                  disabled={disabled}
                  className="text-muted-foreground/60 hover:text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="relative">
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addSkill();
            }
          }}
          placeholder="Search skills (e.g. AWS, Cloud Computing)"
          className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/50 focus:outline-none"
        />
        {query.trim() ? (
          matches.length > 0 ? (
            <div className="absolute z-10 mt-1.5 w-full rounded-xl border border-border bg-background py-1.5 shadow-xl">
              {matches.map((skill) => (
                <button
                  key={skill.code}
                  type="button"
                  onClick={() => addSkill(skill.code)}
                  className="flex w-full items-center px-3.5 py-2 text-left text-sm text-foreground/80 hover:bg-muted hover:text-foreground"
                >
                  {skill.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">No matching skill in our catalog.</p>
              <button
                type="button"
                disabled={disabled || query.trim().length < 2}
                onClick={() => addSkill(unlistedSkillCode(query))}
                className="self-start rounded-lg border border-border px-3 py-1.5 text-xs text-foreground/80 hover:bg-muted disabled:opacity-40"
              >
                Add “{query.trim()}” as unlisted
              </button>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
