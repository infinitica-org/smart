import type { ReactNode } from 'react';
import {
  bentoCardClass,
  bentoPageDescriptionClass,
  bentoPageTitleClass,
} from '../../lib/tpo-dashboard-ui';
import { mutedTextClass } from '../../lib/tpo-ui';

interface PlacementPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Right-aligned controls (opening selector, refresh, primary action). */
  actions?: ReactNode;
}

export function PlacementPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PlacementPageHeaderProps) {
  return (
    <header
      className={`${bentoCardClass} space-y-3 lg:flex lg:items-end lg:justify-between lg:gap-6`}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <p className={`text-[12px] font-medium uppercase tracking-[0.14em] ${mutedTextClass}`}>
          {eyebrow}
        </p>
        <h1 className={bentoPageTitleClass}>{title}</h1>
        <p className={bentoPageDescriptionClass}>{description}</p>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3 lg:pb-1">{actions}</div>
      ) : null}
    </header>
  );
}
