/** Shared Student platform surfaces — consume CSS tokens from globals.css only. */

export const studentWarningBannerClass =
  'rounded-[18px] border border-[var(--student-warning-border)] bg-[var(--student-warning-soft)] px-4 py-3.5 text-sm text-[var(--student-warning)]';

export const studentErrorBannerClass =
  'rounded-[18px] border border-[var(--student-error-border)] bg-[var(--student-error-soft)] px-4 py-3.5 text-sm text-[var(--student-error)]';

export const studentInfoBannerClass =
  'rounded-xl border border-[var(--student-info-border)] bg-[var(--student-info-soft)] px-4 py-3 text-sm text-[var(--student-info)]';

export const studentSuccessBannerClass =
  'rounded-xl border border-[var(--student-success-border)] bg-[var(--student-success-soft)] px-4 py-3 text-sm text-[var(--student-success)]';

export const studentModalOverlayClass =
  'fixed inset-0 z-50 flex items-center justify-center bg-[var(--student-overlay)] p-4';

export const studentInputClass =
  'mt-1.5 h-11 w-full rounded-[11px] border border-[var(--student-border)] bg-[var(--student-surface)] px-3 text-sm text-[var(--student-text-primary)] placeholder:text-[var(--student-text-tertiary)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--student-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--student-accent-soft)]';

export const studentTertiaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-[9px] px-3 py-2 text-sm font-medium text-[var(--student-text-secondary)] transition hover:bg-[var(--student-surface-secondary)] hover:text-[var(--student-text-primary)]';

export const studentBadgeVerifiedClass =
  'inline-flex items-center gap-1.5 rounded-full border border-[var(--student-success-border)] bg-[var(--student-success-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--student-success)]';

export const studentBadgePendingClass =
  'inline-flex items-center gap-1.5 rounded-full border border-[var(--student-warning-border)] bg-[var(--student-warning-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--student-warning)]';

export const studentBadgeInProgressClass =
  'inline-flex items-center gap-1.5 rounded-full border border-[var(--student-info-border)] bg-[var(--student-info-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--student-info)]';

export const studentBadgeErrorClass =
  'inline-flex items-center gap-1.5 rounded-full border border-[var(--student-error-border)] bg-[var(--student-error-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--student-error)]';

export const studentEmptyIconWrapClass =
  'flex size-14 items-center justify-center rounded-[18px] bg-[var(--student-surface-subtle)] text-[var(--student-text-tertiary)] ring-1 ring-[var(--student-border-subtle)]';

export const studentBentoTipIconWrapClass =
  'flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--student-surface)] ring-1 ring-[var(--student-info-border)] text-[var(--student-info)]';

export const studentSkeletonClass = 'animate-pulse rounded-md bg-[var(--student-skeleton)]';
