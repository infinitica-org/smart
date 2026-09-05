/** Client-side face/lighting pre-check (skin-blob + luma). No frames leave the browser. */

export const FACE_LUMA_MIN = 70;
export const FACE_LUMA_MAX = 210;
/** Full-frame: ignore specks. A second person must still clear this. */
export const MIN_FACE_PIXEL_RATIO = 0.012;
/** Oval must be this full of face pixels or the face is only clipping the cutout. */
export const MIN_OVAL_FILL = 0.24;
export const MIN_INNER_FILL = 0.16;
export const FACE_INNER_SCALE = 0.65;
export const MIN_QUADRANT_FILL = 0.08;
export const MIN_FILLED_QUADRANTS = 3;

/** Normalized ellipse. Analysis and the on-screen hole share these values. */
export const FACE_CUTOUT = {
  cx: 0.5,
  cy: 0.46,
  rx: 0.23,
  ry: 0.38,
} as const;

export type FaceCheckResult = {
  faceCount: number;
  brightness: number;
  oneFace: boolean;
  lightingOk: boolean;
  fillOk: boolean;
  ok: boolean;
  message: string;
};

type Blob = {
  size: number;
  lumaSum: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function rgbToYCbCr(r: number, g: number, b: number): { y: number; cb: number; cr: number } {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return { y, cb, cr };
}

export function isSkinTone(r: number, g: number, b: number): boolean {
  const { y, cb, cr } = rgbToYCbCr(r, g, b);
  if (y < 32 || y > 245) return false;
  const classic = cb >= 77 && cb <= 135 && cr >= 122 && cr <= 185;
  const deeper = y <= 155 && cr > cb + 4 && cr >= 118 && cr <= 190 && cb >= 68 && cb <= 140;
  return classic || deeper;
}

function dilateMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let on = 0;
      for (let dy = -1; dy <= 1 && !on; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (mask[ny * width + nx]) {
            on = 1;
            break;
          }
        }
      }
      out[y * width + x] = on;
    }
  }
  return out;
}

function collectBlobs(mask: Uint8Array, luma: Float32Array, width: number, height: number): Blob[] {
  const seen = new Uint8Array(mask.length);
  const blobs: Blob[] = [];
  const stack: number[] = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    let size = 0;
    let lumaSum = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      size += 1;
      lumaSum += luma[i] ?? 0;
      const x = i % width;
      const y = (i - x) / width;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (!mask[n] || seen[n]) continue;
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    blobs.push({ size, lumaSum, minX, minY, maxX, maxY });
  }
  return blobs;
}

function blobCenterX(blob: Blob): number {
  return (blob.minX + blob.maxX) / 2;
}

function shouldMerge(a: Blob, b: Blob, width: number, height: number): boolean {
  if (Math.abs(blobCenterX(a) - blobCenterX(b)) > width * 0.18) return false;
  const gap = Math.max(3, Math.round(Math.min(width, height) * 0.05));
  const ax0 = a.minX - gap;
  const ay0 = a.minY - gap;
  const ax1 = a.maxX + gap;
  const ay1 = a.maxY + gap;
  const overlap = ax0 <= b.maxX && ax1 >= b.minX && ay0 <= b.maxY && ay1 >= b.minY;
  if (overlap) return true;

  const aw = a.maxX - a.minX + 1;
  const bw = b.maxX - b.minX + 1;
  const ah = a.maxY - a.minY + 1;
  const bh = b.maxY - b.minY + 1;
  const xOverlap = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) + 1;
  const yGap = Math.max(0, Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY));
  const alignedVertically = xOverlap > 0.35 * Math.min(aw, bw) && yGap <= 0.25 * Math.max(ah, bh);
  return alignedVertically;
}

