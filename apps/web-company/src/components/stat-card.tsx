import type { LucideIcon } from 'lucide-react';
import { card, iconWrap } from '../lib/ui';

/**
 * Server-safe on purpose: pages pass a lucide icon component as a prop, which cannot
 * cross a server -> client boundary, so this must not live in a 'use client' module.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent: 'blue' | 'mint' | 'lavender' | 'amber';
}) {
  return (
    <div className={`${card} flex items-center gap-4`}>
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${iconWrap[accent]}`}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tracking-tight text-[var(--ds-text)] sm:text-3xl">
          {value}
        </p>
        <p className="mt-0.5 text-sm font-medium text-[var(--ds-text-muted)]">{label}</p>
      </div>
    </div>
  );
}
