/** Light Bento workspace tokens (scoped via `.tpo-bento-theme` / `.tpo-dashboard` in globals.css). */

export const bentoThemeClass = 'tpo-bento-theme';

export const bentoPageStackClass = 'mx-auto max-w-[1400px] space-y-5 pb-12';

/** Candidates workspace: fuller width, tighter vertical rhythm. */
export const candidatesPageStackClass = 'mx-auto w-full max-w-[1500px] space-y-4 pb-8';

export const bentoCompactCardClass =
  'relative overflow-hidden rounded-[16px] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4 shadow-[var(--ds-card-shadow)] md:rounded-[18px] md:p-5';

export const bentoCompactToolbarClass = bentoCompactCardClass;

/** One-row filter toolbar on xl+ (search ~45%, three equal filters). */
export const candidatesFilterGridClass =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:items-center';

/** Shared height/radius for search + selects in Candidates (no teal focus ring). */
export const candidatesControlClass =
  'h-10 w-full min-w-0 rounded-[9px] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 text-[13px] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] transition focus:border-[#c7d2e0] focus:outline-2 focus:outline-offset-0 focus:outline-[var(--tpo-dash-primary)] disabled:opacity-50';

export const candidatesTableHeadCellClass = 'px-4 py-2.5 font-semibold';

export const candidatesTableCellClass = 'px-4 py-3 text-[13px] text-[var(--ds-text-secondary)]';

export const candidatesSidebarLinkActiveClass =
  'bg-[var(--ds-nav-active-bg)] font-semibold text-[var(--ds-text)] before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[var(--tpo-dash-primary)] before:content-[""]';

export const bentoSegmentedTabsClass =
  'mb-4 flex flex-wrap gap-1 rounded-[10px] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-1';

export const bentoSegmentTabActiveClass =
  'bg-[var(--ds-surface)] text-[var(--ds-text)] shadow-[var(--ds-card-shadow)] border border-[var(--ds-border-subtle)]';

export const bentoSegmentTabIdleClass =
  'border border-transparent text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]';

export const dashboardCanvasClass = `${bentoPageStackClass} space-y-5 pb-8`;

export const bentoPageTitleClass =
  'text-xl font-semibold tracking-tight text-[var(--ds-text)] md:text-2xl';

export const bentoPageDescriptionClass =
  'text-[13px] leading-relaxed text-[var(--ds-text-muted)] md:text-sm';

export const bentoChipClass =
  'inline-flex items-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ds-text-secondary)]';

export const bentoCardClass =
  'relative overflow-hidden rounded-[20px] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-5 shadow-[var(--ds-card-shadow)] transition-[border-color,box-shadow] duration-200 hover:border-[var(--ds-border-hover)] hover:shadow-[var(--ds-card-shadow-hover)] md:p-6 lg:rounded-[22px]';

export const bentoToolbarClass = `${bentoCardClass} !p-4 md:!p-5`;

export const bentoTableShellClass = `${bentoCardClass} overflow-hidden !p-0`;

export const bentoTableClass = 'w-full text-left text-[13px]';

export const bentoTableHeadCellClass = 'px-3 py-3 font-semibold';

export const bentoTableHeadRowClass =
  'border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]';

export const bentoTableBodyRowClass =
  'border-b border-[var(--ds-border-subtle)] last:border-0 transition-colors duration-200 hover:bg-[#f8fafc]/80';

export const bentoTableCellClass = 'px-3 py-3.5 text-[var(--ds-text-secondary)]';

export const dashboardSuccessNoticeClass =
  'rounded-xl border border-[color-mix(in_srgb,var(--tpo-dash-accent-mint)_30%,var(--ds-border))] bg-[var(--tpo-dash-accent-mint-soft)] px-4 py-3 text-sm text-[#047857]';

export const dashboardMintBadgeClass =
  'inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--tpo-dash-accent-mint)_25%,var(--ds-border))] bg-[var(--tpo-dash-accent-mint-soft)] px-2 py-0.5 text-[11px] font-medium text-[#047857]';

export const bentoTabActiveClass =
  'bg-[var(--ds-surface-muted)] text-[var(--ds-text)] border border-[var(--ds-border)] shadow-[var(--ds-card-shadow)]';

export const bentoTabIdleClass =
  'text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]';

