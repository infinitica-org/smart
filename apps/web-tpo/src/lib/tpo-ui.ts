/**
 * Shared TPO console surface classes. Mirrors the student profile workspace
 * (apps/web-student/src/lib/profile-ui-classes.ts) so both consoles share one
 * visual language, with SMART teal --tpo-accent carrying active/primary states.
 */

export const surfaceClass =
  'relative overflow-hidden rounded-[20px] border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-[var(--ds-card-shadow)] transition-[border-color,box-shadow] duration-200';

export const cardClass = `${surfaceClass} p-6`;

export const cardCompactClass = `${surfaceClass} p-4`;

export const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-[9px] bg-[var(--tpo-accent)] px-4 py-2 text-sm font-semibold text-[var(--ds-text)] transition hover:bg-[var(--tpo-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)] disabled:opacity-50';

export const primaryButtonSmClass =
  'inline-flex items-center justify-center gap-2 rounded-[9px] bg-[var(--tpo-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--ds-text)] transition hover:bg-[var(--tpo-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)] disabled:opacity-50';

export const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-[9px] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm font-semibold text-[var(--ds-text)] transition hover:bg-[var(--ds-surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)] disabled:opacity-50';

export const secondaryButtonSmClass =
  'inline-flex items-center justify-center gap-2 rounded-[9px] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ds-text)] transition hover:bg-[var(--ds-surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)] disabled:opacity-50';

export const inputClass =
  'w-full rounded-[9px] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] transition focus:border-[var(--tpo-accent-border)] focus:outline-2 focus:outline-offset-0 focus:outline-[var(--tpo-accent)]';

export const selectClass =
  'h-10 rounded-[9px] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 text-sm font-medium text-[var(--ds-text)] transition focus:border-[var(--tpo-accent-border)] focus:outline-2 focus:outline-offset-0 focus:outline-[var(--tpo-accent)] disabled:opacity-50';

export const labelClass = 'text-xs font-semibold text-[var(--ds-text-secondary)]';

/** Small caps group heading, matching the profile sidebar group labels. */
export const eyebrowClass =
  'text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--ds-text-muted)]';

export const sectionLabelClass =
  'text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--ds-text-subtle)]';

export const pageTitleClass =
  'text-[32px] font-semibold leading-[1.15] tracking-tight text-[var(--ds-text)]';

export const pageDescriptionClass =
  'max-w-[720px] text-base leading-relaxed text-[var(--ds-text-muted)]';

export const sectionTitleClass = 'text-base font-semibold text-[var(--ds-text)]';

export const headingClass = 'text-[var(--ds-text)]';
export const secondaryTextClass = 'text-[var(--ds-text-secondary)]';
export const mutedTextClass = 'text-[var(--ds-text-muted)]';
export const subtleTextClass = 'text-[var(--ds-text-subtle)]';

export const dividerClass = 'border-[var(--ds-border-subtle)]';

export const errorNoticeClass =
  'rounded-xl border border-[var(--ds-coral-border)] bg-[#fef4f4] px-4 py-3 text-sm text-[var(--ds-coral)]';

export const chipClass =
  'inline-flex items-center gap-1.5 rounded-full border border-[var(--ds-border)] bg-[var(--ds-chip-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ds-text-secondary)]';

export const accentChipClass =
  'inline-flex items-center gap-1.5 rounded-full border border-[var(--tpo-accent-border)] bg-[var(--tpo-accent-tint)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ds-text)]';

export const tableHeadCellClass = `px-4 py-2.5 text-left ${sectionLabelClass}`;

export const tableCellClass = 'px-4 py-3 text-sm text-[var(--ds-text-secondary)]';

export const tableRowClass = 'border-t border-[var(--ds-border-subtle)]';
