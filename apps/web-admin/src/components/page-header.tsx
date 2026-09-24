import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@smart/ui';

export type IconTone = 'accent' | 'teal' | 'inverse' | 'muted';

export function IconWell({
  icon: Icon,
  tone = 'accent',
  className,
}: {
  icon: LucideIcon;
  tone?: IconTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-100/90 text-zinc-900 shadow-2xs dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100',
        tone === 'inverse' &&
          'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950',
        tone === 'muted' &&
          'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
        className,
      )}
    >
      <Icon className="size-4.5" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

export function PageHeader({
  title,
  description,
  icon,
  tone = 'accent',
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: IconTone;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
      <div className="flex items-start gap-3">
        {icon ? <IconWell icon={icon} tone={tone} /> : null}
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 dark:text-white md:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
