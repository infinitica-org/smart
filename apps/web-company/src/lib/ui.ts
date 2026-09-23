/** Shared class tokens — same bento look as the TPO console. */

export const pageStack = 'mx-auto w-full max-w-[1200px] space-y-5 pb-12';

export const card =
  'relative overflow-hidden rounded-[20px] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-5 shadow-[var(--ds-card-shadow)] md:p-6';

export const cardMuted =
  'rounded-[16px] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-4';

export const pageTitle = 'text-xl font-semibold tracking-tight text-[var(--ds-text)] md:text-2xl';
export const pageDescription = 'text-[13px] leading-relaxed text-[var(--ds-text-muted)] md:text-sm';
export const sectionTitle = 'text-base font-semibold tracking-tight text-[var(--ds-text)]';
export const sectionSubtitle = 'mt-0.5 text-[13px] text-[var(--ds-text-muted)]';

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--co-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-colors duration-200 hover:bg-[var(--co-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--co-primary)] disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--ds-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ds-text)] transition-colors duration-200 hover:bg-[var(--ds-surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--co-primary)] disabled:cursor-not-allowed disabled:opacity-50';

export const dangerButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--co-red)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--co-red)]';

export const input =
  'h-10 w-full min-w-0 rounded-[10px] border border-[var(--ds-border)] bg-white px-3 text-[13px] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] transition focus:border-[#c7d2e0] focus:outline-2 focus:outline-offset-0 focus:outline-[var(--co-teal)] disabled:opacity-50';

export const textarea =
  'w-full min-w-0 rounded-[10px] border border-[var(--ds-border)] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] transition focus:border-[#c7d2e0] focus:outline-2 focus:outline-offset-0 focus:outline-[var(--co-teal)]';

export const label = 'mb-1.5 block text-[12px] font-semibold text-[var(--ds-text-secondary)]';

export const tableShell =
  'overflow-hidden rounded-[16px] border border-[var(--ds-border)] bg-white';
export const table = 'w-full text-left text-[13px]';
export const tableHeadRow =
  'border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]';
export const tableHeadCell = 'px-4 py-3 font-semibold';
export const tableRow =
  'border-b border-[var(--ds-border-subtle)] last:border-0 transition-colors duration-200 hover:bg-[var(--ds-surface-hover)]';
export const tableCell = 'px-4 py-3.5 text-[var(--ds-text-secondary)]';

export const chip =
  'inline-flex items-center gap-1.5 rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-2.5 py-1 text-[12px] font-medium text-[var(--ds-text-secondary)]';

export const chipToggleOn =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--co-primary)] bg-[var(--co-primary)] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors';
export const chipToggleOff =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--ds-border)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-surface-hover)]';

export const segmentedShell =
  'inline-flex flex-wrap gap-1 rounded-[10px] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-1';
export const segmentOn =
  'rounded-md border border-[var(--ds-border-subtle)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ds-text)] shadow-sm';
export const segmentOff =
  'rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold text-[var(--ds-text-muted)] transition-colors hover:text-[var(--ds-text)]';

export type Tone = 'green' | 'blue' | 'amber' | 'red' | 'neutral' | 'lavender';

/** One state language everywhere: Verified green / In progress blue / Pending amber / Locked red. */
export const toneBadge: Record<Tone, string> = {
  green: 'border-[#cbede3] bg-[#ecf8f4] text-[#258b72]',
  blue: 'border-[#d6e5fa] bg-[#eef5ff] text-[#3568b8]',
  amber: 'border-[#f4d9a3] bg-[#fff8e8] text-[#b7791f]',
  red: 'border-[#f5c6c8] bg-[#fdecec] text-[#b4232a]',
  lavender: 'border-[#ddd6fb] bg-[#f5f3ff] text-[#5b48d6]',
  neutral: 'border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-secondary)]',
};

export const iconWrap: Record<'blue' | 'mint' | 'lavender' | 'amber', string> = {
  blue: 'bg-[var(--co-blue-soft)] text-[var(--co-blue)]',
  mint: 'bg-[var(--co-mint-soft)] text-[var(--co-mint)]',
  lavender: 'bg-[var(--co-lavender-soft)] text-[var(--co-lavender)]',
  amber: 'bg-[var(--co-amber-soft)] text-[var(--co-amber)]',
};
