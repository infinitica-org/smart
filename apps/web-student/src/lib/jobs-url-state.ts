import {
  EMPLOYMENT_TYPES,
  JOB_FIT_TABS,
  JOB_LOCATION_MAX_LENGTH,
  JOB_WORK_MODES,
  type EmploymentType,
  type JobFitTab,
  type JobWorkMode,
} from '@smart/contracts';

/**
 * The Jobs page keeps its filter, tab and view state in the URL so a refresh or a shared link shows
 * the same results (Th6-380/381). Unknown or invalid values in a hand-edited URL fall back to
 * defaults instead of breaking the page; the API itself answers 422 for them.
 */

export type JobsView = 'browse' | 'saved';

export interface JobsUrlState {
  view: JobsView;
  fit: JobFitTab;
  type: EmploymentType | undefined;
  mode: JobWorkMode | undefined;
  location: string | undefined;
}

export const DEFAULT_JOBS_STATE: JobsUrlState = {
  view: 'browse',
  fit: 'ALL',
  type: undefined,
  mode: undefined,
  location: undefined,
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  FREELANCE: 'Freelance',
};

export const WORK_MODE_LABELS: Record<JobWorkMode, string> = {
  ONSITE: 'On-site',
  HYBRID: 'Hybrid',
  REMOTE: 'Remote',
};

export const FIT_TAB_LABELS: Record<JobFitTab, string> = {
  STRONG: 'Strong fit',
  GOOD: 'Good fit',
  ALL: 'All',
};

interface ParamReader {
  get(name: string): string | null;
}

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

export function parseJobsUrl(params: ParamReader): JobsUrlState {
  const location = params.get('location')?.trim().slice(0, JOB_LOCATION_MAX_LENGTH);
  return {
    view: params.get('view') === 'saved' ? 'saved' : 'browse',
    fit: pick(params.get('fit'), JOB_FIT_TABS) ?? 'ALL',
    type: pick(params.get('type'), EMPLOYMENT_TYPES),
    mode: pick(params.get('mode'), JOB_WORK_MODES),
    location: location ? location : undefined,
  };
}

/** Query string for a state, leaving out defaults so the common URL stays clean. */
export function toJobsSearch(state: JobsUrlState): string {
  const params = new URLSearchParams();
  if (state.view === 'saved') params.set('view', 'saved');
  if (state.fit !== 'ALL') params.set('fit', state.fit);
  if (state.type) params.set('type', state.type);
  if (state.mode) params.set('mode', state.mode);
  if (state.location) params.set('location', state.location);
  const text = params.toString();
  return text ? `?${text}` : '';
}

export interface ActiveFilter {
  key: 'type' | 'mode' | 'location';
  label: string;
}

export function activeFilters(state: JobsUrlState): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  if (state.type)
    chips.push({ key: 'type', label: EMPLOYMENT_TYPE_LABELS[state.type] ?? state.type });
  if (state.mode) chips.push({ key: 'mode', label: WORK_MODE_LABELS[state.mode] });
  if (state.location) chips.push({ key: 'location', label: state.location });
  return chips;
}

export function withoutFilter(state: JobsUrlState, key: ActiveFilter['key']): JobsUrlState {
  return { ...state, [key]: undefined };
}

export function clearFilters(state: JobsUrlState): JobsUrlState {
  return { ...state, type: undefined, mode: undefined, location: undefined };
}
