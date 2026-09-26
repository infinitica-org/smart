import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ConversionMetrics } from '@smart/contracts';
import {
  ConversionMetricsCard,
  NOT_ENOUGH_CANDIDATES,
  conversionRangeQuery,
} from '../conversion-metrics-card';

const metrics = (over: Partial<ConversionMetrics> = {}): ConversionMetrics => ({
  status: 'ready',
  shortlistToInterview: { entered: 10, converted: 4, ratePercent: 40 },
  interviewToHire: { entered: 3, converted: 1, ratePercent: null },
  from: null,
  to: null,
  calculatedAt: '2026-09-25T10:00:00.000Z',
  ...over,
});

const base = {
  metrics: metrics(),
  isLoading: false,
  isError: false,
  onRetry: vi.fn(),
  range: 'all' as const,
  onRangeChange: vi.fn(),
};

describe('ConversionMetricsCard (Th6-421)', () => {
  it('shows each rate with its counts, and a dash with a tooltip for a withheld rate', () => {
    render(<ConversionMetricsCard {...base} />);
    expect(screen.getByText('40%')).toBeDefined();
    expect(screen.getByText('4 / 10 candidates')).toBeDefined();
    const dash = screen.getByText('—');
    expect(dash.getAttribute('title')).toBe(NOT_ENOUGH_CANDIDATES);
    expect(screen.getByText('1 / 3 candidates')).toBeDefined();
  });

  it('has loading, empty and error (with retry) states', () => {
    const { rerender } = render(<ConversionMetricsCard {...base} isLoading metrics={undefined} />);
    expect(screen.getByText('Calculating conversion…')).toBeDefined();

    rerender(<ConversionMetricsCard {...base} metrics={metrics({ status: 'empty' })} />);
    expect(screen.getByText('No candidates in this period')).toBeDefined();

    rerender(<ConversionMetricsCard {...base} isError metrics={undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(base.onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers last 30 days, last 90 days and all time', () => {
    const onRangeChange = vi.fn();
    render(<ConversionMetricsCard {...base} onRangeChange={onRangeChange} />);
    expect(screen.getByRole('button', { name: 'All time' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
    fireEvent.click(screen.getByRole('button', { name: 'Last 90 days' }));
    expect(onRangeChange.mock.calls).toEqual([['30d'], ['90d']]);
  });

  it('turns a range into the API window', () => {
    const now = new Date('2026-09-30T00:00:00.000Z');
    expect(conversionRangeQuery('30d', now)).toEqual({ from: '2026-08-31T00:00:00.000Z' });
    expect(conversionRangeQuery('90d', now)).toEqual({ from: '2026-07-02T00:00:00.000Z' });
    expect(conversionRangeQuery('all', now)).toEqual({});
  });
});
