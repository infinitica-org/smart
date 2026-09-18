import { describe, expect, it, vi } from 'vitest';
import {
  cameraIntegrityCopy,
  classifyLiveWebcam,
  confirmLiveWebcamIssue,
  isFaceAlignmentKind,
  isLookingAway,
  LIVE_WEBCAM_SAMPLE_MS,
  startLiveWebcamMonitor,
} from './live-webcam';
import type { NormalizedFaceBox } from './face-check';

function box(partial: Partial<NormalizedFaceBox> = {}): NormalizedFaceBox {
  return { xMin: 0.3, yMin: 0.2, xMax: 0.7, yMax: 0.8, ...partial };
}

describe('classifyLiveWebcam', () => {
  it('flags no face, a second person, and looking away', () => {
    expect(classifyLiveWebcam([], 80)).toBe('NO_FACE');
    expect(classifyLiveWebcam([], 10)).toBe('CAMERA_OBSTRUCTED');
    expect(classifyLiveWebcam([box(), box({ xMin: 0.05, xMax: 0.25 })], 80)).toBe('MULTIPLE_FACES');
    expect(classifyLiveWebcam([box({ xMin: 0.7, xMax: 0.95 })], 80)).toBe('LOOKING_AWAY');
    expect(classifyLiveWebcam([box()], 80, true)).toBe('LOOKING_AWAY');
    expect(classifyLiveWebcam([box()], 80)).toBeNull();
    expect(cameraIntegrityCopy(null).title).toBe('Camera clear');
    expect(cameraIntegrityCopy('NO_FACE').ok).toBe(false);
    expect(isFaceAlignmentKind('NO_FACE')).toBe(true);
    expect(isFaceAlignmentKind('TAB_BLUR')).toBe(false);
    expect(LIVE_WEBCAM_SAMPLE_MS).toBeLessThanOrEqual(200);
  });

  it('treats a tiny box as looking away', () => {
    expect(isLookingAway(box({ xMin: 0.48, yMin: 0.48, xMax: 0.52, yMax: 0.52 }))).toBe(true);
  });
});

describe('confirmLiveWebcamIssue', () => {
  it('emits multiple faces after two matching samples', () => {
    const first = confirmLiveWebcamIssue(null, 0, 'MULTIPLE_FACES');
    expect(first.emit).toBe(false);
    const second = confirmLiveWebcamIssue(first.kind, first.streak, 'MULTIPLE_FACES');
    expect(second.emit).toBe(true);
  });

  it('resets the streak when the issue clears', () => {
    const mid = confirmLiveWebcamIssue('NO_FACE', 1, 'NO_FACE');
    expect(mid.emit).toBe(false);
    const cleared = confirmLiveWebcamIssue(mid.kind, mid.streak, null);
    expect(cleared).toEqual({ kind: null, streak: 0, emit: false });
  });
});

describe('startLiveWebcamMonitor', () => {
  it('reports only after confirm samples and respects emit cooldown', async () => {
    const onViolation = vi.fn();
    const onSample = vi.fn();
    let now = 1_000;
    const twoFaces = [box(), box({ xMin: 0.05, xMax: 0.2 })];
    const video = { videoWidth: 640 } as HTMLVideoElement;

    const monitor = startLiveWebcamMonitor({
      getVideo: () => video,
      onViolation,
      onSample,
      detect: () => twoFaces,
      brightnessOf: () => 90,
      sampleMs: 60_000,
      emitCooldownMs: 1_000,
      now: () => now,
    });

    await monitor.tick();
    expect(onSample).toHaveBeenCalledWith('MULTIPLE_FACES');
    expect(onViolation).not.toHaveBeenCalled();
    await monitor.tick();
    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation).toHaveBeenCalledWith('MULTIPLE_FACES');

    await monitor.tick();
    expect(onViolation).toHaveBeenCalledTimes(1);

    now += 1_001;
    await monitor.tick();
    expect(onViolation).toHaveBeenCalledTimes(2);

    monitor.stop();
  });

  it('skips a tick while a previous detect is still running', async () => {
    const onViolation = vi.fn();
    let release!: (boxes: NormalizedFaceBox[]) => void;
    const pending = new Promise<NormalizedFaceBox[]>((resolve) => {
      release = resolve;
    });
    let detectCalls = 0;
    const video = { videoWidth: 640 } as HTMLVideoElement;

    const monitor = startLiveWebcamMonitor({
      getVideo: () => video,
      onViolation,
      detect: () => {
        detectCalls += 1;
        return pending;
      },
      brightnessOf: () => 90,
      estimatePose: async () => null,
      sampleMs: 60_000,
    });

    const first = monitor.tick();
    const second = monitor.tick();
    release([box()]);
    await first;
    await second;
    expect(detectCalls).toBe(1);
    monitor.stop();
  });
});
