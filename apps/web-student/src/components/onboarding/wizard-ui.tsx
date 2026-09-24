'use client';

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import textLogo from '@smart/ui/assets/images/Logos/WebP/Text-logo.png';

/** Light-themed primitives for the candidate onboarding wizard. */

export function StepHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-4 sm:mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1.5">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { className = '', invalid, ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full h-11 rounded-[11px] border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-150 focus:outline-none ${
        invalid
          ? 'border-rose-500 ring-2 ring-rose-500/20'
          : 'border-border focus:border-black focus:ring-2 focus:ring-black/10 dark:focus:border-white dark:focus:ring-white/10'
      } ${className}`}
    />
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4 rounded-[11px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
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
          ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black font-semibold'
          : 'border-border text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
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
      className={`inline-flex items-center justify-center gap-2 rounded-[11px] bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 px-6 py-3 text-sm font-semibold text-white dark:text-black shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
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
      className={`inline-flex items-center justify-center gap-2 rounded-[11px] border border-border bg-card px-5 py-3 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98] ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {children ?? 'Back'}
    </button>
  );
}

export const WIZARD_STEP_META = [
  { id: 'phone', label: 'Phone & OTP' },
  { id: 'school', label: 'Connect School' },
  { id: 'profile', label: 'Basic Profile' },
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
              backgroundColor: done || active ? '#000000' : '#e4e2dd',
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-2 rounded-full"
          />
        );
      })}
    </div>
  );
}

export const stepMotionProps = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
};

export function WizardPage({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh max-h-dvh w-full bg-white text-[#111827] font-sans flex flex-col justify-between overflow-y-auto px-6 py-4 sm:px-12 sm:py-6">
      {/* Top Header Logo */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between shrink-0 mb-2 sm:mb-4">
        <div className="flex items-center gap-3">
          <Image
            src={textLogo}
            alt="SMART"
            width={110}
            height={30}
            className="h-7 sm:h-8 w-auto object-contain"
            priority
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-[460px] mx-auto my-auto flex flex-col py-2 shrink-0">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto mt-2 sm:mt-4 text-left shrink-0">
        <span className="text-xs text-[#9ca3af]">© 2026 All Rights Reserved</span>
      </footer>
    </div>
  );
}
