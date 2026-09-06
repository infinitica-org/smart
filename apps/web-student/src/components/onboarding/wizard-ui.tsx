'use client';

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

/** Shared light-theme primitives for the rewritten candidate onboarding wizard. */

export function StepHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl md:text-[34px] font-bold tracking-tight text-gray-900 mb-2">
        {title}
      </h1>
      {subtitle ? <p className="text-gray-500 leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-gray-900 mb-1.5">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all ${className}`}
    />
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {children}
    </motion.div>
  );
}

export function PillToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
        active
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  loading,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
      {!loading && <ArrowRight className="h-4 w-4" />}
    </button>
  );
}

export function BackButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', children, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {children ?? 'Back'}
    </button>
  );
}

export const WIZARD_STEP_META = [
  { id: 'resume', label: 'Resume' },
  { id: 'profile', label: 'Profile' },
  { id: 'stream', label: 'Stream' },
  { id: 'skills', label: 'Skills' },
  { id: 'languages', label: 'Languages' },
  { id: 'social', label: 'Social' },
  { id: 'preferences', label: 'Preferences' },
] as const;

export type WizardStepId = (typeof WIZARD_STEP_META)[number]['id'];

export function ProgressDots({ current }: { current: WizardStepId }) {
  const currentIndex = WIZARD_STEP_META.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-2">
      {WIZARD_STEP_META.map((step, idx) => {
        const done = idx < currentIndex;
        const active = idx === currentIndex;
        return (
          <motion.span
            key={step.id}
            initial={false}
            animate={{
              width: active ? 22 : 8,
              backgroundColor: done || active ? '#0f172a' : '#e5e7eb',
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-2 rounded-full"
          />
        );
      })}
    </div>
  );
}

/**
 * Slide+fade-in for a `key`-ed step/tab container. Enter-only (no `exit`) —
 * `AnimatePresence` + a keyed swap looked right but its exit animation never
 * resolved in this app, permanently blocking the incoming step from mounting.
 * A plain keyed remount still animates the new content in via `initial`/`animate`.
 */
export const stepMotionProps = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
};

export function WizardPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-white">
      <div className="mx-auto w-full max-w-xl px-6 py-14">{children}</div>
    </div>
  );
}
