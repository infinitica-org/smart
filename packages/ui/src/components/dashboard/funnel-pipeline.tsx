'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { MagicCard } from '../magic/magic-card';
import { ShineBorder } from '../magic/shine-border';
import { NumberTicker } from '../magic/number-ticker';
import { cn } from '../../lib/cn';

export interface FunnelStep {
  id: string;
  label: string;
  value: number;
  icon: LucideIcon;
  shine?: boolean;
}

export function FunnelPipeline({
  title = 'Pipeline',
  steps,
}: {
  title?: string;
  steps: FunnelStep[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.id} className="flex items-stretch gap-2">
              <MagicCard className="relative flex-1 rounded-2xl">
                {step.shine ? (
                  <ShineBorder shineColor={['#00fad0', '#004c63', '#00fad0']} duration={10} />
                ) : null}
                <div className="flex items-center gap-3 p-4">
                  <div className="flex size-9 items-center justify-center rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] text-brand-500">
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">{step.label}</p>
                    <p className="text-xl font-heading font-extrabold tabular-nums">
                      <NumberTicker value={step.value} />
                    </p>
                  </div>
                </div>
              </MagicCard>
              {index < steps.length - 1 ? (
                <ChevronRight
                  className="hidden size-4 self-center text-[var(--text-muted)] xl:block"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function ProgressList({
  title,
  items,
  action,
}: {
  title: string;
  items: { id: string; label: string; value: number; max?: number }[];
  action?: ReactNode;
}) {
  return (
    <MagicCard className="h-full rounded-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--surface-border)] px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <ul className="space-y-4 p-5">
        {items.length === 0 ? (
          <li className="text-sm text-[var(--text-muted)]">Nothing to show yet.</li>
        ) : (
          items.map((item) => {
            const max = item.max && item.max > 0 ? item.max : Math.max(item.value, 1);
            const pct = Math.min(100, Math.round((item.value / max) * 100));
            return (
              <li key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="tabular-nums text-[var(--text-muted)]">{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className={cn('h-full rounded-full bg-brand-500')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })
        )}
      </ul>
    </MagicCard>
  );
}
