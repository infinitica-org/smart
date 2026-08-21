import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONE: Record<AlertTone, string> = {
  info: 'border-info/40 bg-info/10 text-[var(--text-primary)]',
  success: 'border-success/40 bg-success/10',
  warning: 'border-warning/40 bg-warning/10',
  danger: 'border-danger/40 bg-danger/10',
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  title?: string;
}

export function Alert({ tone = 'info', title, className, children, ...props }: AlertProps) {
  return (
    <div
      role="status"
      className={cn('rounded-lg border px-4 py-3 text-sm', TONE[tone], className)}
      {...props}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}
