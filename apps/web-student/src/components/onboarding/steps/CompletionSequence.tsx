'use client';

import { useEffect, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';

import { CheckCircle2, Lightbulb } from 'lucide-react';

import { PrimaryButton } from '../wizard-ui';

interface LoadingBeat {
  text: string;
  kind: 'status' | 'fact';
}

/**
 * A short status line reads as "working"; a fact reads as "here's something worth
 * knowing" — mixing them turns the theatrical pause into something with a little
 * value instead of just dead air. Facts get more screen time since they're meant
 * to actually be read, not skimmed.
 */
const LOADING_BEATS: LoadingBeat[] = [
  { text: 'Creating your profile…', kind: 'status' },
  { text: 'Curating your experience…', kind: 'status' },
  {
    text: 'Verified skills get noticed first — employers filter for the checkmark, not the claim.',
    kind: 'fact',
  },
  { text: 'Preparing your dashboard…', kind: 'status' },
  {
    text: 'Your public profile updates itself the moment something new gets verified — no need to resend your link.',
    kind: 'fact',
  },
  {
    text: 'A username is a one-time claim, so the handle you picked is yours for good.',
    kind: 'fact',
  },
  { text: 'Almost there…', kind: 'status' },
];

const STATUS_DURATION_MS = 750;
const FACT_DURATION_MS = 2100;

type Phase = 'loading' | 'welcome' | 'exiting';

/**
 * The finale of onboarding: a short, theatrical "setting things up" beat
 * (nothing is actually loading at this point — the server call already
 * succeeded — but a beat of anticipation reads as more finished than an
 * instant jump-cut to the dashboard) that doubles as a few quick tips, a
 * welcome moment, then the whole wizard slides up and away to reveal the
 * dashboard underneath.
 */
export default function CompletionSequence({
  firstName,
  onFinished,
}: {
  firstName: string;
  onFinished: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [beatIndex, setBeatIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let index = 0;

    const scheduleNext = () => {
      const beat = LOADING_BEATS[index];
      if (!beat) return;
      const duration = beat.kind === 'fact' ? FACT_DURATION_MS : STATUS_DURATION_MS;
      const timer = setTimeout(() => {
        if (cancelled) return;
        if (index < LOADING_BEATS.length - 1) {
          index += 1;
          setBeatIndex(index);
          scheduleNext();
        } else {
          setPhase('welcome');
        }
      }, duration);
      timers.push(timer);
    };

    const timers: ReturnType<typeof setTimeout>[] = [];
    scheduleNext();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  const handleContinue = () => setPhase('exiting');
  const beat = LOADING_BEATS[beatIndex];

  return (
    <motion.div
      animate={phase === 'exiting' ? { y: '-100vh', opacity: 0 } : { y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
      onAnimationComplete={() => {
        if (phase === 'exiting') onFinished();
      }}
      className="flex min-h-[80vh] flex-col items-center justify-center text-center"
    >
      <AnimatePresence mode="wait">
        {phase === 'loading' ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="flex flex-col items-center justify-center"
          >
            {/* Soft Circular Disc with Spinner */}
            <div className="mb-10 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100/90 dark:bg-zinc-800/80">
              <div className="h-12 w-12 rounded-full border-[2.5px] border-zinc-200/80 dark:border-zinc-700 border-t-black dark:border-t-white animate-spin" />
            </div>

            {/* Insight Text */}
            <div className="min-h-[80px] flex items-center justify-center max-w-lg px-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={beatIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="text-base sm:text-lg font-normal text-zinc-600 dark:text-zinc-300 leading-relaxed text-center"
                >
                  {beat?.kind === 'fact' ? (
                    <span className="inline-flex items-center justify-center flex-wrap gap-x-2">
                      <Lightbulb className="inline-block h-4 w-4 shrink-0 text-zinc-900 dark:text-zinc-100 align-middle" />
                      <span>{beat.text}</span>
                    </span>
                  ) : (
                    <span>{beat?.text}</span>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination / Progress Dots */}
            <div className="mt-10 flex items-center justify-center gap-1.5">
              {LOADING_BEATS.map((item, idx) => (
                <span
                  key={item.text}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === beatIndex
                      ? 'w-6 bg-black dark:bg-white'
                      : idx < beatIndex
                        ? 'w-1.5 bg-zinc-400 dark:bg-zinc-500'
                        : 'w-1.5 bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 140, damping: 16, delay: 0.2 }}
              className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-foreground/30 bg-muted/10"
            >
              <CheckCircle2 className="h-10 w-10 text-foreground" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mb-2 text-3xl font-bold text-foreground md:text-4xl"
            >
              Welcome{firstName ? `, ${firstName}` : ''}!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mb-8 max-w-sm text-muted-foreground"
            >
              Your profile is ready and we&apos;re already matching you with opportunities.
              Let&apos;s take a quick look at where everything lives.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6 }}
            >
              <PrimaryButton onClick={handleContinue}>Go to dashboard</PrimaryButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
