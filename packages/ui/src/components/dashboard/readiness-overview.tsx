'use client';

import type { ReactNode } from 'react';
import { MagicCard } from '../magic/magic-card';
import { AnimatedCircularProgressBar } from '../magic/animated-circular-progress-bar';

export interface RingLegendItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

export function ReadinessOverview({
  title,
  percent,
  centerLabel = 'Ready',
  legend,
}: {
  title: string;
  percent: number;
  centerLabel?: string;
  legend: RingLegendItem[];
}) {
  return (
    <MagicCard className="h-full rounded-2xl">
      <div className="border-b border-[var(--surface-border)] px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="flex flex-col items-center gap-6 p-5 md:flex-row">
        <AnimatedCircularProgressBar value={percent} label={centerLabel} className="size-36" />
        <ul className="w-full space-y-3 text-sm">
          {legend.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: item.color }} />
                {item.label}
              </span>
              <span className="tabular-nums text-[var(--text-muted)]">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </MagicCard>
  );
}

export function DashboardPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <MagicCard className="h-full rounded-2xl">
      <div className="border-b border-[var(--surface-border)] px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </MagicCard>
  );
}
