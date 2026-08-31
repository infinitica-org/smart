import type { HTMLAttributes } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/cn';

export interface AiExplanationPanelProps extends HTMLAttributes<HTMLDivElement> {
  explanation: string;
  title?: string;
  score?: number; // 0 to 100
  tone?: 'info' | 'warning' | 'success' | 'danger' | 'brand';
}

const TONE_CLASSES = {
  brand: {
    border: 'border-brand-500/30',
    bg: 'bg-brand-950/20',
    text: 'text-brand-300',
    accentText: 'text-brand-400',
    accentBar: 'bg-brand-500',
  },
  info: {
    border: 'border-info/30',
    bg: 'bg-info/5',
    text: 'text-info',
    accentText: 'text-info',
    accentBar: 'bg-info',
  },
  warning: {
    border: 'border-warning/30',
    bg: 'bg-warning/5',
    text: 'text-warning',
    accentText: 'text-warning',
    accentBar: 'bg-warning',
  },
  success: {
    border: 'border-success/30',
    bg: 'bg-success/5',
    text: 'text-success',
    accentText: 'text-success',
    accentBar: 'bg-success',
  },
  danger: {
    border: 'border-danger/30',
    bg: 'bg-danger/5',
    text: 'text-danger',
    accentText: 'text-danger',
    accentBar: 'bg-danger',
  },
};

export function AiExplanationPanel({
  explanation,
  title = 'AI INSIGHT',
  score,
  tone = 'brand',
  className,
  ...props
}: AiExplanationPanelProps) {
  const activeTone = TONE_CLASSES[tone] || TONE_CLASSES.brand;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-card)] transition-all',
        activeTone.border,
        activeTone.bg,
        className,
      )}
      role="region"
      aria-label="AI Explanation Panel"
      {...props}
    >
      {/* Decorative accent bar on left side */}
      <div className={cn('absolute top-0 bottom-0 left-0 w-[3px]', activeTone.accentBar)} />

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-2.5">
          <div className={cn('mt-0.5 shrink-0', activeTone.accentText)}>
            <Sparkles className="h-4.5 w-4.5 animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <span
              className={cn(
                'block font-heading text-2xs font-extrabold tracking-wider uppercase opacity-80',
                activeTone.accentText,
              )}
            >
              {title}
            </span>
            <p
              className={cn(
                'mt-1 text-sm leading-relaxed font-normal text-[var(--text-primary)]',
                activeTone.text,
              )}
            >
              {explanation}
            </p>
          </div>
        </div>

        {typeof score === 'number' && (
          <div className="mt-2 flex shrink-0 items-center gap-2.5 sm:mt-0 sm:flex-col sm:items-end">
            <div className="flex items-center justify-center font-heading text-lg font-extrabold leading-none tracking-tight">
              <span className={cn('text-xl font-black', activeTone.accentText)}>{score}%</span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Match Score
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
