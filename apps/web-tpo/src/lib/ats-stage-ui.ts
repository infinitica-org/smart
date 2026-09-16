import { ATS_STAGES, type AtsStage } from '@smart/contracts';

/**
 * Single source of ATS stage presentation for the placement console. Labels are
 * the ones the console already showed (CO-T02 kanban wording); only colour and
 * ordering live here. The AtsStage enum and its transitions are unchanged.
 */
export interface AtsStagePresentation {
  id: AtsStage;
  label: string;
  description: string;
  /** Pill styling for tables, cards and drawers. */
  badgeClass: string;
  /** Top rail on the kanban column header. */
  railClass: string;
}

const NEUTRAL_BADGE =
  'border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-secondary)]';

export const ATS_STAGE_UI: Record<AtsStage, AtsStagePresentation> = {
  APPLIED: {
    id: 'APPLIED',
    label: 'Applied / New Matches',
    description: 'Candidates who applied or matched this opening',
    badgeClass: NEUTRAL_BADGE,
    railClass: 'bg-[var(--ds-border)]',
  },
  SHORTLISTED: {
    id: 'SHORTLISTED',
    label: 'Shortlisted',
    description: 'Selected candidates for preliminary review',
    badgeClass: 'border-[var(--tpo-accent-border)] bg-[var(--tpo-accent-tint)] text-[#0f766e]',
    railClass: 'bg-[var(--tpo-accent)]',
  },
  AI_VERIFIED: {
    id: 'AI_VERIFIED',
    label: 'AI-Verified',
    description: 'Passed AI confidence check and sent to the company',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
    railClass: 'bg-sky-400',
  },
  INTERVIEW: {
    id: 'INTERVIEW',
    label: 'Interviewing',
    description: 'Active candidates undergoing interviews',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    railClass: 'bg-violet-400',
  },
  OFFER: {
    id: 'OFFER',
    label: 'Offer',
    description: 'Candidates with job offer extended',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    railClass: 'bg-amber-400',
  },
  HIRED: {
    id: 'HIRED',
    label: 'Hired',
    description: 'Candidates who accepted the offer',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    railClass: 'bg-emerald-500',
  },
  REJECTED: {
    id: 'REJECTED',
    label: 'Rejected',
    description: 'Candidates not selected for this opening',
    badgeClass: 'border-[var(--ds-coral-border)] bg-[#fef4f4] text-[var(--ds-coral)]',
    railClass: 'bg-[var(--ds-coral)]',
  },
  WITHDRAWN: {
    id: 'WITHDRAWN',
    label: 'Withdrawn',
    description: 'Candidates who withdrew application',
    badgeClass: NEUTRAL_BADGE,
    railClass: 'bg-[var(--ds-text-subtle)]',
  },
};

/** Kanban column order, driven by the contract enum so it cannot drift. */
export const ATS_STAGE_ORDER: AtsStagePresentation[] = ATS_STAGES.map(
  (stage) => ATS_STAGE_UI[stage],
);

export const stageBadgeBaseClass =
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold';

export function stageBadgeClass(stage: AtsStage): string {
  return `${stageBadgeBaseClass} ${ATS_STAGE_UI[stage].badgeClass}`;
}

export function stageLabel(stage: AtsStage): string {
  return ATS_STAGE_UI[stage].label;
}
