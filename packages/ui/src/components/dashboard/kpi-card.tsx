'use client';

import type { LucideIcon } from 'lucide-react';
import { MagicCard } from '../magic/magic-card';
import { NumberTicker } from '../magic/number-ticker';
import { BorderBeam } from '../magic/border-beam';
import { cn } from '../../lib/cn';

export interface KpiCardProps {
  label: string;
  value: number;
  hint?: string;
  trend?: string;
  icon: LucideIcon;
  iconClassName?: string;
  accent?: boolean;
}

export function KpiCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  iconClassName,
  accent = false,
}: KpiCardProps) {
  return (
    <MagicCard className="rounded-2xl">
      {accent ? <BorderBeam size={80} duration={8} borderWidth={1} /> : null}
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="space-y-2">
          <p className="text-sm text-[var(--text-muted)]">{label}</p>
          <p className="text-3xl font-heading font-extrabold tracking-tight">
            <NumberTicker value={value} />
          </p>
          {trend ? <p className="text-xs font-medium text-success">{trend}</p> : null}
          {hint && !trend ? <p className="text-xs text-[var(--text-muted)]">{hint}</p> : null}
        </div>
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10 text-brand-400',
            iconClassName,
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </MagicCard>
  );
}
