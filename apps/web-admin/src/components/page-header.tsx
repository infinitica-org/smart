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
        'flex size-9 shrink-0 items-center justify-center rounded-2xl',
        tone === 'accent' && 'bg-accent text-accent-foreground',
        tone === 'teal' && 'bg-secondary text-secondary-foreground',
        tone === 'inverse' && 'bg-foreground text-background',
        tone === 'muted' && 'bg-muted text-foreground',
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {icon ? <IconWell icon={icon} tone={tone} /> : null}
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
