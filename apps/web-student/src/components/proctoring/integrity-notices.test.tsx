import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FaceAlignmentBlackout,
  IntegrityLockoutPanel,
  IntegrityWarningModal,
} from './integrity-notices';

describe('integrity notices', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds a full blackout until aligned for 3 seconds', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { rerender } = render(<FaceAlignmentBlackout liveKind="NO_FACE" onDismiss={onDismiss} />);
    expect(screen.getByLabelText('Look at the screen').textContent).toMatch(/Look at the screen/);
    expect(screen.getByText(/challenge stays hidden/i)).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    rerender(<FaceAlignmentBlackout liveKind={null} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(2_900);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('resets the hold if the face leaves again', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { rerender } = render(<FaceAlignmentBlackout liveKind={null} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    rerender(<FaceAlignmentBlackout liveKind="LOOKING_AWAY" onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
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
    expect(screen.getByText(/Heading back in 12 seconds/)).toBeDefined();
  });
});
