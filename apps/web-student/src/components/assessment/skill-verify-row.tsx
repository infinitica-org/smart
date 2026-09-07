'use client';

import { Button, VerificationBadge } from '@smart/ui';
import { skillFocusOptions, type SkillClaimDto, type SkillProficiency } from '@smart/contracts';
import {
  PROFICIENCY_LABELS,
  PROFICIENCY_OPTIONS,
  formatRetryAt,
  viewForFocus,
} from '@/lib/skill-declarations';
import { nativeOptionClass, nativeSelectClass } from '@/lib/native-select';

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
  const lockHint = view.status === 'LOCKED' ? `Locked until ${retryLabel}` : `Opens ${retryLabel}`;

  return (
    <li className="grid grid-cols-1 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-3 lg:grid-cols-[minmax(12rem,1.5fr)_8.5rem_9rem_10rem_8.5rem]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium text-gray-900">{skillName}</p>
          {view.cooling && retryLabel ? (
            <time
              dateTime={view.retryAt ?? undefined}
              className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
            >
              {lockHint}
            </time>
          ) : null}
        </div>
      </div>
      <div className="flex lg:justify-center">
        <VerificationBadge status={view.badge} variant="outline" className="whitespace-nowrap" />
      </div>
      <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium text-gray-500">
        Proficiency
        <select
          value={proficiency}
          disabled={!view.canEditProficiency || pending}
          onChange={(event) => onProficiency(event.target.value as SkillProficiency)}
          className={nativeSelectClass}
          aria-label={`Proficiency for ${skillName}`}
        >
          {PROFICIENCY_OPTIONS.map((level) => (
            <option key={level} value={level} className={nativeOptionClass}>
              {PROFICIENCY_LABELS[level]}
            </option>
          ))}
        </select>
      </label>
      {focusOptions.length > 0 ? (
        <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium text-gray-500">
          Focus
          <select
            value={focusOptions.includes(focus) ? focus : (focusOptions[0] ?? '')}
            disabled={pending}
            onChange={(event) => onFocus(event.target.value)}
            className={nativeSelectClass}
            aria-label={`Focus for ${skillName}`}
          >
            {focusOptions.map((option) => (
              <option key={option} value={option} className={nativeOptionClass}>
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
        title={
          view.hasForm ? (view.blockMessage ?? undefined) : 'This challenge is not unlocked yet.'
        }
        onClick={onVerify}
      >
        {pending ? 'Starting…' : view.hasForm ? (view.cooling ? 'Locked' : 'Verify') : "Can't play"}
      </Button>
    </li>
  );
}
