'use client';

import type { ReactNode } from 'react';

export const fieldClass =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white';

export const primaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950';

export function SettingsCard({
  title,
  description,
  children,
  tone = 'default',
}: {
  title: string;
  description: string;
  children: ReactNode;
  tone?: 'default' | 'danger';
}) {
  return (
    <section
      className={`rounded-xl border bg-white p-6 shadow-2xs dark:bg-[#161616] ${
        tone === 'danger'
          ? 'border-rose-200 dark:border-rose-900'
          : 'border-zinc-200/80 dark:border-zinc-800'
      }`}
    >
      <h2 className="font-heading text-base font-bold text-zinc-950 dark:text-white">{title}</h2>
      <p className="mt-1 mb-4 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      {children}
    </section>
  );
}

export function StatusMessage({
  kind,
  children,
}: {
  kind: 'error' | 'success';
  children: ReactNode;
}) {
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={`mt-3 text-xs font-medium ${
        kind === 'error'
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-emerald-600 dark:text-emerald-400'
      }`}
    >
      {children}
    </p>
  );
}