export const bentoCardMutedClass =
  'relative overflow-hidden rounded-[16px] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-4 transition-[border-color,box-shadow] duration-200 md:rounded-[18px]';

export const dashboardSectionTitleClass =
  'text-base font-semibold tracking-tight text-[var(--ds-text)]';

export const dashboardSectionSubtitleClass = 'mt-0.5 text-[13px] text-[var(--ds-text-muted)]';

export const dashboardMetricLabelClass = 'text-[13px] font-medium text-[var(--ds-text-muted)]';

export const dashboardMetricValueClass =
  'text-[32px] font-semibold leading-none tracking-tight text-[var(--ds-text)]';

export const dashboardMetricHintClass = 'text-[13px] text-[var(--ds-text-muted)]';

export const dashboardSkeletonClass = 'animate-pulse rounded-lg bg-[var(--ds-surface-muted)]';

export const dashboardPrimaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--tpo-dash-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-colors duration-200 hover:bg-[var(--tpo-dash-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tpo-dash-primary)]';

/** Dashboard-scoped errors — soft rose, not global coral. */
export const dashboardErrorNoticeClass =
  'rounded-xl border border-[color-mix(in_srgb,var(--tpo-dash-accent-rose)_35%,var(--ds-border))] bg-[var(--tpo-dash-accent-rose-soft)] px-4 py-3 text-sm text-[#9f1239]';

/** Pending / attention states in dashboard tables. */
export const dashboardPendingBadgeClass =
  'inline-flex items-center rounded-md border border-[color-mix(in_srgb,var(--tpo-dash-accent-amber)_25%,var(--ds-border))] bg-[var(--tpo-dash-accent-amber-soft)] px-2 py-0.5 text-[11px] font-medium text-[#b45309]';

export const dashboardRoseBadgeClass =
  'inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--tpo-dash-accent-rose)_35%,var(--ds-border))] bg-[var(--tpo-dash-accent-rose-soft)] px-2 py-0.5 text-[11px] font-medium text-[#9f1239]';

export const dashboardPillClass =
  'inline-flex items-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ds-text-secondary)]';

export const dashboardStatusNeutralClass =
  'inline-flex items-center rounded-md border border-[#dbeafe] bg-[#f0f7ff] px-2 py-0.5 text-[11px] font-medium text-[#1e40af]';

export const dashboardQuickActionHoverClass =
  'group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors duration-200 hover:bg-[#f8fafc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)]';

export type DashboardAccentKey = 'blue' | 'mint' | 'lavender' | 'amber';

/** Home KPI cards — subtle per-metric surface tints (`.tpo-dashboard` tokens). */
export const dashboardMetricAccentStyles: Record<
  DashboardAccentKey,
  { iconWrap: string; cardSurface: string }
> = {
  blue: {
    iconWrap: 'bg-[var(--tpo-dash-kpi-blue-icon,#eaf3ff)] text-[var(--tpo-dash-accent-blue)]',
    cardSurface: 'bg-[var(--tpo-dash-kpi-blue-surface,#f8fbff)]',
  },
  mint: {
    iconWrap: 'bg-[var(--tpo-dash-kpi-mint-icon,#e8f8f3)] text-[var(--tpo-dash-accent-mint)]',
    cardSurface: 'bg-[var(--tpo-dash-kpi-mint-surface,#f7fcfa)]',
  },
  lavender: {
    iconWrap:
      'bg-[var(--tpo-dash-kpi-lavender-icon,#f0ecff)] text-[var(--tpo-dash-accent-lavender)]',
    cardSurface: 'bg-[var(--tpo-dash-kpi-lavender-surface,#faf9ff)]',
  },
  amber: {
    iconWrap: 'bg-[var(--tpo-dash-kpi-amber-icon,#fff2dd)] text-[var(--tpo-dash-accent-amber)]',
    cardSurface: 'bg-[var(--tpo-dash-kpi-amber-surface,#fffbf5)]',
  },
};

export const dashboardAccentStyles: Record<
  DashboardAccentKey,
  { iconWrap: string; cardWash: string }
