import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className, ...props },
  ref,
) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={inputId}>
      {label ? <span className="font-medium">{label}</span> : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-10 rounded-lg border bg-transparent px-3 text-sm',
          'border-[var(--surface-border)] placeholder:text-[var(--text-muted)]',
          error && 'border-danger',
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <span id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
});
