import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  bentoCardClass,
  bentoPageDescriptionClass,
  bentoPageTitleClass,
  dashboardAccentStyles,
} from '../../lib/tpo-dashboard-ui';

type TpoBentoPageHeaderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  accent?: keyof typeof dashboardAccentStyles;
  /** Tighter padding and type scale for operational sub-pages. */
  compact?: boolean;
};

export function TpoBentoPageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  aside,
  accent = 'blue',
  compact = false,
}: TpoBentoPageHeaderProps) {
  const accentStyle = dashboardAccentStyles[accent];

  return (
    <header
      className={`${bentoCardClass} flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${
        compact ? '!p-4 md:!p-5' : ''
      }`}
    >
      <div className={`min-w-0 flex-1 ${compact ? 'space-y-1' : 'max-w-2xl space-y-2'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className={`${compact ? 'text-lg font-semibold tracking-tight text-[var(--ds-text)] md:text-xl' : bentoPageTitleClass} flex items-center gap-2`}
          >
            <span
              className={`flex shrink-0 items-center justify-center rounded-xl ${accentStyle.iconWrap} ${
                compact ? 'size-9 rounded-lg' : 'size-10 rounded-2xl'
              }`}
            >
              <Icon className={compact ? 'size-4' : 'size-[18px]'} strokeWidth={1.5} />
            </span>
            {title}
          </h1>
          {badge}
        </div>
        <p className={`${bentoPageDescriptionClass} ${compact ? '!text-[13px]' : ''}`}>
          {description}
        </p>
        {actions ? <div className="flex flex-wrap items-center gap-2 pt-0.5">{actions}</div> : null}
      </div>
      {aside ? <div className="shrink-0 md:pl-4">{aside}</div> : null}
    </header>
  );
}
