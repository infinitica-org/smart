'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { AlertTriangle, ShieldAlert, AlertCircle } from 'lucide-react';
import { cn } from '../lib/cn';
import { Modal } from './modal';
import { Button } from './button';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'primary';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
  error?: string | Error | null;
  className?: string;
}

const VARIANT_ICONS: Record<ConfirmDialogVariant, typeof AlertTriangle> = {
  danger: AlertTriangle,
  warning: AlertCircle,
  primary: ShieldAlert,
};

const BADGE_CLASSES: Record<ConfirmDialogVariant, string> = {
  danger: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
  primary: 'bg-[var(--ds-primary-soft)] text-[var(--ds-primary)]',
};

const BUTTON_VARIANTS: Record<ConfirmDialogVariant, 'danger' | 'primary'> = {
  danger: 'danger',
  warning: 'primary',
  primary: 'primary',
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  error = null,
  className,
}: ConfirmDialogProps) {
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const Icon = VARIANT_ICONS[variant];
  const isSubmitting = isLoading || internalSubmitting;
  const defaultConfirmText = variant === 'danger' ? 'Delete' : 'Confirm';
  const errorMessage = typeof error === 'string' ? error : error?.message;

  useEffect(() => {
    if (!open) {
      setInternalSubmitting(false);
    }
  }, [open]);

  const handleConfirmClick = async () => {
    if (isSubmitting) return;
    try {
      setInternalSubmitting(true);
      await onConfirm();
    } catch {
      // Error passed via prop or caught upstream
    } finally {
      setInternalSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={isSubmitting ? () => {} : onClose} size="sm" className={className}>
      <div
        className="flex flex-col items-center text-center p-2"
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        <div
          className={cn(
            'flex size-12 items-center justify-center rounded-2xl mb-4',
            BADGE_CLASSES[variant],
          )}
        >
          <Icon className="size-6" aria-hidden />
        </div>

        <h3
          id="confirm-dialog-title"
          className="text-base font-semibold tracking-tight text-[var(--ds-text)]"
        >
          {title}
        </h3>

        <div
          id="confirm-dialog-desc"
          className="mt-2 text-xs text-[var(--ds-text-muted)] leading-relaxed"
        >
          {description}
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 flex w-full items-center justify-end gap-3 pt-3 border-t border-[var(--ds-border-subtle)]">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-1/2"
          >
            {cancelText}
          </Button>

          <Button
            variant={BUTTON_VARIANTS[variant]}
            size="sm"
            onClick={handleConfirmClick}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-1/2"
          >
            {confirmText || defaultConfirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
