'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { PrimaryButton } from '../wizard-ui';

const LOADING_MESSAGES = [
  'Creating your profile…',
  'Curating your experience…',
  'Mapping your skills…',
  'Almost there…',
];

const MESSAGE_INTERVAL_MS = 850;
const MIN_LOADING_MS = LOADING_MESSAGES.length * MESSAGE_INTERVAL_MS;

type Phase = 'loading' | 'welcome' | 'exiting';

/**
 * The finale of onboarding: a short, theatrical "setting things up" beat
 * (nothing is actually loading at this point — the server call already
 * succeeded — but a beat of anticipation reads as more finished than an
 * instant jump-cut to the dashboard), a welcome moment, then the whole
 * wizard slides up and away to reveal the dashboard underneath.
 */
export default function CompletionSequence({
  firstName,
  onFinished,
}: {
  firstName: string;
  onFinished: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, MESSAGE_INTERVAL_MS);
    const advance = setTimeout(() => setPhase('welcome'), MIN_LOADING_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(advance);
    };
  }, []);

  const handleContinue = () => setPhase('exiting');

  return (
    <motion.div
      animate={phase === 'exiting' ? { y: '-100vh', opacity: 0 } : { y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
      onAnimationComplete={() => {
        if (phase === 'exiting') onFinished();
      }}
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
    >
      <AnimatePresence mode="wait">
        {phase === 'loading' ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-8 h-14 w-14">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#00fad0]/20" />
              <span className="absolute inset-0 rounded-full border-2 border-zinc-800" />
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#00fad0]" />
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-lg font-medium text-zinc-300"
              >
                {LOADING_MESSAGES[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
              className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10"
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 14 }}
                className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#00fad0] text-zinc-950 shadow-lg shadow-[#00fad0]/30"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </motion.span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-2 text-3xl font-bold text-white md:text-4xl"
            >
              Welcome{firstName ? `, ${firstName}` : ''}!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mb-8 max-w-sm text-zinc-400"
            >
              Your profile is ready and we&apos;re already matching you with opportunities.
              Let&apos;s take a quick look at where everything lives.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <PrimaryButton onClick={handleContinue}>Go to dashboard</PrimaryButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
