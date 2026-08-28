import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface AnswerOptionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  selected?: boolean;
}

export function AnswerOption({ label, selected, className, ...props }: AnswerOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={cn(
        'flex w-full items-center gap-3 rounded-md border p-4 text-left transition-colors',
        'hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2',
        selected
          ? 'border-brand-600 bg-brand-50 text-brand-800'
          : 'border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-primary)]',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full border',
          selected ? 'border-brand-600' : 'border-[var(--surface-border)]',
        )}
      >
        {selected && <div className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
      </div>
      <span className="flex-1 font-medium">{label}</span>
    </button>
  );
}
