import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className, startIcon, endIcon, ...props },
  ref,
) {
  const defaultId = useId();
  const inputId = id ?? props.name ?? defaultId;

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {label ? (
        <label htmlFor={inputId} className="font-medium">
          {label}
        </label>
      ) : null}
      <div className="relative flex items-center w-full">
        {startIcon && (
          <div className="absolute left-3 text-[var(--text-muted)] pointer-events-none flex items-center justify-center">
            {startIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-transparent px-3 text-sm',
            'border-[var(--surface-border)] placeholder:text-[var(--text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50 focus:border-[var(--brand)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error &&
              'border-danger focus:ring-danger/50 focus:border-danger focus-visible:outline-danger',
            startIcon && 'pl-10',
            endIcon && 'pr-10',
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {endIcon && (
          <div className="absolute right-3 text-[var(--text-muted)] flex items-center justify-center">
            {endIcon}
          </div>
        )}
      </div>
      {error ? (
        <span id={`${inputId}-error`} role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
});
