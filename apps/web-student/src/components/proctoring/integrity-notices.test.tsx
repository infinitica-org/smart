import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IntegrityLockoutPanel, IntegrityWarningModal } from './integrity-notices';

describe('integrity notices', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a warning and dismisses after 5 seconds without a button', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<IntegrityWarningModal count={2} limit={5} onDismiss={onDismiss} />);
    expect(screen.getByLabelText('Integrity warning').textContent).toMatch(/Warning 2 of 5/);
    expect(screen.queryByRole('button')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows lockout countdown copy', () => {
    render(<IntegrityLockoutPanel limit={5} secondsLeft={12} />);
    expect(screen.getByText(/Returning to assessments in 12 seconds/)).toBeDefined();
  });
});
