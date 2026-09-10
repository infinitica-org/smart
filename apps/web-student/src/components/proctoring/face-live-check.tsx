'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Alert, Button } from '@smart/ui';
import {
  FACE_CUTOUT,
  captureVideoFrame,
  emptyOvalHoldState,
  evaluateDetectedFaces,
  ovalBrightness,
  stepOvalHold,
  type FaceCheckResult,
  type OvalHoldState,
} from '../../lib/proctoring/face-check';
import {
  detectionsToCoverBoxes,
  getBlazeFaceDetector,
} from '../../lib/proctoring/mediapipe-face-detector';

const TICK_MS = 150;

async function sampleFaceCheck(
  video: HTMLVideoElement,
  hold: OvalHoldState,
): Promise<{ result: FaceCheckResult; hold: OvalHoldState } | null> {
  if (
    video.readyState < 2 ||
    video.videoWidth === 0 ||
    video.videoHeight === 0 ||
    video.paused ||
    video.ended
  ) {
    return null;
  }
  const cover = captureVideoFrame(video, 192, 108, 'cover');
  if (!cover) return null;
  const detector = await getBlazeFaceDetector();
  const boxes = detectionsToCoverBoxes(detector, video, performance.now());
  const nextHold = stepOvalHold(hold, boxes);
  return {
    result: evaluateDetectedFaces(boxes, ovalBrightness(cover), nextHold),
    hold: nextHold,
  };
}

export function FaceLiveCheck({
  stream,
  onPassed,
  onFailMessage,
  busy = false,
}: {
  stream: MediaStream;
  onPassed: (sample: FaceCheckResult) => void | Promise<void>;
  onFailMessage?: (message: string) => void;
  busy?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const maskId = useId().replace(/:/g, '');
  const holdRef = useRef(emptyOvalHoldState());
  const [result, setResult] = useState<FaceCheckResult | null>(null);

  useEffect(() => {
    void getBlazeFaceDetector();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    holdRef.current = emptyOvalHoldState();
    video.srcObject = stream;
    void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      void sampleFaceCheck(video, holdRef.current).then((next) => {
        if (cancelled || !next) return;
        holdRef.current = next.hold;
        setResult(next.result);
        onFailMessage?.(next.result.message);
      });
    }, TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [onFailMessage]);

  const verified = Boolean(result?.ok && result.oneFace && result.faceCount === 1 && result.fillOk);

  const continueToAssessment = () => {
    const video = videoRef.current;
    if (!video) return;
    void sampleFaceCheck(video, holdRef.current).then((next) => {
      if (!next) return;
      holdRef.current = next.hold;
      const check = next.result;
      if (
        !check ||
        check.faceCount !== 1 ||
        !check.oneFace ||
        !check.lightingOk ||
        !check.fillOk ||
        !check.ok
      ) {
        if (check) setResult(check);
        return;
      }
      void onPassed(check);
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
        <video
          ref={videoRef}
          className="aspect-video w-full object-cover"
          muted
          playsInline
          autoPlay
          aria-label="Face check camera preview"
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <mask id={maskId}>
              <rect width="100" height="100" fill="white" />
              <ellipse
                cx={FACE_CUTOUT.cx * 100}
                cy={FACE_CUTOUT.cy * 100}
                rx={FACE_CUTOUT.rx * 100}
                ry={FACE_CUTOUT.ry * 100}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100" height="100" fill="rgba(4,8,12,0.72)" mask={`url(#${maskId})`} />
          <ellipse
            cx={FACE_CUTOUT.cx * 100}
            cy={FACE_CUTOUT.cy * 100}
            rx={FACE_CUTOUT.rx * 100}
            ry={FACE_CUTOUT.ry * 100}
            fill="none"
            stroke={verified ? '#5eead4' : 'rgba(255,255,255,0.85)'}
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs font-medium text-white/90">
          Place your face in the oval
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <CheckRow
          ok={Boolean(result?.oneFace && result.faceCount === 1)}
          label="Only one face visible"
        />
        <CheckRow ok={Boolean(result?.fillOk)} label="Whole face in the oval" />
        <CheckRow ok={Boolean(result?.lightingOk)} label="Face is clearly lit" />
      </ul>
      {result && !verified ? (
        <Alert tone="warning" title="Adjust your setup">
          {result.message}
        </Alert>
      ) : verified ? (
        <Alert tone="success" title="Face verified">
          One clearly lit face is in the oval. Continue when you are ready.
        </Alert>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          Sit still and fill the oval with only your face.
        </p>
      )}
      <Button
        type="button"
        disabled={!verified || busy}
        className="w-full bg-teal text-ink hover:bg-teal/90"
        onClick={continueToAssessment}
      >
        {busy ? 'Starting…' : 'Enter the challenge'}
      </Button>
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        ok
          ? 'border-teal-400/30 bg-teal-500/10 text-teal-200'
          : 'border-white/10 bg-white/5 text-white/60'
      }`}
    >
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
          ok ? 'bg-teal-400 text-ink' : 'bg-white/10'
        }`}
        aria-hidden
      >
        {ok ? <Check className="size-3.5 stroke-[3]" /> : null}
      </span>
      {ok ? 'Ready: ' : 'Needed: '}
      {label}
    </li>
  );
}
