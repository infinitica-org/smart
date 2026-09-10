import { describe, expect, it } from 'vitest';
import {
  FACE_LUMA_MIN,
  coverSourceRect,
  emptyOvalHoldState,
  evaluateDetectedFaces,
  evaluateFaceImageData,
  faceFillsOval,
  isSkinTone,
  rgbToYCbCr,
  stabilizeFaceCheck,
  stepOvalHold,
} from './face-check';

function makeImage(width: number, height: number): ImageData {
  return {
    data: new Uint8ClampedArray(width * height * 4),
    width,
    height,
    colorSpace: 'srgb',
  } as ImageData;
}

function fillRect(
  image: ImageData,
  x0: number,
  y0: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const i = (y * image.width + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }
}

describe('face-check', () => {
  it('classifies a mid-tone face RGB as skin', () => {
    expect(isSkinTone(210, 160, 130)).toBe(true);
    expect(isSkinTone(140, 90, 70)).toBe(true);
    expect(isSkinTone(0, 0, 0)).toBe(false);
    expect(rgbToYCbCr(210, 160, 130).y).toBeGreaterThan(FACE_LUMA_MIN);
  });

  it('rejects an empty dark frame as no face', () => {
    const image = makeImage(80, 60);
    const result = evaluateFaceImageData(image);
    expect(result.faceCount).toBe(0);
    expect(result.oneFace).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/cannot see a face/i);
  });

  it('accepts a single well-lit skin blob', () => {
    const image = makeImage(80, 60);
    fillRect(image, 28, 12, 24, 32, 210, 160, 130);
    const result = evaluateFaceImageData(image);
    expect(result.faceCount).toBe(1);
    expect(result.oneFace).toBe(true);
    expect(result.lightingOk).toBe(true);
    expect(result.ok).toBe(true);
  });

  it('treats nearby face fragments as a single face', () => {
    const image = makeImage(80, 60);
    fillRect(image, 26, 14, 14, 20, 210, 160, 130);
    fillRect(image, 40, 16, 14, 18, 210, 160, 130);
    const result = evaluateFaceImageData(image);
    expect(result.oneFace).toBe(true);
    expect(result.ok).toBe(true);
  });

  it('ignores a skin blob outside the oval as an incomplete fill', () => {
    const image = makeImage(80, 60);
    fillRect(image, 0, 8, 14, 40, 210, 160, 130);
    const result = evaluateFaceImageData(image);
    expect(result.ok).toBe(false);
    expect(result.fillOk).toBe(false);
    expect(result.message).toMatch(/whole face|oval/i);
  });

  it('rejects a face that only clips the oval edge', () => {
    const image = makeImage(80, 60);
    fillRect(image, 20, 6, 10, 12, 210, 160, 130);
    const result = evaluateFaceImageData(image);
    expect(result.fillOk).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/partial|whole face/i);
  });

  it('rejects two separate skin blobs as more than one face', () => {
    const image = makeImage(80, 60);
    fillRect(image, 2, 10, 26, 38, 210, 160, 130);
    fillRect(image, 52, 10, 26, 38, 210, 160, 130);
    const result = evaluateFaceImageData(image);
    expect(result.faceCount).toBeGreaterThanOrEqual(2);
    expect(result.oneFace).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/only one face/i);
  });

  it('rejects a second person even when they sit outside the oval', () => {
    const inOval = makeImage(80, 60);
    fillRect(inOval, 28, 12, 24, 32, 210, 160, 130);
    const crowd = makeImage(80, 60);
    fillRect(crowd, 28, 12, 24, 32, 210, 160, 130);
    fillRect(crowd, 1, 8, 16, 36, 210, 160, 130);
    const result = evaluateFaceImageData(inOval, crowd);
    expect(result.faceCount).toBeGreaterThanOrEqual(2);
    expect(result.oneFace).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/only one face/i);
  });

  it('rejects a dark skin blob as poor lighting', () => {
    const image = makeImage(80, 60);
    fillRect(image, 28, 12, 24, 32, 90, 60, 50);
    const result = evaluateFaceImageData(image);
    expect(result.oneFace).toBe(true);
    expect(result.brightness).toBeLessThan(FACE_LUMA_MIN);
    expect(result.lightingOk).toBe(false);
    expect(result.message).toMatch(/too dark/i);
  });

  it('accepts a BlazeFace box that fills the oval and rejects a clip or a second person', () => {
    const seated = {
      xMin: 0.3,
      yMin: 0.14,
      xMax: 0.7,
      yMax: 0.78,
    };
    expect(faceFillsOval(seated)).toBe(true);
    expect(evaluateDetectedFaces([seated], 140).ok).toBe(true);
    const clip = { xMin: 0.28, yMin: 0.06, xMax: 0.42, yMax: 0.28 };
    expect(faceFillsOval(clip)).toBe(false);
    expect(evaluateDetectedFaces([clip], 140).fillOk).toBe(false);
    const other = { xMin: 0.02, yMin: 0.2, xMax: 0.22, yMax: 0.7 };
    const crowd = evaluateDetectedFaces([seated, other], 140);
    expect(crowd.oneFace).toBe(false);
    expect(crowd.ok).toBe(false);
    expect(crowd.message).toMatch(/only one face/i);
  });

  it('holds oval fill through a few jitter frames once locked', () => {
    const seated = { xMin: 0.3, yMin: 0.14, xMax: 0.7, yMax: 0.78 };
    let hold = emptyOvalHoldState();
    hold = stepOvalHold(hold, [seated]);
    expect(hold.fillOk).toBe(false);
    hold = stepOvalHold(hold, [seated]);
    expect(hold.fillOk).toBe(true);
    const jitter = { xMin: 0.28, yMin: 0.12, xMax: 0.73, yMax: 0.81 };
    hold = stepOvalHold(hold, [jitter]);
    hold = stepOvalHold(hold, [jitter]);
    expect(hold.fillOk).toBe(true);
  });

  it('crops the camera frame the same way as object-fit cover', () => {
    const src = coverSourceRect(640, 480, 192, 108);
    expect(src.sw).toBeCloseTo(640);
    expect(src.sh).toBeCloseTo(360);
    expect(src.sx).toBeCloseTo(0);
    expect(src.sy).toBeCloseTo(60);
  });

  it('reports multiple faces immediately without holding the previous one-face result', () => {
    const goodImage = makeImage(80, 60);
    fillRect(goodImage, 28, 12, 24, 32, 210, 160, 130);
    const good = evaluateFaceImageData(goodImage);
    const noisy = makeImage(80, 60);
    fillRect(noisy, 2, 10, 26, 38, 210, 160, 130);
    fillRect(noisy, 52, 10, 26, 38, 210, 160, 130);
    const multi = evaluateFaceImageData(noisy);
    const held = stabilizeFaceCheck(good, multi, 0);
    expect(good.oneFace).toBe(true);
    expect(multi.oneFace).toBe(false);
    expect(held.result.oneFace).toBe(false);
    expect(held.multiStreak).toBe(1);
  });
});
