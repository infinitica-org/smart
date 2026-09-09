'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Lightbulb, Sparkles } from 'lucide-react';
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
  { text: 'Mapping your skills to your track…', kind: 'status' },
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
            <div className="relative mb-8 h-14 w-14 flex-none">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#00fad0]/20" />
              <span className="absolute inset-0 rounded-full border-2 border-zinc-800" />
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#00fad0]" />
            </div>

            <AnimatePresence mode="wait">
              {beat?.kind === 'fact' ? (
                <motion.div
                  key={beatIndex}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="flex max-w-sm items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-5 py-4 text-left"
                >
                  <Lightbulb className="h-5 w-5 flex-none text-[#00fad0]" />
                  <p className="text-sm leading-relaxed text-zinc-300">{beat.text}</p>
                </motion.div>
              ) : (
                <motion.p
                  key={beatIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-lg font-medium text-zinc-300"
                >
                  {beat?.text}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mt-8 flex items-center gap-1.5">
              {LOADING_BEATS.map((item, idx) => (
                <span
                  key={item.text}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === beatIndex
                      ? 'w-5 bg-[#00fad0]'
                      : idx < beatIndex
                        ? 'w-1.5 bg-[#00fad0]/40'
                        : 'w-1.5 bg-zinc-800'
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