function mergePair(a: Blob, b: Blob): Blob {
  return {
    size: a.size + b.size,
    lumaSum: a.lumaSum + b.lumaSum,
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

function clusterBlobs(blobs: Blob[], width: number, height: number): Blob[] {
  const items = [...blobs];
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const left = items[i];
        const right = items[j];
        if (!left || !right) continue;
        if (!shouldMerge(left, right, width, height)) continue;
        items[i] = mergePair(left, right);
        items.splice(j, 1);
        merged = true;
        break outer;
      }
    }
  }
  return items;
}

export function isInsideFaceCutout(
  x: number,
  y: number,
  width: number,
  height: number,
  scale = 1,
): boolean {
  const nx = (x + 0.5) / width - FACE_CUTOUT.cx;
  const ny = (y + 0.5) / height - FACE_CUTOUT.cy;
  const rx = FACE_CUTOUT.rx * scale;
  const ry = FACE_CUTOUT.ry * scale;
  return (nx * nx) / (rx * rx) + (ny * ny) / (ry * ry) <= 1;
}

export function minFacePixels(
  width: number,
  height: number,
  samplePixels = width * height,
): number {
  return Math.max(8, Math.floor(samplePixels * MIN_FACE_PIXEL_RATIO));
}

export function countDominantFaces(
  blobs: Blob[],
  width: number,
  height: number,
  samplePixels = width * height,
): Blob[] {
  const minPx = minFacePixels(width, height, samplePixels);
  const clustered = clusterBlobs(
    blobs.filter((blob) => blob.size >= minPx),
    width,
    height,
  );
  clustered.sort((a, b) => b.size - a.size);
  return clustered;
}

type OvalScan = {
  cutoutPixels: number;
  ovalSkin: number;
  innerPixels: number;
  innerSkin: number;
  cutoutLuma: number;
  quadTotal: [number, number, number, number];
  quadSkin: [number, number, number, number];
};

function emptyOvalScan(): OvalScan {
  return {
    cutoutPixels: 0,
    ovalSkin: 0,
    innerPixels: 0,
    innerSkin: 0,
    cutoutLuma: 0,
    quadTotal: [0, 0, 0, 0],
    quadSkin: [0, 0, 0, 0],
  };
}

function scanFrame(image: ImageData, withOval: boolean): { faces: Blob[]; oval: OvalScan } {
  const { data, width, height } = image;
  const pixels = width * height;
  const mask = new Uint8Array(pixels);
  const luma = new Float32Array(pixels);
  const oval = emptyOvalScan();
  const midX = FACE_CUTOUT.cx * width;
  const midY = FACE_CUTOUT.cy * height;
  for (let p = 0, i = 0; p < pixels; p += 1, i += 4) {
    const x = p % width;
    const y = (p - x) / width;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const { y: lumaY } = rgbToYCbCr(r, g, b);
    luma[p] = lumaY;
    const skin = isSkinTone(r, g, b);
    mask[p] = skin ? 1 : 0;
    if (!withOval) continue;
    const inOval = isInsideFaceCutout(x, y, width, height);
    if (inOval) {
      oval.cutoutPixels += 1;
      const qi = (y + 0.5 >= midY ? 2 : 0) + (x + 0.5 >= midX ? 1 : 0);
      oval.quadTotal[qi] = (oval.quadTotal[qi] ?? 0) + 1;
      if (skin) {
        oval.cutoutLuma += lumaY;
        oval.ovalSkin += 1;
        oval.quadSkin[qi] = (oval.quadSkin[qi] ?? 0) + 1;
      }
    }
    if (isInsideFaceCutout(x, y, width, height, FACE_INNER_SCALE)) {
      oval.innerPixels += 1;
      if (skin) oval.innerSkin += 1;
    }
  }
  const closed = dilateMask(mask, width, height);
  const raw = collectBlobs(closed, luma, width, height);
  return { faces: countDominantFaces(raw, width, height, pixels), oval };
}

