import { ATS_STAGES, type AtsStage, type CandidateApplicationDto } from '@smart/contracts';

/** Poll interval for CO-T02 stage sync. TanStack Query stops this on unmount. */
export const MY_APPLICATIONS_POLL_MS = 5_000;

/** Canonical labels used by the CO-T02 ATS Kanban — do not invent stages. */
export const ATS_STAGE_LABELS: Record<AtsStage, string> = {
  APPLIED: 'Applied / New Matches',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interviewing',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

/** Forward hiring path. REJECTED / WITHDRAWN are terminal, not steps past Offer. */
export const ATS_PIPELINE_STAGES = [
  'APPLIED',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFER',
] as const satisfies readonly AtsStage[];

export type AtsPipelineStage = (typeof ATS_PIPELINE_STAGES)[number];

export function isCanonicalAtsStage(value: string): value is AtsStage {
  return (ATS_STAGES as readonly string[]).includes(value);
}

export function isTerminalAtsStage(stage: AtsStage): boolean {
  return stage === 'REJECTED' || stage === 'WITHDRAWN';
}

export function pipelineProgressIndex(stage: AtsStage): number {
  if (isTerminalAtsStage(stage)) return -1;
  return ATS_PIPELINE_STAGES.indexOf(stage as AtsPipelineStage);
}

export function stageReached(current: AtsStage, column: AtsPipelineStage): boolean {
  const currentIndex = pipelineProgressIndex(current);
  if (currentIndex < 0) return false;
  return ATS_PIPELINE_STAGES.indexOf(column) <= currentIndex;
}

export function matchPercent(matchScore: number | null): string | null {
  if (matchScore === null) return null;
  return `${Math.round(matchScore * 100)}%`;
}

export function formatAppliedOn(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function sortApplications(
  applications: readonly CandidateApplicationDto[],
): CandidateApplicationDto[] {
  return [...applications].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
