'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { NumberTicker } from '@smart/ui';
import { AnimatedCircularProgressBar } from '@smart/ui';
import { cn } from '@smart/ui';
import { IconWell, type IconTone } from './page-header';

export function KpiTile({
  label,
  value,
  hint,
  icon,
  tone = 'muted',
}: {
  label: string;
  value: number;
  hint?: string;
  icon: LucideIcon;
  tone?: IconTone;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-start justify-between gap-3 rounded-2xl bg-card p-5 text-card-foreground"
    >
      <div className="space-y-2">
        <p className="text-sm text-card-foreground/70">{label}</p>
        <p className="font-heading text-4xl font-semibold tracking-tight">
          <NumberTicker value={value} className="text-card-foreground" />
        </p>
        {hint ? <p className="text-xs text-card-foreground/70">{hint}</p> : null}
      </div>
      <IconWell icon={icon} tone={tone} />
    </motion.article>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex h-full flex-col rounded-2xl bg-card text-card-foreground', className)}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-card-foreground/70">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="flex-1 p-5">{children}</div>
    </motion.section>
  );
}

export function TenantMix({
  percent,
  legend,
}: {
  percent: number;
  legend: { id: string; label: string; value: number; color: string }[];
}) {
  return (
    <Panel title="Tenant health" description="Active campuses versus held and off.">
      <div className="flex flex-col items-center gap-6 md:flex-row">
        <AnimatedCircularProgressBar
          value={percent}
          label="Active"
          className="size-36"
          gaugePrimaryColor="var(--brand-teal)"
          gaugeSecondaryColor="color-mix(in srgb, #ffffff 22%, var(--brand-teal))"
        />
        <ul className="w-full space-y-3 text-sm">
          {legend.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: item.color }} />
                {item.label}
              </span>
              <span className="tabular-nums text-card-foreground/70">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

export function PlanMix({
  items,
}: {
  items: { id: string; label: string; value: number; max?: number }[];
}) {
  return (
    <Panel title="Plan mix" description="How tenants sit across Free, Basic, Pro.">
      <ul className="space-y-4">
        {items.length === 0 ? (
          <li className="text-sm text-card-foreground/70">Nothing to show yet.</li>
        ) : (
          items.map((item) => {
            const max = item.max && item.max > 0 ? item.max : Math.max(item.value, 1);
            const pct = Math.min(100, Math.round((item.value / max) * 100));
            return (
              <li key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="tabular-nums text-card-foreground/70">{item.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-card-foreground/15">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })
        )}
      </ul>
    </Panel>
  );
}

export function OpsBoard({
  steps,
}: {
  steps: {
    id: string;
    label: string;
    value: number;
    hint: string;
    icon: LucideIcon;
    href: string;
  }[];
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-lg font-semibold tracking-tight">Operations board</h2>
      <ol className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.id}>
              <Link
                href={step.href}
                prefetch={false}
                className="flex h-full flex-col gap-4 rounded-2xl bg-card p-4 text-card-foreground transition-colors hover:bg-secondary"
              >
                <span className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="font-heading text-3xl font-semibold tabular-nums">
                    <NumberTicker value={step.value} className="text-card-foreground" />
                  </span>
                </span>
                <span>
                  <span className="block text-sm font-medium">{step.label}</span>
                  <span className="text-xs text-card-foreground/70">{step.hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
