'use client';

import type { FaceDetector } from '@mediapipe/tasks-vision';
import { mapPixelBoxToCover, type NormalizedFaceBox } from './face-check';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

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
  if (video.videoWidth === 0 || video.videoHeight === 0) return [];
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
}
