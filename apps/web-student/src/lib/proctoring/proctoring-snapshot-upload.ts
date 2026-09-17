import { PROCTORING_SNAPSHOT_HEIGHT, PROCTORING_SNAPSHOT_WIDTH } from '@smart/contracts';

import { api } from '../api';

import { captureVideoFrame } from './face-check';

export type ProctoringSnapshotUploadResult =
  { ok: true; objectKey: string } | { ok: false; message: string };

async function frameFromStream(stream: MediaStream): Promise<ImageData | null> {
  const video = document.createElement('video');

  video.muted = true;

  video.playsInline = true;

  video.srcObject = stream;

  try {
    await video.play().catch(() => undefined);

    await new Promise<void>((resolve) => window.setTimeout(resolve, 250));

    return captureVideoFrame(
      video,

      PROCTORING_SNAPSHOT_WIDTH,

      PROCTORING_SNAPSHOT_HEIGHT,

      'cover',
    );
  } finally {
    video.srcObject = null;
  }
}

/** Capture a JPEG from the proctoring preview and upload via presigned PUT. */

export async function uploadProctoringSnapshot(
  attemptId: string,

  source: HTMLVideoElement | MediaStream,
): Promise<ProctoringSnapshotUploadResult> {
  if (typeof document !== 'undefined' && document.hidden) {
    return { ok: false, message: 'Tab hidden — snapshot skipped.' };
  }

  const frame =
    source instanceof MediaStream
      ? await frameFromStream(source)
      : captureVideoFrame(source, PROCTORING_SNAPSHOT_WIDTH, PROCTORING_SNAPSHOT_HEIGHT, 'cover');

  if (!frame) {
    return { ok: false, message: 'Camera frame not ready.' };
  }

  const canvas = document.createElement('canvas');

  canvas.width = frame.width;

  canvas.height = frame.height;

  const ctx = canvas.getContext('2d');

  if (!ctx) return { ok: false, message: 'Could not encode snapshot.' };

  ctx.putImageData(frame, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), 'image/jpeg', 0.75);
  });

  if (!blob || blob.size === 0) {
    return { ok: false, message: 'Empty snapshot.' };
  }

  try {
    const upload = await api.proctoring.snapshotUploadUrl(attemptId, {
      contentType: 'image/jpeg',
    });

    // eslint-disable-next-line no-restricted-globals
    const put = await fetch(upload.uploadUrl, {
      method: 'PUT',

      body: blob,

      headers: { 'Content-Type': 'image/jpeg' },
    });

    if (!put.ok) {
      return { ok: false, message: `Snapshot upload failed (${put.status}).` };
    }

    return { ok: true, objectKey: upload.objectKey };
  } catch {
    return { ok: false, message: 'Could not upload proctoring snapshot.' };
  }
}
