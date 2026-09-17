'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Code2, CheckCircle2, Database, Cpu } from 'lucide-react';
import { api } from '@/lib/api';
import { BackButton, ErrorBanner, PrimaryButton, StepHeading } from '../wizard-ui';

interface StreamStepProps {
  onBack: () => void;
  onContinue: () => void;
}

export default function StreamStep({ onBack, onContinue }: StreamStepProps) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'confirmed' | 'error'>('idle');

  const confirm = async () => {
    setStatus('saving');
    try {
      await api.auth.enrollTrack({ trackCode: 'TECH_FULLSTACK' });
      setStatus('confirmed');
      window.setTimeout(onContinue, 700);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div>
      <StepHeading
        title="Choose your stream"
        subtitle="Select your specialization stream to tailor your skill assessments and roadmap."
      />

      <AnimatePresence>
        {status === 'error' ? (
          <ErrorBanner>Could not save your stream. Try again.</ErrorBanner>
        ) : null}
      </AnimatePresence>

      {status === 'confirmed' ? (
        <motion.div
          key="confirmed"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-14 text-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
          </motion.div>
          <p className="text-lg font-semibold text-foreground">
            You&apos;re set up for Software Engineering / SDE
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Active SDE Card */}
          <motion.div
            key="picker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border-2 border-accent bg-accent/10 p-5 flex items-center justify-between gap-4 cursor-pointer shadow-lg shadow-accent/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                <Code2 className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-foreground">
                    Software Engineering / SDE
                  </p>
                  <span className="rounded-full bg-accent/20 border border-accent/30 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                    Active
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Core CS fundamentals, full-stack development, algorithms, system design, and
                  testing.
                </p>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
          </motion.div>

          {/* DataOps Coming Soon Card */}
          <div className="rounded-2xl border border-border bg-muted/50 p-5 flex items-center justify-between gap-4 opacity-50 cursor-not-allowed select-none">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Database className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-muted-foreground">DataOps</p>
                  <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Coming Soon
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Data pipelines, ETL workflows, data warehousing, and infrastructure automation.
                </p>
              </div>
            </div>
          </div>

          {/* AIML Coming Soon Card */}
          <div className="rounded-2xl border border-border bg-muted/50 p-5 flex items-center justify-between gap-4 opacity-50 cursor-not-allowed select-none">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Cpu className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-muted-foreground">AIML</p>
                  <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Coming Soon
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Machine learning model development, deep learning, LLM fine-tuning, and MLOps.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {status !== 'confirmed' ? (
        <div className="mt-10 flex justify-between">
          <BackButton onClick={onBack} />
          <PrimaryButton onClick={() => void confirm()} loading={status === 'saving'}>
            Continue
          </PrimaryButton>
        </div>
      ) : null}
    </div>
  );
}
