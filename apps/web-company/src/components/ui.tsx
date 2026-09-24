'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { SKILL_LEVELS, type SkillLevel } from '../lib/types';
import { SKILL_CATALOG_GROUPS, skillNameForCode, type SkillReq } from '../lib/skill-catalog';
import {
  chip,
  input,
  pageDescription,
  pageTitle,
  secondaryButton,
  toneBadge,
  type Tone,
} from '../lib/ui';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneBadge[tone]}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-[var(--ds-border-subtle)] pb-5 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-1.5">
        <h1 className={pageTitle}>{title}</h1>
        {description ? <p className={`max-w-2xl ${pageDescription}`}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-[20px] border border-[var(--ds-border)] bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold text-[var(--ds-text)]">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-muted)]"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export type { SkillReq };

/**
 * Removable skill tags with a minimum level. Skills can only be chosen from the SMART skill
 * catalog, so the API always receives a real skill code.
 */
export function SkillsEditor({
  skills,
  onChange,
}: {
  skills: SkillReq[];
  onChange: (next: SkillReq[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState('');
  const [level, setLevel] = useState<SkillLevel>('Intermediate');

  const chosen = new Set(skills.map((skill) => skill.code));

  function commit() {
    if (!code || chosen.has(code)) return;
    onChange([...skills, { code, name: skillNameForCode(code), level }]);
    setCode('');
    setAdding(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {skills.map((skill) => (
          <span
            key={skill.code}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--co-primary)] px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            {skill.name} · {skill.level}
            <button
              type="button"
              aria-label={`Remove ${skill.name}`}
              onClick={() => onChange(skills.filter((s) => s.code !== skill.code))}
              className="rounded-full p-0.5 hover:bg-white/20"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`${chip} hover:bg-white`}
          >
            <Plus className="size-3" /> Add skill
          </button>
        ) : null}
      </div>

      {adding ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label="Skill"
            className={`${input} max-w-[280px]`}
          >
            <option value="">Choose a skill from the SMART catalog…</option>
            {SKILL_CATALOG_GROUPS.map((group) => {
              const available = group.skills.filter((skill) => !chosen.has(skill.code));
              if (available.length === 0) return null;
              return (
                <optgroup key={group.categoryName} label={group.categoryName}>
                  {available.map((skill) => (
                    <option key={skill.code} value={skill.code}>
                      {skill.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as SkillLevel)}
            aria-label="Minimum level"
            className={`${input} max-w-[160px]`}
          >
            {SKILL_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={commit}
            disabled={!code}
            className={`${secondaryButton} disabled:opacity-50`}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setCode('');
            }}
            className="text-[13px] font-semibold text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Toggle chip group — single or multi select. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multiple = false,
}: {
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" role={multiple ? 'group' : 'radiogroup'}>
      {options.map((option) => {
        const on = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (multiple) onChange(on ? value.filter((v) => v !== option) : [...value, option]);
              else onChange([option]);
            }}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              on
                ? 'border-[var(--co-primary)] bg-[var(--co-primary)] text-white'
                : 'border-[var(--ds-border)] bg-white text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)]'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
