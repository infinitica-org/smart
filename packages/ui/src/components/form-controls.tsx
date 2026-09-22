import type { HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/cn';

export interface FormItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function FormItem({ className, children, ...props }: FormItemProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...props}>
      {children}
    </div>
  );
}

export interface FormLabelProps extends HTMLAttributes<HTMLLabelElement> {
  htmlFor?: string;
  required?: boolean;
}

export function FormLabel({
  htmlFor,
  required = false,
  className,
  children,
  ...props
}: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-xs font-semibold text-[var(--ds-text)]', className)}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-1 text-red-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

export interface FormDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export function FormDescription({ className, children, ...props }: FormDescriptionProps) {
  return (
    <p
      className={cn('text-[11px] text-[var(--ds-text-muted)] leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export interface FormMessageProps extends HTMLAttributes<HTMLParagraphElement> {
  error?: string;
}

export function FormMessage({ error, className, children, ...props }: FormMessageProps) {
  const content = error || children;
  if (!content) return null;

  return (
    <p
      role="alert"
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 mt-1',
        className,
      )}
      {...props}
    >
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      <span>{content}</span>
    </p>
  );
}

export interface FormErrorSummaryProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  errors?: Record<string, string> | string[] | string | null;
  onRetry?: () => void;
}

export function FormErrorSummary({
  title = 'Please fix the following errors before submitting:',
  errors,
  onRetry,
  className,
  ...props
}: FormErrorSummaryProps) {
  if (!errors) return null;

  const errorList: { field?: string; message: string }[] = [];

  if (typeof errors === 'string') {
    errorList.push({ message: errors });
  } else if (Array.isArray(errors)) {
    errors.forEach((msg) => errorList.push({ message: msg }));
  } else if (typeof errors === 'object') {
    Object.entries(errors).forEach(([field, message]) => {
      if (message) errorList.push({ field, message });
    });
  }

  if (errorList.length === 0) return null;

  const handleFocusField = (fieldId?: string) => {
    if (!fieldId) return;
    const el = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
    if (el && 'focus' in el) {
      (el as HTMLElement).focus();
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs dark:border-red-900/50 dark:bg-red-950/30',
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1">
          <h4 className="font-semibold text-red-900 dark:text-red-200">{title}</h4>
          <ul className="mt-2 space-y-1 list-disc pl-4 text-red-700 dark:text-red-300 leading-relaxed">
            {errorList.map((err, index) => (
              <li key={err.field || index}>
                {err.field ? (
                  <button
                    type="button"
                    onClick={() => handleFocusField(err.field)}
                    className="font-medium underline hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  >
                    {err.message}
                  </button>
                ) : (
                  <span>{err.message}</span>
                )}
              </li>
            ))}
          </ul>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type ValidationRule =
  'required' | 'email' | 'minLength' | 'maxLength' | 'duplicate' | 'network';

export function formatFieldValidationError(
  fieldName: string,
  rule: ValidationRule,
  extraDetails?: { min?: number; max?: number; patternName?: string },
): string {
  switch (rule) {
    case 'required':
      return `${fieldName} is required. Please enter a value to continue.`;
    case 'email':
      return `Invalid ${fieldName.toLowerCase()} format. Please enter a valid email address (e.g., user@organization.edu).`;
    case 'minLength':
      return `${fieldName} must be at least ${extraDetails?.min || 8} characters long.`;
    case 'maxLength':
      return `${fieldName} cannot exceed ${extraDetails?.max || 255} characters.`;
    case 'duplicate':
      return `This ${fieldName.toLowerCase()} is already registered. Please enter a unique ${fieldName.toLowerCase()}.`;
    case 'network':
      return `Connection failed while saving ${fieldName.toLowerCase()}. Your entered information is preserved. Click 'Try again' to retry.`;
    default:
      return `Invalid ${fieldName.toLowerCase()}. Please check your input and try again.`;
  }
}

export interface FormSectionProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export function FormSection({
  title,
  description,
  className,
  children,
  ...props
}: FormSectionProps) {
  return (
    <div
      className={cn(
        'space-y-4 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-6',
        className,
      )}
      {...props}
    >
      {title || description ? (
        <div className="border-b border-[var(--ds-border-subtle)] pb-3">
          {title ? <h3 className="text-sm font-semibold text-[var(--ds-text)]">{title}</h3> : null}
          {description ? (
            <p className="mt-0.5 text-xs text-[var(--ds-text-muted)]">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
