'use client';

import type { FaceDetector } from '@mediapipe/tasks-vision';
import { mapPixelBoxToCover, type NormalizedFaceBox } from './face-check';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

// Suppress Emscripten/TFLite stderr messages that route to console.error (e.g. "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.")
// Next.js Turbopack dev overlay intercepts any console.error calls and renders an error modal.
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].startsWith('INFO: ') ||
        args[0].includes('TensorFlow Lite') ||
        args[0].includes('XNNPACK'))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}

let detectorPromise: Promise<FaceDetector> | null = null;

export function getBlazeFaceDetector(): Promise<FaceDetector> {
  detectorPromise ??= (async () => {
    const vision = await import('@mediapipe/tasks-vision');
    const files = await vision.FilesetResolver.forVisionTasks(WASM_URL);
    return vision.FaceDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: 'VIDEO',
      minDetectionConfidence: 0.52,
      minSuppressionThreshold: 0.3,
    });
  })();
  return detectorPromise;
}

let lastVideoTimestamp = 0;

export function detectionsToCoverBoxes(
  detector: FaceDetector,
  video: HTMLVideoElement,
  timestampMs: number,
): NormalizedFaceBox[] {
  if (
    video.readyState < 2 ||
    video.videoWidth === 0 ||
    video.videoHeight === 0 ||
    video.paused ||
    video.ended
  ) {
    return [];
  }
  try {
    const ts = Math.max(timestampMs, lastVideoTimestamp + 1);
    lastVideoTimestamp = ts;
    const result = detector.detectForVideo(video, ts);
    return (result.detections ?? []).flatMap((row) => {
      const box = row.boundingBox;
      if (!box) return [];
      return [
        mapPixelBoxToCover(
          {
            originX: box.originX,
            originY: box.originY,
            width: box.width,
            height: box.height,
          },
          video.videoWidth,
          video.videoHeight,
        ),
      ];
    });
  } catch {
    return [];
  }
}
