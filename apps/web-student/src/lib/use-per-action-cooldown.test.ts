import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { formatCooldownLabel, usePerActionCooldown } from './use-per-action-cooldown';

describe('formatCooldownLabel', () => {
  it('formats sub-minute waits in seconds', () => {
    expect(formatCooldownLabel(45_000)).toBe('45s');
  });

  it('formats minute waits as m:ss', () => {
    expect(formatCooldownLabel(125_000)).toBe('2:05');
  });
});

describe('usePerActionCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks until cooldown elapses', () => {
    const { result } = renderHook(() => usePerActionCooldown(60_000));
    act(() => {
      result.current.startCooldown('exp-1');
    });
    expect(result.current.isCoolingDown('exp-1')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(result.current.isCoolingDown('exp-1')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current.isCoolingDown('exp-1')).toBe(false);
  });
});
