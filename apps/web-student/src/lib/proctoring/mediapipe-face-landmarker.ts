'use client';

import type { FaceLandmarker } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarkerPromise: Promise<FaceLandmarker> | null = null;
let lastVideoTimestamp = 0;

export type HeadPoseEstimate = {
  yaw: number;
  pitch: number;
  roll: number;
};

export function getFaceLandmarker(): Promise<FaceLandmarker> {
  landmarkerPromise ??= (async () => {
    const vision = await import('@mediapipe/tasks-vision');
    const files = await vision.FilesetResolver.forVisionTasks(WASM_URL);
    return vision.FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: 'VIDEO',
      numFaces: 2,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
    });
  })();
  return landmarkerPromise;
}

/** Estimate head pose from MediaPipe transformation matrix (degrees). */
export function poseFromMatrix(values: readonly number[]): HeadPoseEstimate | null {
  if (values.length < 16) return null;
  const r00 = values[0] ?? 0;
  const r10 = values[4] ?? 0;
  const r20 = values[8] ?? 0;
  const r21 = values[9] ?? 0;
  const r22 = values[10] ?? 0;
  const pitch = (Math.asin(-r20) * 180) / Math.PI;
  const yaw = (Math.atan2(r10, r00) * 180) / Math.PI;
  const roll = (Math.atan2(r21, r22) * 180) / Math.PI;
  return { yaw, pitch, roll };
}

export async function estimateHeadPoseFromVideo(
  video: HTMLVideoElement,
): Promise<HeadPoseEstimate | null> {
  if (
    video.readyState < 2 ||
    video.videoWidth === 0 ||
    video.videoHeight === 0 ||
    video.paused ||
    video.ended
  ) {
    return null;
  }
  try {
    const landmarker = await getFaceLandmarker();
    const ts = Math.max(performance.now(), lastVideoTimestamp + 1);
    lastVideoTimestamp = ts;
    const result = landmarker.detectForVideo(video, ts);
    const matrix = result.facialTransformationMatrixes?.[0]?.data;
    if (matrix) return poseFromMatrix(matrix);
    const landmarks = result.faceLandmarks?.[0];
    if (!landmarks || landmarks.length < 10) return null;
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    if (!nose || !leftEye || !rightEye) return null;
    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const yaw = (nose.x - eyeMidX) * 110;
    const pitch = (nose.y - (leftEye.y + rightEye.y) / 2) * 120;
    return { yaw, pitch, roll: 0 };
  } catch {
    return null;
  }
}

export function isHeadPoseLookingAway(pose: HeadPoseEstimate): boolean {
  return Math.abs(pose.yaw) > 22 || Math.abs(pose.pitch) > 18;
}
