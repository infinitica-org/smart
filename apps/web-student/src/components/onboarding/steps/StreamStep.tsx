'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Code2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { BackButton, ErrorBanner, PrimaryButton, StepHeading } from '../wizard-ui';

interface StreamStepProps {
  onBack: () => void;
  onContinue: () => void;
}

/**
 * V1 ships a single stream — Software Engineering (Track `TECH_FULLSTACK`,
 * skill catalog `SOFTWARE_DEVELOPMENT`). This is a confirmation, not a real
 * picker, since there is nothing else to choose from yet.
 */
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
        subtitle="For now, Good Freshers focuses on one stream — more are coming soon."
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
            You&apos;re set up for Software Engineering
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="picker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border-2 border-gray-900 bg-gray-900/[0.02] p-6 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">Software Engineering</p>
            <p className="text-sm text-gray-500">
              Core CS fundamentals plus languages, frameworks, system design, testing, and
              deployment.
            </p>
          </div>
        </motion.div>
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
