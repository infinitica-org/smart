/** Browser camera/mic helpers for L1 onboarding. Consent must be recorded first (ADR-0014). */

export function lumaFromRgba(data: Uint8ClampedArray): number {
  const pixels = data.length / 4;
  if (pixels === 0) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
  }
  return sum / pixels;
}

export function rmsPercentFromTimeDomain(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  let sum = 0;
  for (const sample of bytes) {
    const centered = (sample - 128) / 128;
    sum += centered * centered;
  }
  return Math.min(100, Math.sqrt(sum / bytes.length) * 100);
}

export async function requestProctoringMedia(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot open the camera and microphone.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: true,
    });
  } catch {
    throw new Error('Allow camera and microphone to continue this assessment.');
  }
}

export function stopProctoringMedia(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}

/** Drop the preview element and stop tracks (lock, submit, or leave). */
export function releaseProctoringPreview(
  video: HTMLVideoElement | null,
  stream: MediaStream | null,
): void {
  if (video) video.srcObject = null;
  stopProctoringMedia(stream);
}

export async function sampleEnvironment(stream: MediaStream): Promise<{
  brightness: number;
  audioRmsPercent: number;
  faceCentered: boolean;
}> {
  const brightness = await sampleBrightness(stream);
  const audioRmsPercent = await sampleAudioRms(stream);
  const faceCentered = stream.getVideoTracks().some((track) => track.readyState === 'live');
  return { brightness, audioRmsPercent, faceCentered };
}

async function sampleBrightness(stream: MediaStream): Promise<number> {
  const track = stream.getVideoTracks()[0];
  if (!track) return 120;
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Camera preview failed.'));
    window.setTimeout(() => resolve(), 1500);
  });
  await video.play().catch(() => undefined);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx || video.videoWidth === 0) return 120;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return lumaFromRgba(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
}

async function sampleAudioRms(stream: MediaStream): Promise<number> {
  if (!stream.getAudioTracks().length) return 10;
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return 10;
  const context = new AudioCtx();
  try {
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const bytes = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(bytes);
    return rmsPercentFromTimeDomain(bytes);
  } finally {
    await context.close().catch(() => undefined);
  }
}
