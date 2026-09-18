import { describe, expect, it } from 'vitest';
import { isHeadPoseLookingAway, poseFromMatrix } from './mediapipe-face-landmarker';

describe('mediapipe-face-landmarker', () => {
  it('derives yaw/pitch from a transformation matrix', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const pose = poseFromMatrix(identity);
    expect(pose).not.toBeNull();
    expect(Math.abs(pose?.yaw ?? 99)).toBeLessThan(1);
    expect(Math.abs(pose?.pitch ?? 99)).toBeLessThan(1);
  });

  it('flags looking away when yaw exceeds threshold', () => {
    expect(isHeadPoseLookingAway({ yaw: 30, pitch: 0, roll: 0 })).toBe(true);
    expect(isHeadPoseLookingAway({ yaw: 5, pitch: 5, roll: 0 })).toBe(false);
  });
});
