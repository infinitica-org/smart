import { describe, expect, it } from 'vitest';
import { projectDefenseTimerProps } from './project-defense-timer';

describe('projectDefenseTimerProps', () => {
  it('derives serverNow from remaining seconds', () => {
    const startedAt = '2026-09-16T08:00:00.000Z';
    const props = projectDefenseTimerProps({
      startedAt,
      maxDurationSeconds: 600,
      secondsRemaining: 540,
    });

    expect(props.duration).toBe(600);
    expect(props.startedAt).toBe(startedAt);
    expect(Date.parse(props.serverNow)).toBe(Date.parse('2026-09-16T08:01:00.000Z'));
  });
});
