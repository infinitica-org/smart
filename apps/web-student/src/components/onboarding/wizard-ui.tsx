'use client';

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { SmartLogo } from '@smart/ui';

/** Light-themed primitives for the candidate onboarding wizard. */

export function StepHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl md:text-[34px] font-bold tracking-tight text-foreground mb-2">
        {title}
      </h1>
      {subtitle ? <p className="text-muted-foreground leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-foreground mb-1.5">
      {children} {required ? <span className="text-[#00fad0]">*</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { className = '', invalid, ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full bg-muted border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
        invalid
          ? 'border-rose-500 ring-1 ring-rose-500/30'
          : 'border-border focus:border-[#00fad0] focus:ring-1 focus:ring-[#00fad0]'
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
      className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700"
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
          ? 'border-[#00fad0] bg-[#00fad0]/20 text-[#00fad0]'
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
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#00fad0] hover:bg-[#7dffe6] px-7 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-[#00fad0]/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
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
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.98] ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {children ?? 'Back'}
    </button>
  );
}

export const WIZARD_STEP_META = [
  { id: 'domain', label: 'Interest' },
  { id: 'profile', label: 'Profile' },
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
              backgroundColor: done || active ? '#00fad0' : '#e4e2dd',
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
    <div className="min-h-[100dvh] w-full bg-background text-foreground font-sans flex flex-col items-center justify-start relative overflow-y-auto px-4 py-8 sm:py-12">
      {/* Subtle ambient background glow */}
      <div
        className="fixed inset-0 opacity-[0.35] pointer-events-none z-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, rgba(0,250,208,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Top Header Logo */}
      <header className="relative z-10 w-full max-w-2xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <SmartLogo tone="on-light" className="h-7 w-auto" />
          <span className="text-xs text-muted-foreground font-axiforma border-l border-border pl-3">
            Candidate onboarding
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-2xl flex flex-col">{children}</main>
    </div>
  );
}
