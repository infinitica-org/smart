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
          className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-14 text-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
          </motion.div>
          <p className="text-lg font-semibold text-gray-900">
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
            className="rounded-2xl border-2 border-gray-900 bg-gray-900/[0.03] p-5 flex items-center justify-between gap-4 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-gray-900">
                    Software Engineering / SDE
                  </p>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Core CS fundamentals, full-stack development, algorithms, system design, and
                  testing.
                </p>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-gray-900 shrink-0" />
          </motion.div>

          {/* DataOps Coming Soon Card */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5 flex items-center justify-between gap-4 opacity-60 cursor-not-allowed select-none">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                <Database className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-gray-700">DataOps</p>
                  <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                    Coming Soon
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Data pipelines, ETL workflows, data warehousing, and infrastructure automation.
                </p>
              </div>
            </div>
          </div>

          {/* AIML Coming Soon Card */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5 flex items-center justify-between gap-4 opacity-60 cursor-not-allowed select-none">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
                <Cpu className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-gray-700">AIML</p>
                  <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                    Coming Soon
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
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
