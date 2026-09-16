import { describe, expect, it, vi } from 'vitest';
import { uploadProctoringSnapshot } from './proctoring-snapshot-upload';

vi.mock('../api', () => ({
  api: {
    proctoring: {
      snapshotUploadUrl: vi.fn().mockResolvedValue({
        uploadUrl: 'https://minio/upload',
        objectKey: 'proctoring/attempt/uuid.jpg',
        expiresInSeconds: 900,
      }),
    },
  },
}));

describe('uploadProctoringSnapshot', () => {
  it('skips when the tab is hidden', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    const video = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;
    const result = await uploadProctoringSnapshot('55555555-5555-4555-8555-555555555555', video);
    expect(result.ok).toBe(false);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
});
