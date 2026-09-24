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
  href,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: LucideIcon;
  tone?: IconTone;
  /** When set, the whole tile links out to a filtered operational view for this KPI. */
  href?: string;
}) {
  const content = (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'group flex h-full flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-4 text-zinc-900 shadow-2xs transition-all hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:border-zinc-700',
        href && 'cursor-pointer hover:-translate-y-0.5',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
        <IconWell icon={icon} tone={tone} />
      </div>
      <div className="mt-2 space-y-1">
        <p className="font-heading text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
          <NumberTicker value={value} className="text-zinc-950 dark:text-white" />
        </p>
        {hint ? (
          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
            {hint}
          </p>
        ) : null}
      </div>
    </motion.article>
  );

  if (!href) return content;

  return (
    <Link href={href} prefetch={false} className="block rounded-md">
      {content}
    </Link>
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'flex h-full flex-col rounded-md border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800/60">
        <div>
          <h2 className="font-heading text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
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
    <Panel
      title="Tenant Health"
      description="Active universities & organizations versus held/deactivated."
    >
      <div className="flex flex-col items-center gap-6 md:flex-row">
        <AnimatedCircularProgressBar
          value={percent}
          label="Active"
          className="size-32"
          gaugePrimaryColor="#10b981"
          gaugeSecondaryColor="#e2e8f0"
        />
        <ul className="w-full space-y-2.5 text-xs">
          {legend.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50/80 px-3 py-2 dark:bg-zinc-800/50"
            >
              <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                <span className="size-2 rounded-full" style={{ background: item.color }} />
                {item.label}
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {item.value}
              </span>
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
    <Panel title="Plan Distribution" description="Enterprise, Standard, and Free tier allocation.">
      <ul className="space-y-3">
        {items.length === 0 ? (
          <li className="text-xs text-zinc-500">Nothing to show yet.</li>
        ) : (
          items.map((item) => {
            const max = item.max && item.max > 0 ? item.max : Math.max(item.value, 1);
            const pct = Math.min(100, Math.round((item.value / max) * 100));
            return (
              <li
                key={item.id}
                className="space-y-1.5 rounded-lg bg-zinc-50/60 p-2.5 dark:bg-zinc-800/40"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {item.label}
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {item.value}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-700">
                  <div
                    className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
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
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Operational Queues
        </h2>
        <span className="text-[11px] font-medium text-zinc-400">Action Required</span>
      </div>
      <ol className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.id}>
              <Link
                href={step.href}
                prefetch={false}
                className="group flex h-full flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-zinc-700 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                    <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="font-heading text-2xl font-extrabold tabular-nums text-zinc-950 dark:text-white">
                    <NumberTicker value={step.value} className="text-zinc-950 dark:text-white" />
                  </span>
                </div>
                <div className="mt-3">
                  <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {step.label}
                  </span>
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    {step.hint}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
