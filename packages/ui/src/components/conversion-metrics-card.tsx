'use client';

import { ArrowRight, TrendingUp } from 'lucide-react';
import { CONVERSION_MIN_SAMPLE, type ConversionMetrics } from '@smart/contracts';
import { cn } from '../lib/cn';
import { EmptyState, ErrorState, LoadingState } from './common-states';

export const CONVERSION_RANGES = ['30d', '90d', 'all'] as const;
export type ConversionRange = (typeof CONVERSION_RANGES)[number];

const RANGE_LABEL: Record<ConversionRange, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
};
const DAY_MS = 24 * 60 * 60 * 1000;

/** The `from` bound the API expects for a range ("all time" has none). */
export function conversionRangeQuery(
  range: ConversionRange,
  now: Date = new Date(),
): { from?: string } {
  if (range === 'all') return {};
  const days = range === '30d' ? 30 : 90;
  return { from: new Date(now.getTime() - days * DAY_MS).toISOString() };
}

export const NOT_ENOUGH_CANDIDATES = 'Not enough candidates yet';

function RateTile(props: {
  from: string;
  to: string;
  rate: ConversionMetrics['shortlistToInterview'];
}) {
  const { rate } = props;
  const label = `${props.from} to ${props.to}`;
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
        {props.from} <ArrowRight className="size-3" aria-hidden /> {props.to}
      </p>
      {rate.ratePercent === null ? (
        // The server withholds the rate below CONVERSION_MIN_SAMPLE; the tooltip says why.
        <p
          className="mt-2 cursor-help text-3xl font-semibold text-neutral-400"
          title={NOT_ENOUGH_CANDIDATES}
          aria-label={`${label}: ${NOT_ENOUGH_CANDIDATES}`}
          tabIndex={0}
        >
          —
        </p>
      ) : (
        <p className="mt-2 text-3xl font-semibold" aria-label={`${label}: ${rate.ratePercent}%`}>
          {rate.ratePercent}%
        </p>
      )}
      <p className="mt-1 text-xs text-neutral-500">
        {rate.converted} / {rate.entered} candidates
      </p>
    </div>
  );
}

export interface ConversionMetricsCardProps {
  title?: string;
  description?: string;
  metrics: ConversionMetrics | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  range: ConversionRange;
  onRangeChange: (range: ConversionRange) => void;
  className?: string;
}

/**
 * Th6-421 — Shortlist → Interview and Interview → Hire conversion, with counts and a date range.
 * The rate itself is withheld by the server for small samples; this only explains the dash.
 */
export function ConversionMetricsCard(props: ConversionMetricsCardProps) {
  const { metrics } = props;
  return (
    <section
      aria-label={props.title ?? 'Hiring conversion'}
      className={cn(
        'space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950',
        props.className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="size-4" aria-hidden /> {props.title ?? 'Hiring conversion'}
          </h2>
          <p className="text-xs text-neutral-500">
            {props.description ??
              `Rates show once at least ${CONVERSION_MIN_SAMPLE} candidates reach a stage.`}
          </p>
        </div>
        <div role="group" aria-label="Date range" className="flex gap-1.5">
          {CONVERSION_RANGES.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={props.range === range}
              onClick={() => props.onRangeChange(range)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold',
                props.range === range
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
              )}
            >
              {RANGE_LABEL[range]}
            </button>
          ))}
        </div>
      </div>

      {props.isLoading ? (
        <LoadingState message="Calculating conversion…" />
      ) : props.isError || !metrics ? (
        <ErrorState
          title="Could not load conversion"
          message="Check your connection and try again."
          onRetry={props.onRetry}
        />
      ) : metrics.status === 'empty' ? (
        <EmptyState
          title="No candidates in this period"
          description="Conversion appears once candidates are shortlisted or interviewed."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <RateTile from="Shortlist" to="Interview" rate={metrics.shortlistToInterview} />
          <RateTile from="Interview" to="Hire" rate={metrics.interviewToHire} />
        </div>
      )}
    </section>
  );
}
