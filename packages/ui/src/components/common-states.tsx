import type { ComponentType, ReactNode } from 'react';
import { ShieldAlert, AlertTriangle, Inbox, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading details…', className = '' }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <Loader2 className="size-8 animate-spin text-[var(--ds-primary)]" aria-hidden />
      <p className="mt-3 text-xs font-medium text-[var(--ds-text-muted)]">{message}</p>
    </div>
  );
}

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-8 text-center ${className}`}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--ds-surface)] text-[var(--ds-text-subtle)] shadow-xs">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-[var(--ds-text)]">{title}</h3>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--ds-text-muted)]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string | Error;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  const errorMessage =
    typeof message === 'string' ? message : message.message || 'An unexpected error occurred.';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-900/50 dark:bg-red-950/20 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1">
          <h3 className="text-xs font-semibold text-red-900 dark:text-red-200">{title}</h3>
          <p className="mt-1 text-xs text-red-700 dark:text-red-300 leading-relaxed">
            {errorMessage}
          </p>
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

export interface SuccessStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function SuccessState({ title, description, action, className = '' }: SuccessStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20 ${className}`}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 shadow-xs">
        <CheckCircle2 className="size-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-emerald-900 dark:text-emerald-200">{title}</h3>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export interface UnauthorizedStateProps {
  title?: string;
  description?: string;
  returnUrl?: string;
  className?: string;
}

export function UnauthorizedState({
  title = 'Access Restricted',
  description = 'You do not have permission to view this portal module. Please sign in with an authorized account or switch to your assigned portal.',
  returnUrl = '/',
  className = '',
}: UnauthorizedStateProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={`flex flex-col items-center justify-center min-h-[60vh] p-6 text-center ${className}`}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
        <ShieldAlert className="size-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-[var(--ds-text)]">{title}</h2>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-[var(--ds-text-muted)]">
        {description}
      </p>
      <a
        href={returnUrl}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--ds-primary)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[var(--ds-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
      >
        Return to Home
      </a>
    </div>
  );
}

export interface AsyncStateContainerProps {
  loading?: boolean;
  error?: string | Error | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AsyncStateContainer({
  loading = false,
  error = null,
  isEmpty = false,
  onRetry,
  loadingMessage,
  emptyTitle = 'No Records Found',
  emptyDescription = 'There are no items matching the requested workflow.',
  emptyAction,
  children,
  className = '',
}: AsyncStateContainerProps) {
  if (loading) {
    return <LoadingState message={loadingMessage} className={className} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} className={className} />;
  }

  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return <>{children}</>;
}
