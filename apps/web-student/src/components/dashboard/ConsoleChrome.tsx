import type { ReactNode } from 'react';
import type { AtsStage } from '@smart/contracts';
import { cn } from '@smart/ui';
import { ATS_PIPELINE_STAGES, ATS_STAGE_LABELS, stageReached } from '@/lib/my-applications';

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
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="font-display text-[2rem] leading-tight font-medium tracking-tight text-white md:text-[2.75rem]">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-sm leading-relaxed text-white/40">{subtitle}</p> : null}
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
  /** Inverted panel like Crextio task card */
  dark?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-[28px] border p-6 md:p-7',
        dark ? 'border-white/10 bg-[#0c0c0c]' : 'border-white/[0.07] bg-[#151515]',
        dashed && 'border-dashed border-white/15 bg-transparent',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Crextio-style metric pill with mini progress */
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
        'flex min-w-[140px] flex-1 flex-col gap-2 rounded-2xl border px-4 py-3',
        accent ? 'border-[#00fad0]/25 bg-[#00fad0]/[0.07]' : 'border-white/[0.07] bg-white/[0.02]',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] tracking-wide text-white/40 uppercase">{label}</span>
        <span
          className={cn(
            'text-lg font-semibold tabular-nums',
            accent ? 'text-[#00fad0]' : 'text-white',
          )}
        >
          {value}
        </span>
      </div>
      {percent != null ? (
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn('h-full rounded-full', accent ? 'bg-[#00fad0]' : 'bg-white/35')}
            style={{ width: `${width}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function AtsStageBar({
  stage,
  showLabels = true,
}: {
  stage: AtsStage;
  showLabels?: boolean;
}) {
  return (
    <div className="flex w-full gap-1.5">
      {ATS_PIPELINE_STAGES.map((column) => {
        const done = stageReached(stage, column);
        return (
          <div key={column} className="min-w-0 flex-1">
            <div className={cn('h-1.5 rounded-full', done ? 'bg-[#00fad0]' : 'bg-white/[0.08]')} />
            {showLabels ? (
              <p className="mt-2 hidden truncate text-[10px] text-white/30 sm:block">
                {ATS_STAGE_LABELS[column]}
              </p>
            ) : null}
          </div>
        );
      })}
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
      <h2 className="font-display text-xl text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/40">{body}</p>
      {action ? <div className="mt-7">{action}</div> : null}
    </Surface>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold tracking-[0.14em] text-white/35 uppercase">
      {children}
    </h2>
  );
}
