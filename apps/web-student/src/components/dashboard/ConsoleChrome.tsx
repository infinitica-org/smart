import type { ReactNode } from 'react';
import { cn } from '@smart/ui';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Surface({
  children,
  className,
  dashed,
  dark,
}: {
  children: ReactNode;
  className?: string;
  dashed?: boolean;
  /** Inverted panel */
  dark?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border p-6 md:p-7 shadow-sm transition-colors',
        dark ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900',
        dashed && 'border-dashed border-gray-300 bg-gray-50/50 shadow-none',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Metric pill with mini progress */
export function KpiPill({
  label,
  value,
  percent,
  accent,
}: {
  label: string;
  value: string | number;
  percent?: number;
  accent?: boolean;
}) {
  const width = Math.min(100, Math.max(0, percent ?? 0));
  return (
    <div
      className={cn(
        'flex min-w-[140px] flex-1 flex-col gap-2 rounded-xl border px-4 py-3',
        accent ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-200 bg-gray-50/50',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
          {label}
        </span>
        <span
          className={cn(
            'text-lg font-semibold tabular-nums',
            accent ? 'text-emerald-700' : 'text-gray-900',
          )}
        >
          {value}
        </span>
      </div>
      {percent != null ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn('h-full rounded-full', accent ? 'bg-emerald-600' : 'bg-gray-700')}
            style={{ width: `${width}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Surface dashed className="flex flex-col items-center px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-gray-500">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Surface>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold tracking-wider text-gray-400 uppercase">{children}</h2>
  );
}
