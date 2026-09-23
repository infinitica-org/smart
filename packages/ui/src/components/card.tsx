import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type CardVariant = 'default' | 'highlighted' | 'bordered' | 'muted' | 'glass';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
}

const CARD_VARIANTS: Record<CardVariant, string> = {
  default:
    'border border-[var(--ds-border-subtle,var(--surface-border))] bg-[var(--ds-surface,var(--surface))] shadow-[var(--shadow-card,0_1px_3px_rgba(0,0,0,0.05))]',
  highlighted: 'border-2 border-[var(--ds-primary)] bg-[var(--ds-surface)] shadow-md',
  bordered: 'border-2 border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-none',
  muted: 'border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] shadow-none',
  glass:
    'border border-white/20 bg-white/70 backdrop-blur-md dark:border-slate-800/40 dark:bg-slate-900/70 shadow-lg',
};

export function Card({ variant = 'default', hoverable = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card,1rem)] p-6 transition-all duration-150',
        CARD_VARIANTS[variant],
        hoverable && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex flex-col gap-1', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'font-heading text-lg font-semibold tracking-tight text-[var(--ds-text,var(--text-primary))]',
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-[var(--ds-text-muted,var(--text-muted))]', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-6 flex items-center pt-4 border-t border-[var(--ds-border-subtle)]',
        className,
      )}
      {...props}
    />
  );
}
