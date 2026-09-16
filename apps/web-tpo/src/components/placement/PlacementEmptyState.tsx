import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PlacementEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  /** `compact` fits inside a kanban column or card; `page` fills a section. */
  size?: 'page' | 'compact';
}

export function PlacementEmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'page',
}: PlacementEmptyStateProps) {
  const compact = size === 'compact';

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] text-center ${
        compact ? 'flex-1 px-3 py-6' : 'px-6 py-12'
      }`}
    >
      <Icon
        className={`${compact ? 'h-5 w-5' : 'h-7 w-7'} stroke-[1.5] text-[var(--ds-empty-icon)]`}
        aria-hidden="true"
      />
      <p
        className={`mt-3 font-semibold text-[var(--ds-text)] ${compact ? 'text-xs' : 'text-[15px]'}`}
      >
        {title}
      </p>
      <p
        className={`mt-1 max-w-[380px] leading-relaxed text-[var(--ds-text-muted)] ${
          compact ? 'text-[11px]' : 'text-sm'
        }`}
      >
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