function ovalFillOk(oval: OvalScan): boolean {
  const ovalFill = oval.cutoutPixels > 0 ? oval.ovalSkin / oval.cutoutPixels : 0;
  const innerFill = oval.innerPixels > 0 ? oval.innerSkin / oval.innerPixels : 0;
  let filledQuads = 0;
  for (let i = 0; i < 4; i += 1) {
    const total = oval.quadTotal[i] ?? 0;
    const skin = oval.quadSkin[i] ?? 0;
    if (total > 0 && skin / total >= MIN_QUADRANT_FILL) filledQuads += 1;
  }
  return (
    ovalFill >= MIN_OVAL_FILL && innerFill >= MIN_INNER_FILL && filledQuads >= MIN_FILLED_QUADRANTS
  );
}

export type NormalizedFaceBox = {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
};

export function isInsideFaceCutoutNorm(nx: number, ny: number, scale = 1): boolean {
  const dx = nx - FACE_CUTOUT.cx;
  const dy = ny - FACE_CUTOUT.cy;
  const rx = FACE_CUTOUT.rx * scale;
  const ry = FACE_CUTOUT.ry * scale;
  if (rx <= 0 || ry <= 0) return false;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

export function mapPixelBoxToCover(
  box: { originX: number; originY: number; width: number; height: number },
  videoW: number,
  videoH: number,
): NormalizedFaceBox {
  const cover = coverSourceRect(videoW, videoH, 16, 9);
  return {
    xMin: (box.originX - cover.sx) / cover.sw,
    yMin: (box.originY - cover.sy) / cover.sh,
    xMax: (box.originX + box.width - cover.sx) / cover.sw,
    yMax: (box.originY + box.height - cover.sy) / cover.sh,
  };
}

/** True when BlazeFace's box is a whole face seated in the oval, not a clip. */
export function faceFillsOval(box: NormalizedFaceBox, held = false): boolean {
  const cx = (box.xMin + box.xMax) / 2;
  const cy = (box.yMin + box.yMax) / 2;
  if (!isInsideFaceCutoutNorm(cx, cy, held ? 0.84 : 0.72)) return false;
  const bw = box.xMax - box.xMin;
  const bh = box.yMax - box.yMin;
  const sizeFactor = held ? 0.46 : 0.54;
  if (bw < FACE_CUTOUT.rx * 2 * sizeFactor) return false;
  if (bh < FACE_CUTOUT.ry * 2 * sizeFactor) return false;
  const corners: Array<[number, number]> = [
    [box.xMin, box.yMin],
    [box.xMax, box.yMin],
    [box.xMin, box.yMax],
    [box.xMax, box.yMax],
  ];
  const pad = held ? 1.58 : 1.4;
  const inside = corners.filter(([x, y]) => isInsideFaceCutoutNorm(x, y, pad)).length;
  return inside >= (held ? 2 : 3);
}

export function smoothFaceBox(
  previous: NormalizedFaceBox | null,
  next: NormalizedFaceBox,
  alpha = 0.38,
): NormalizedFaceBox {
  if (!previous) return next;
  return {
    xMin: previous.xMin * (1 - alpha) + next.xMin * alpha,
    yMin: previous.yMin * (1 - alpha) + next.yMin * alpha,
    xMax: previous.xMax * (1 - alpha) + next.xMax * alpha,
    yMax: previous.yMax * (1 - alpha) + next.yMax * alpha,
  };
}

export type OvalHoldState = {
  smoothed: NormalizedFaceBox | null;
  fillOk: boolean;
  passStreak: number;
  failStreak: number;
};

export function emptyOvalHoldState(): OvalHoldState {
  return { smoothed: null, fillOk: false, passStreak: 0, failStreak: 0 };
}

const FILL_ENTER_FRAMES = 2;
const FILL_EXIT_FRAMES = 6;

export function stepOvalHold(
  state: OvalHoldState,
  boxes: readonly NormalizedFaceBox[],
): OvalHoldState {
  if (boxes.length !== 1 || !boxes[0]) {
    return emptyOvalHoldState();
  }
  const smoothed = smoothFaceBox(state.smoothed, boxes[0]);
  if (state.fillOk) {
    if (faceFillsOval(smoothed, true)) {
      return { smoothed, fillOk: true, passStreak: 0, failStreak: 0 };
    }
    const failStreak = state.failStreak + 1;
    return {
      smoothed,
      fillOk: failStreak < FILL_EXIT_FRAMES,
      passStreak: 0,
      failStreak,
    };
  }
  if (faceFillsOval(smoothed, false)) {
    const passStreak = state.passStreak + 1;
    return {
      smoothed,
      fillOk: passStreak >= FILL_ENTER_FRAMES,
      passStreak,
      failStreak: 0,
    };
  }
  return { smoothed, fillOk: false, passStreak: 0, failStreak: 0 };
}

function resultFromParts(faceCount: number, brightness: number, fillOk: boolean): FaceCheckResult {
  const oneFace = faceCount === 1;
  const lightingOk = brightness >= FACE_LUMA_MIN && brightness <= FACE_LUMA_MAX;
  const ok = oneFace && lightingOk && fillOk;
  let message = 'Center your whole face in the oval.';
  if (faceCount === 0) message = 'We cannot see a face. Sit in front of the camera.';
  else if (faceCount > 1) message = 'Only one face should be visible, including outside the oval.';
  else if (!fillOk) {
    message = 'Move closer and center your whole face in the oval. A partial face is not enough.';
  } else if (!lightingOk && brightness < FACE_LUMA_MIN) {
    message = 'Lighting is too dark. Face a window or lamp.';
  } else if (!lightingOk) {
    message = 'Lighting is too harsh. Soften the light on your face.';
  } else {
    message = 'Face check passed.';
  }
  return { faceCount, brightness, oneFace, lightingOk, fillOk, ok, message };
}

/** Combine BlazeFace boxes (full camera) with oval lighting from a cover-cropped frame. */
export function evaluateDetectedFaces(
  boxes: readonly NormalizedFaceBox[],
  brightness: number,
  hold?: OvalHoldState,
): FaceCheckResult {
  const fillOk = hold
    ? hold.fillOk
    : boxes.length === 1 && boxes[0]
      ? faceFillsOval(boxes[0])
      : false;
  return resultFromParts(boxes.length, brightness, fillOk);
}

export function ovalBrightness(image: ImageData): number {
  const oval = scanFrame(image, true).oval;
  return oval.ovalSkin > 0 ? oval.cutoutLuma / oval.ovalSkin : 0;
}

export function evaluateFaceImageData(image: ImageData, crowd?: ImageData): FaceCheckResult {
  const fillScan = scanFrame(image, true);
  const crowdScan = crowd ? scanFrame(crowd, false) : fillScan;
  const brightness =
    fillScan.oval.ovalSkin > 0 ? fillScan.oval.cutoutLuma / fillScan.oval.ovalSkin : 0;
  return resultFromParts(crowdScan.faces.length, brightness, ovalFillOk(fillScan.oval));
}

/** Source rectangle that matches CSS `object-fit: cover` into the destination. */
export function coverSourceRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const sw = dstW / scale;
  const sh = dstH / scale;
  return {
    sx: (srcW - sw) / 2,
    sy: (srcH - sh) / 2,
    sw,
    sh,
  };
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  width = 192,
  height = 108,
  fit: 'cover' | 'fill' = 'cover',
): ImageData | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  if (fit === 'fill') {
    ctx.drawImage(video, 0, 0, width, height);
  } else {
    const src = coverSourceRect(video.videoWidth, video.videoHeight, width, height);
    ctx.drawImage(video, src.sx, src.sy, src.sw, src.sh, 0, 0, width, height);
  }
  return ctx.getImageData(0, 0, width, height);
}

export function stabilizeFaceCheck(
  previous: FaceCheckResult | null,
  next: FaceCheckResult,
  multiStreak: number,
): { result: FaceCheckResult; multiStreak: number } {
  if (next.faceCount > 1) {
    return { result: next, multiStreak: multiStreak + 1 };
  }
  return { result: next, multiStreak: 0 };
}
