'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Code2, CheckCircle2, Database, Cpu, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { CANDIDATE_STREAMS, DEFAULT_CANDIDATE_STREAM } from '@/lib/candidate-streams';
import { BackButton, ErrorBanner, PrimaryButton, StepHeading } from '../wizard-ui';

const STREAM_ICONS: Record<(typeof CANDIDATE_STREAMS)[number]['id'], LucideIcon> = {
  SOFTWARE_ENGINEERING: Code2,
  DATA_OPS: Database,
  AIML: Cpu,
};

interface StreamStepProps {
  onBack: () => void;
  onContinue: () => void;
}

export default function StreamStep({ onBack, onContinue }: StreamStepProps) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'confirmed' | 'error'>('idle');

  const confirm = async () => {
    setStatus('saving');
    try {
      await api.auth.enrollTrack({ trackCode: DEFAULT_CANDIDATE_STREAM.trackCode });
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
          className="flex flex-col items-center justify-center rounded-2xl border border-foreground/30 bg-muted/10 px-6 py-14 text-center"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <CheckCircle2 className="w-12 h-12 text-foreground mb-4" />
          </motion.div>
          <p className="text-lg font-semibold text-foreground">
            You&apos;re set up for {DEFAULT_CANDIDATE_STREAM.title}
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-4">
          {CANDIDATE_STREAMS.map((stream) => {
            const Icon = STREAM_ICONS[stream.id];
            if (stream.available) {
              return (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 border-foreground bg-foreground/10 p-5 shadow-lg shadow-foreground/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground/20">
                      <Icon className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-foreground">{stream.title}</p>
                        <span className="rounded-full border border-foreground/30 bg-foreground/20 px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                          Active
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{stream.description}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-foreground" />
                </motion.div>
              );
            }
            return (
              <div
                key={stream.id}
                className="flex select-none items-center justify-between gap-4 rounded-2xl border border-border bg-muted/50 p-5 opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-muted-foreground">
                        {stream.title}
                      </p>
                      <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Coming Soon
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{stream.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
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
