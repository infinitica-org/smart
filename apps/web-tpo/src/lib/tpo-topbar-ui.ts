/** Navbar-only visual tokens — monochrome, no teal/cyan active states. */

/** Matches `--tpo-font-sans` in globals.css (SF Pro on Apple platforms). */
export const topbarFontClass = 'font-[family-name:var(--tpo-font-sans)]';

export const topbarShellClass =
  'sticky top-0 z-40 flex h-14 shrink-0 items-stretch border-b border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] antialiased';

export const topbarProBadgeClass =
  'rounded border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-1.5 py-0.5 text-[9px] font-medium tracking-[0.08em] text-[var(--ds-text-muted)]';

export const topbarNavLinkBaseClass =
  'relative inline-flex h-full items-center px-3 text-[13px] font-medium leading-[1.2] tracking-[-0.01em] text-[var(--ds-text-muted)] transition-colors hover:text-[var(--ds-text)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-text)] lg:px-3.5';

export const topbarNavLinkActiveClass = 'font-semibold text-[var(--ds-text)]';

export const topbarNavUnderlineClass =
  'pointer-events-none absolute inset-x-2.5 bottom-0 h-[2px] bg-[var(--ds-text)] lg:inset-x-3';

export const topbarPrimaryNavClass =
  'hidden h-full min-w-0 flex-1 items-stretch justify-start gap-0.5 xl:flex';

export const topbarSearchInputClass =
  'h-7 w-40 rounded-full border border-transparent bg-[var(--ds-surface-muted)] py-1 pl-8 pr-11 text-[12px] font-medium text-[var(--ds-text)] transition-colors placeholder:text-[var(--ds-text-subtle)] focus:border-[var(--ds-border)] focus:bg-[var(--ds-surface)] focus:outline-none lg:w-48';

export const topbarSeparatorClass =
  'mx-2 hidden w-px shrink-0 self-center bg-[var(--ds-border)] md:block h-5';

export function topbarMobileNavRowClass(active: boolean): string {
  return `rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
    active
      ? 'font-semibold text-[var(--ds-text)]'
      : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]'
  }`;
}
