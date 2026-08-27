import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface AssessmentHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  rightSlot?: ReactNode;
}

export function AssessmentHeader({ title, rightSlot, className, ...props }: AssessmentHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface)] px-6 py-4',
        className,
      )}
      {...props}
    >
      <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h1>
      {rightSlot && <div>{rightSlot}</div>}
    </div>
  );
}
