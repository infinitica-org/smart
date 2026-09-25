'use client';

import { X } from 'lucide-react';
import {
  EMPLOYMENT_TYPES,
  JOB_WORK_MODES,
  type EmploymentType,
  type JobWorkMode,
} from '@smart/contracts';
import {
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
  activeFilters,
  clearFilters,
  withoutFilter,
  type JobsUrlState,
} from '@/lib/jobs-url-state';

interface JobFiltersProps {
  state: JobsUrlState;
  onChange: (next: JobsUrlState) => void;
}

const selectClass =
  'h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900';

/** Filter controls plus removable chips and a clear-all; every change goes to the URL via onChange. */
export function JobFilters({ state, onChange }: JobFiltersProps) {
  const chips = activeFilters(state);
  return (
    <section aria-label="Job filters" className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold">
          Employment type
          <select
            className={`${selectClass} mt-1 block`}
            value={state.type ?? ''}
            onChange={(e) =>
              onChange({
                ...state,
                type: (e.target.value || undefined) as EmploymentType | undefined,
              })
            }
          >
            <option value="">Any type</option>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EMPLOYMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Work mode
          <select
            className={`${selectClass} mt-1 block`}
            value={state.mode ?? ''}
            onChange={(e) =>
              onChange({ ...state, mode: (e.target.value || undefined) as JobWorkMode | undefined })
            }
          >
            <option value="">Any mode</option>
            {JOB_WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {WORK_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Location
          <input
            type="search"
            className={`${selectClass} mt-1 block w-44`}
            placeholder="City or region"
            defaultValue={state.location ?? ''}
            key={state.location ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onChange({ ...state, location: e.currentTarget.value.trim() || undefined });
              }
            }}
            onBlur={(e) => {
              const next = e.currentTarget.value.trim() || undefined;
              if (next !== state.location) onChange({ ...state, location: next });
            }}
          />
        </label>
      </div>

      {chips.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={() => onChange(withoutFilter(state, chip.key))}
                aria-label={`Remove filter ${chip.label}`}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
              >
                {chip.label}
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => onChange(clearFilters(state))}
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Clear all
            </button>
          </li>
        </ul>
      ) : null}
    </section>
  );
}
