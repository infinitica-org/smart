import { describe, expect, it, vi } from 'vitest';
import {
  lumaFromRgba,
  requestProctoringMedia,
  rmsPercentFromTimeDomain,
  stopProctoringMedia,
} from './media';

describe('proctoring media helpers', () => {
  it('computes luma from RGBA bytes', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    expect(lumaFromRgba(data)).toBeGreaterThan(100);
    expect(lumaFromRgba(data)).toBeLessThan(160);
  });

  it('maps silence near 0 and peaks toward 100', () => {
    expect(rmsPercentFromTimeDomain(new Uint8Array(8).fill(128))).toBe(0);
    expect(rmsPercentFromTimeDomain(new Uint8Array(8).fill(255))).toBeGreaterThan(50);
  });

  it('requests camera and microphone together', async () => {
    const stream = { getTracks: () => [] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    await expect(requestProctoringMedia()).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: true, video: expect.any(Object) }),
    );
    vi.unstubAllGlobals();
  });

  it('maps permission denial to a student-facing error', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    await expect(requestProctoringMedia()).rejects.toThrow(/Allow camera and microphone/);
    vi.unstubAllGlobals();
  });

  it('rejects when getUserMedia is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    await expect(requestProctoringMedia()).rejects.toThrow(/cannot open the camera/);
    vi.unstubAllGlobals();
  });

  it('returns 0 luma for an empty buffer', () => {
    expect(lumaFromRgba(new Uint8ClampedArray())).toBe(0);
  });

  it('stops every media track', () => {
    const stop = vi.fn();
    stopProctoringMedia({ getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream);
    expect(stop).toHaveBeenCalledTimes(2);
  });
});
