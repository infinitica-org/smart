import type { ProctoringViolationKind } from '@smart/contracts';
import { captureVideoFrame, ovalBrightness, type NormalizedFaceBox } from './face-check';
import {
  estimateHeadPoseFromVideo,
  isHeadPoseLookingAway,
  type HeadPoseEstimate,
} from './mediapipe-face-landmarker';
import { detectionsToCoverBoxes, getBlazeFaceDetector } from './mediapipe-face-detector';

/** Fast enough that a missing face blacks the exam on the next detector tick. */
export const LIVE_WEBCAM_SAMPLE_MS = 150;
/** Same kind must wait this long before another HMAC ingest (rate-limit budget). */
export const LIVE_WEBCAM_EMIT_COOLDOWN_MS = 8_000;

const CONFIRM_SAMPLES: Partial<Record<ProctoringViolationKind, number>> = {
  MULTIPLE_FACES: 2,
  NO_FACE: 3,
  LOOKING_AWAY: 3,
  CAMERA_OBSTRUCTED: 3,
};

const LOOK_AWAY_X = 0.32;
const LOOK_AWAY_Y = 0.38;
const MIN_FACE_AREA = 0.035;
const OBSTRUCTED_LUMA = 35;

export function isLookingAway(box: NormalizedFaceBox): boolean {
  const cx = (box.xMin + box.xMax) / 2;
  const cy = (box.yMin + box.yMax) / 2;
  const area = Math.max(0, box.xMax - box.xMin) * Math.max(0, box.yMax - box.yMin);
  return (
    Math.abs(cx - 0.5) > LOOK_AWAY_X || Math.abs(cy - 0.5) > LOOK_AWAY_Y || area < MIN_FACE_AREA
  );
}

/**
 * Map one sample to at most one integrity kind. Lighting-only issues are ignored
 * mid-exam to cut false positives; dark + no face is treated as obstruction.
 */
export function classifyLiveWebcam(
  boxes: readonly NormalizedFaceBox[],
  brightness: number,
  headPoseAway = false,
): ProctoringViolationKind | null {
  if (boxes.length > 1) return 'MULTIPLE_FACES';
  if (boxes.length === 0) {
    return brightness > 0 && brightness < OBSTRUCTED_LUMA ? 'CAMERA_OBSTRUCTED' : 'NO_FACE';
  }
  const box = boxes[0];
  if (headPoseAway || (box && isLookingAway(box))) return 'LOOKING_AWAY';
  return null;
}

export const FACE_ALIGNMENT_KINDS = [
  'NO_FACE',
  'LOOKING_AWAY',
  'CAMERA_OBSTRUCTED',
  'MULTIPLE_FACES',
] as const satisfies readonly ProctoringViolationKind[];

export function isFaceAlignmentKind(
  kind: ProctoringViolationKind | null,
): kind is (typeof FACE_ALIGNMENT_KINDS)[number] {
  return kind !== null && (FACE_ALIGNMENT_KINDS as readonly string[]).includes(kind);
}

export function cameraIntegrityCopy(kind: ProctoringViolationKind | null): {
  ok: boolean;
  title: string;
  detail: string;
} {
  if (kind === 'MULTIPLE_FACES') {
    return {
      ok: false,
      title: 'More than one person',
      detail: 'Only you should be in the camera.',
    };
  }
  if (kind === 'NO_FACE') {
    return { ok: false, title: 'Face not visible', detail: 'Sit in front of the camera.' };
  }
  if (kind === 'CAMERA_OBSTRUCTED') {
    return { ok: false, title: 'Camera blocked', detail: 'Uncover the lens or add light.' };
  }
  if (kind === 'LOOKING_AWAY') {
    return { ok: false, title: 'Face off-centre', detail: 'Look at the screen and sit closer.' };
  }
  return { ok: true, title: 'Camera clear', detail: 'One face in frame. Keep it that way.' };
}

export function confirmLiveWebcamIssue(
  previousKind: ProctoringViolationKind | null,
  previousStreak: number,
  nextKind: ProctoringViolationKind | null,
): { kind: ProctoringViolationKind | null; streak: number; emit: boolean } {
  if (!nextKind) return { kind: null, streak: 0, emit: false };
  const streak = previousKind === nextKind ? previousStreak + 1 : 1;
  const needed = CONFIRM_SAMPLES[nextKind] ?? 3;
  return { kind: nextKind, streak, emit: streak >= needed };
}

export function startLiveWebcamMonitor(options: {
  getVideo: () => HTMLVideoElement | null;
  onViolation: (kind: ProctoringViolationKind) => void;
  onSample?: (kind: ProctoringViolationKind | null) => void;
  detect?: (
    video: HTMLVideoElement,
    timestampMs: number,
  ) => Promise<NormalizedFaceBox[]> | NormalizedFaceBox[];
  brightnessOf?: (video: HTMLVideoElement) => number;
  estimatePose?: (video: HTMLVideoElement) => Promise<HeadPoseEstimate | null>;
  sampleMs?: number;
  emitCooldownMs?: number;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
}): { stop: () => void; tick: () => Promise<void> } {
  const sampleMs = options.sampleMs ?? LIVE_WEBCAM_SAMPLE_MS;
  const emitCooldownMs = options.emitCooldownMs ?? LIVE_WEBCAM_EMIT_COOLDOWN_MS;
  const now = options.now ?? Date.now;
  const schedule = options.setIntervalFn ?? setInterval;
  const unschedule = options.clearIntervalFn ?? clearInterval;

  let streakKind: ProctoringViolationKind | null = null;
  let streak = 0;
  const lastEmitAt: Partial<Record<ProctoringViolationKind, number>> = {};
  let busy = false;
  let stopped = false;

  async function sample(): Promise<void> {
    if (stopped || busy) return;
    const video = options.getVideo();
    if (!video || video.videoWidth === 0) return;
    busy = true;
    try {
      const detect =
        options.detect ??
        (async (el: HTMLVideoElement, ts: number) => {
          const detector = await getBlazeFaceDetector();
          return detectionsToCoverBoxes(detector, el, ts);
        });
      const boxes = await detect(
        video,
        typeof performance !== 'undefined' ? performance.now() : now(),
      );
      const brightness =
        options.brightnessOf?.(video) ??
        (() => {
          const frame = captureVideoFrame(video, 96, 54, 'cover');
          return frame ? ovalBrightness(frame) : 0;
        })();
      const estimatePose = options.estimatePose ?? estimateHeadPoseFromVideo;
      const pose = boxes.length === 1 ? await estimatePose(video) : null;
      const headPoseAway = pose ? isHeadPoseLookingAway(pose) : false;
      const nextKind = classifyLiveWebcam(boxes, brightness, headPoseAway);
      options.onSample?.(nextKind);
      const stepped = confirmLiveWebcamIssue(streakKind, streak, nextKind);
      streakKind = stepped.kind;
      streak = stepped.streak;
      if (!stepped.emit || !stepped.kind) return;
      const t = now();
      if (t - (lastEmitAt[stepped.kind] ?? 0) < emitCooldownMs) return;
      lastEmitAt[stepped.kind] = t;
      streak = 0;
      options.onViolation(stepped.kind);
    } catch {
      // Model/CDN failure must not take down the exam.
    } finally {
      busy = false;
    }
  }

  const timer = schedule(() => {
    void sample();
  }, sampleMs);

  return {
    stop: () => {
      stopped = true;
      unschedule(timer);
    },
    tick: sample,
  };
}
