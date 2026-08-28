import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface ProgressIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total, className, ...props }: ProgressIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]',
        className,
      )}
      {...props}
    >
      <span>
        Question {current} of {total}
      </span>
    </div>
  );
}
