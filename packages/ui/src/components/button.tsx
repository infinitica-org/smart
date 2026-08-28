'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Button.
 *
 * Owner: Satheswaran V.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Disables the button and shows a spinner.
   *
   * Separate from `disabled` on purpose: a submit button that stays clickable
   * while a request is in flight produces duplicate attempts, and in an
   * assessment a duplicate submit is a support ticket about a lost answer.
   */
  isLoading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-ink hover:bg-brand-400 active:bg-brand-300',
  secondary: 'bg-brand-700 text-paper hover:bg-brand-800 active:bg-brand-900',
  outline: 'border border-[var(--surface-border)] bg-transparent hover:bg-[var(--surface-muted)]',
  ghost: 'bg-transparent hover:bg-[var(--surface-muted)]',
  danger: 'bg-danger text-white hover:opacity-90 active:opacity-80',
};

const SIZES: Record<ButtonSize, string> = {
  // Minimum 40px tall on md: candidates take L1 on phones, and a 32px target
  // under a 30-minute timer is how answers get mis-tapped.
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled === true || isLoading}
      // Screen readers otherwise announce nothing when the label is replaced by
      // a spinner, leaving the user unsure whether their click registered.
      aria-busy={isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
});