> = {
  blue: {
    iconWrap: 'bg-[var(--tpo-dash-accent-blue-soft)] text-[var(--tpo-dash-accent-blue)]',
    cardWash:
      "before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-gradient-to-br before:from-[var(--tpo-dash-accent-blue-soft)]/50 before:to-transparent before:opacity-40",
  },
  mint: {
    iconWrap: 'bg-[var(--tpo-dash-accent-mint-soft)] text-[var(--tpo-dash-accent-mint)]',
    cardWash:
      "before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-gradient-to-br before:from-[var(--tpo-dash-accent-mint-soft)]/50 before:to-transparent before:opacity-40",
  },
  lavender: {
    iconWrap: 'bg-[var(--tpo-dash-accent-lavender-soft)] text-[var(--tpo-dash-accent-lavender)]',
    cardWash:
      "before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-gradient-to-br before:from-[var(--tpo-dash-accent-lavender-soft)]/50 before:to-transparent before:opacity-40",
  },
  amber: {
    iconWrap: 'bg-[var(--tpo-dash-accent-amber-soft)] text-[var(--tpo-dash-accent-amber)]',
    cardWash:
      "before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-gradient-to-br before:from-[var(--tpo-dash-accent-amber-soft)]/50 before:to-transparent before:opacity-40",
  },
};

/** Home dashboard table status chips (semantic tokens on `.tpo-dashboard` only). */
export const dashboardHomePendingBadgeClass =
  'inline-flex items-center rounded-md border border-[var(--tpo-dash-status-pending-border,#f4d9a3)] bg-[var(--tpo-dash-status-pending-bg,#fff8e8)] px-2 py-0.5 text-[11px] font-medium text-[var(--tpo-dash-status-pending-text,#b7791f)]';

export const dashboardHomeEvalBadgeClass =
  'inline-flex items-center rounded-md border border-[var(--tpo-dash-status-eval-border,#d6e5fa)] bg-[var(--tpo-dash-status-eval-bg,#eef5ff)] px-2 py-0.5 text-[11px] font-medium text-[var(--tpo-dash-status-eval-text,#3568b8)]';

export const dashboardHomeSuccessBadgeClass =
  'inline-flex items-center rounded-md border border-[var(--tpo-dash-status-success-border,#cbede3)] bg-[var(--tpo-dash-status-success-bg,#ecf8f4)] px-2 py-0.5 text-[11px] font-medium text-[var(--tpo-dash-status-success-text,#258b72)]';

export const dashboardHomeTableRowClass =
  'border-b border-[var(--tpo-dash-table-border,var(--ds-border-subtle))] last:border-0 transition-colors duration-200 hover:bg-[var(--tpo-dash-table-row-hover)]';

export const dashboardHomeEmptySurfaceClass =
  'rounded-[18px] border border-dashed border-[var(--tpo-dash-empty-border,#e2e8f0)] bg-[var(--tpo-dash-empty-bg,#f8fafc)]';

export const domainAccentStyles: Record<
  DashboardAccentKey,
  { iconWrap: string; nestedWash: string }
> = {
  blue: {
    iconWrap: 'bg-[var(--tpo-dash-accent-blue-soft)] text-[var(--tpo-dash-accent-blue)]',
    nestedWash:
      "before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-gradient-to-br before:from-[var(--tpo-dash-accent-blue-soft)]/35 before:to-transparent",
  },
  mint: {
    iconWrap: 'bg-[var(--tpo-dash-accent-mint-soft)] text-[var(--tpo-dash-accent-mint)]',
    nestedWash:
      "before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-gradient-to-br before:from-[var(--tpo-dash-accent-mint-soft)]/35 before:to-transparent",
  },
  lavender: {
    iconWrap: 'bg-[var(--tpo-dash-accent-lavender-soft)] text-[var(--tpo-dash-accent-lavender)]',
    nestedWash:
      "before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-gradient-to-br before:from-[var(--tpo-dash-accent-lavender-soft)]/35 before:to-transparent",
  },
  amber: {
    iconWrap: 'bg-[var(--tpo-dash-accent-amber-soft)] text-[var(--tpo-dash-accent-amber)]',
    nestedWash:
      "before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-gradient-to-br before:from-[var(--tpo-dash-accent-amber-soft)]/35 before:to-transparent",
  },
};

export const DOMAIN_CARD_ACCENTS: DashboardAccentKey[] = ['blue', 'lavender', 'mint'];
