'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { TourStep } from '@/lib/tour-steps';
import { markTourCompleted, START_TOUR_EVENT } from '@/lib/tour';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 8;
const CARD_WIDTH = 288;
const CARD_GAP = 14;
const CARD_MARGIN = 16;

function measure(target: string): SpotlightRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - SPOTLIGHT_PADDING,
    left: r.left - SPOTLIGHT_PADDING,
    width: r.width + SPOTLIGHT_PADDING * 2,
    height: r.height + SPOTLIGHT_PADDING * 2,
  };
}

/**
 * A lightweight, dependency-free spotlight tour: dims the page, cuts a
 * highlight around the current step's `data-tour="<target>"` element, and
 * shows a small card next to it. Auto-starts once right after onboarding
 * (via the `autoStart` flag, a one-shot sessionStorage read the caller
 * already consumed) and can always be replayed from the "Take a tour" item
 * in the profile menu, which fires `START_TOUR_EVENT`.
 */
export function ProductTour({ steps, autoStart }: { steps: TourStep[]; autoStart: boolean }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  const recompute = useCallback(() => {
    const step = steps[index];
    if (!step) return;
    setRect(measure(step.target));
  }, [index, steps]);

  useEffect(() => {
    if (!autoStart) return;
    // Give the page a beat to finish rendering before the first measurement.
    const t = setTimeout(() => setActive(true), 600);
    return () => clearTimeout(t);
  }, [autoStart]);

  useEffect(() => {
    const onStart = () => {
      setIndex(0);
      setActive(true);
    };
    window.addEventListener(START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_TOUR_EVENT, onStart);
  }, []);

  useEffect(() => {
    if (!active) return;
    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [active, recompute]);

  const finish = () => {
    setActive(false);
    markTourCompleted();
  };

  if (!active) return null;
  const step = steps[index];
  if (!step) return null;

  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const cardLeft = rect
    ? Math.min(Math.max(rect.left, CARD_MARGIN), window.innerWidth - CARD_MARGIN - CARD_WIDTH)
    : 0;

  return (
    <div className="fixed inset-0 z-[100]">
      {rect ? (
        <motion.div
          className="pointer-events-none fixed rounded-2xl"
          animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)' }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/72" />
      )}

      <button
        type="button"
        aria-label="Skip tour"
        onClick={finish}
        className="fixed inset-0 cursor-default"
      />

      {rect ? (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: step.placement === 'top' ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed w-72 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
          style={{
            left: cardLeft,
            top: step.placement === 'bottom' ? rect.top + rect.height + CARD_GAP : undefined,
            bottom: step.placement === 'top' ? window.innerHeight - rect.top + CARD_GAP : undefined,
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wide text-[#00fad0] uppercase">
              {index + 1} of {steps.length}
            </span>
            <button
              type="button"
              onClick={finish}
              aria-label="Close tour"
              className="text-zinc-500 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="mb-1.5 text-base font-semibold text-white">{step.title}</h3>
          <p className="mb-5 text-sm leading-relaxed text-zinc-400">{step.description}</p>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={isFirst}
              className="flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <button
              type="button"
              onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
              className="flex items-center gap-1.5 rounded-full bg-[#00fad0] px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-[#7dffe6]"
            >
              {isLast ? 'Done' : 'Next'}
              {!isLast ? <ArrowRight className="h-3.5 w-3.5" /> : null}
            </button>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
