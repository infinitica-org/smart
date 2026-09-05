'use client';

import { Button, VerificationBadge } from '@smart/ui';
import { skillFocusOptions, type SkillClaimDto, type SkillProficiency } from '@smart/contracts';
import {
  PROFICIENCY_LABELS,
  PROFICIENCY_OPTIONS,
  formatRetryAt,
  viewForFocus,
} from '@/lib/skill-declarations';

const selectClass =
  'h-9 w-full min-w-0 rounded-lg border border-[var(--surface-border,rgba(255,255,255,0.12))] bg-transparent px-2 text-xs';

export function SkillVerifyRow({
  skillCode,
  skillName,
  claim,
  proficiency,
  focus,
  pending,
  onProficiency,
  onFocus,
  onVerify,
}: {
  skillCode: string;
  skillName: string;
  claim?: SkillClaimDto;
  proficiency: SkillProficiency;
  focus: string;
  pending: boolean;
  onProficiency: (value: SkillProficiency) => void;
  onFocus: (value: string) => void;
  onVerify: () => void;
}) {
  const focusOptions = skillFocusOptions(skillCode);
  const view = viewForFocus(claim, skillCode, focus);
  const retryLabel = formatRetryAt(view.retryAt);

  return (
    <li className="grid grid-cols-1 items-center gap-3 rounded-xl border border-white/10 px-3 py-3 lg:grid-cols-[minmax(12rem,1.5fr)_8.5rem_9rem_10rem_8.5rem]">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{skillName}</p>
        {view.cooling && retryLabel ? (
          <p className="mt-0.5 text-xs text-[var(--text-secondary,rgba(255,255,255,0.4))]">
            {view.selected ? `${view.selected}: ` : ''}available again {retryLabel}
          </p>
        ) : null}
      </div>
      <div className="flex lg:justify-center">
        <VerificationBadge status={view.badge} variant="outline" className="whitespace-nowrap" />
      </div>
      <label className="flex min-w-0 flex-col gap-1 text-[11px] text-[var(--text-secondary,rgba(255,255,255,0.45))]">
        Proficiency
        <select
          value={proficiency}
          disabled={!view.canEditProficiency || pending}
          onChange={(event) => onProficiency(event.target.value as SkillProficiency)}
          className={selectClass}
          aria-label={`Proficiency for ${skillName}`}
        >
          {PROFICIENCY_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {PROFICIENCY_LABELS[level]}
            </option>
          ))}
        </select>
      </label>
      {focusOptions.length > 0 ? (
        <label className="flex min-w-0 flex-col gap-1 text-[11px] text-[var(--text-secondary,rgba(255,255,255,0.45))]">
          Focus
          <select
            value={focusOptions.includes(focus) ? focus : (focusOptions[0] ?? '')}
            disabled={pending}
            onChange={(event) => onFocus(event.target.value)}
            className={selectClass}
            aria-label={`Focus for ${skillName}`}
          >
            {focusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="hidden lg:block" />
      )}
      <Button
        type="button"
        className="h-9 w-full min-w-[8rem]"
        disabled={!view.canStart || pending}
        title={view.hasForm ? (view.blockMessage ?? undefined) : 'No SDE verification form yet.'}
        onClick={onVerify}
      >
        {pending ? 'Starting…' : view.hasForm ? 'Verify' : 'No assessment'}
      </Button>
    </li>
  );
}
