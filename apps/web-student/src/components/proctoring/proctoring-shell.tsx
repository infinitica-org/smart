'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  ProctoringCheckpointResponseSchema,
  PROCTORING_SNAPSHOT_INTERVAL_MS,
  PROCTORING_WARNING_LIMIT_DEFAULT,
  type ProctoringCheckpointResponse,
  type ProctoringViolationKind,
} from '@smart/contracts';
import { api } from '../../lib/api';
import {
  deviceFingerprintHash,
  isProctoringEnabled,
  signProctoringEvent,
} from '../../lib/proctoring/crypto';
import { releaseProctoringPreview } from '../../lib/proctoring/media';
import {
  enterAssessmentFullscreen,
  hidePlayerForFullscreen,
  lockAssessmentKeyboard,
  unlockAssessmentKeyboard,
} from '../../lib/proctoring/fullscreen';
import { attachProctorSensors } from '../../lib/proctoring/sensors';
import { createProctorIngest } from '../../lib/proctoring/ingest-queue';
import { uploadProctoringSnapshot } from '../../lib/proctoring/proctoring-snapshot-upload';
import { DisplayGate, FullscreenGate } from './fullscreen-gate';
import { hasExtendedDisplay } from '../../lib/proctoring/display';
import { OnboardingGate } from './onboarding-gate';
import { isFaceAlignmentKind, startLiveWebcamMonitor } from '../../lib/proctoring/live-webcam';
import { ProctorLiveProvider } from './proctor-live-context';
import {
  FaceAlignmentBlackout,
  INTEGRITY_LOCKOUT_SECONDS,
  IntegrityLockoutPanel,
  IntegrityWarningModal,
} from './integrity-notices';

export function ProctoringShell({
  attemptId,
  onLockTerminate,
  onReady,
  cameraEnabled = true,
  faceLiveCheck = false,
  kioskTitle,
  children,
}: {
  attemptId: string;
  /** Defaults to L1 `assessment.complete`. Skill-verify must pass its own settle. */
  onLockTerminate?: () => Promise<unknown>;
  /** After camera/fullscreen onboarding, or immediately when proctoring is off. */
  onReady?: () => void;
  /** When false, skip webcam capture and preview. Fullscreen and sensors stay on. */
  cameraEnabled?: boolean;
  /** Skill-verify: live one-face and lighting check before the form generates. */
  faceLiveCheck?: boolean;
  kioskTitle?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const enabled = isProctoringEnabled();
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const readyNotified = useRef(false);
  const notifyReady = useCallback(() => {
    if (readyNotified.current) return;
    readyNotified.current = true;
    onReadyRef.current?.();
  }, []);
  const [ready, setReady] = useState(!enabled);
  const [blocked, setBlocked] = useState(false);
  const [extendedDisplay, setExtendedDisplay] = useState(false);
  const [locked, setLocked] = useState(false);
  const [warnings, setWarnings] = useState({
    count: 0,
    limit: PROCTORING_WARNING_LIMIT_DEFAULT,
  });
  const [warningOpen, setWarningOpen] = useState(false);
  const [faceBlackout, setFaceBlackout] = useState(false);
  const [liveKind, setLiveKind] = useState<ProctoringViolationKind | null>(null);
  const [cameraSampled, setCameraSampled] = useState(false);
  const [previewHosted, setPreviewHosted] = useState(false);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(INTEGRITY_LOCKOUT_SECONDS);
  const terminatedRef = useRef(false);
  const secretRef = useRef('');
  const mediaRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const fallbackPreviewRef = useRef<HTMLVideoElement | null>(null);
  const kioskRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const onLockTerminateRef = useRef(onLockTerminate);
  onLockTerminateRef.current = onLockTerminate;

  const terminateIfLocked = useCallback(
    (isLocked: boolean) => {
      if (!isLocked || terminatedRef.current) return;
      terminatedRef.current = true;
      const finish = onLockTerminateRef.current
        ? onLockTerminateRef.current()
        : api.assessment.complete({ attemptId });
      void finish.catch(() => {
        terminatedRef.current = false;
      });
    },
    [attemptId],
  );
  const terminateIfLockedRef = useRef(terminateIfLocked);
  terminateIfLockedRef.current = terminateIfLocked;

  const applyCheckpointResult = useCallback((result: ProctoringCheckpointResponse) => {
    setLocked(result.locked);
    setWarnings({ count: result.warningCount, limit: result.warningLimit });
    if (result.newViolations.length > 0 && !result.locked) {
      const kind = result.newViolations[result.newViolations.length - 1];
      if (kind && isFaceAlignmentKind(kind)) setFaceBlackout(true);
      else setWarningOpen(true);
    }
    terminateIfLockedRef.current(result.locked);
  }, []);
  const dismissWarning = useCallback(() => setWarningOpen(false), []);
  const dismissFaceBlackout = useCallback(() => setFaceBlackout(false), []);

  const bindPreview = useCallback((el: HTMLVideoElement | null) => {
    if (el) {
      previewRef.current = el;
      setPreviewHosted(true);
      if (mediaRef.current) {
        el.srcObject = mediaRef.current;
        void el.play().catch(() => undefined);
      }
      return;
    }
    previewRef.current = null;
    setPreviewHosted(false);
  }, []);

  const report = useCallback(
    async (kind: ProctoringViolationKind) => {
      const secret = secretRef.current;
      if (!secret) return;
      try {
        const nonce = await api.proctoring.nonce(attemptId);
        const signature = await signProctoringEvent(secret, attemptId, nonce.nonce, kind);
        const snap = await api.proctoring.ingest({
          attemptId,
          kind,
          occurredAt: new Date().toISOString(),
          nonce: nonce.nonce,
          signature,
        });
        setLocked(snap.locked);
        setWarnings({ count: snap.warningCount, limit: snap.warningLimit });
        if (snap.warningCount > 0 && !snap.locked) {
          if (isFaceAlignmentKind(kind)) setFaceBlackout(true);
          else setWarningOpen(true);
        }
        terminateIfLocked(snap.locked);
      } catch {
        // Local preventDefault still applied; ingest must not crash the player.
      }
    },
    [attemptId, terminateIfLocked],
  );

  const reportRef = useRef(report);
  reportRef.current = report;
  const ingestRef = useRef(
    createProctorIngest({
      getSecret: () => secretRef.current,
      send: (kind) => reportRef.current(kind),
    }),
  );

  useEffect(() => {
    if (!enabled || !ready || locked) return undefined;
    let cancelled = false;
    let detach: () => void = () => undefined;

    const applyFullscreen = (fromEvent: boolean) => {
      const inFs = Boolean(document.fullscreenElement);
      if (inFs) {
        setBlocked((prev) => (prev ? false : prev));
        void lockAssessmentKeyboard();
        return;
      }
      unlockAssessmentKeyboard();
      setBlocked((prev) => (prev ? prev : true));
      if (fromEvent) ingestRef.current.report('FULLSCREEN_EXIT');
    };

    detach = attachProctorSensors((kind) => ingestRef.current.report(kind), {
      listenFullscreen: false,
    });
    applyFullscreen(false);

    const onFs = () => applyFullscreen(true);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);

    void (async () => {
      try {
        const snap = await api.proctoring.snapshot(attemptId);
        if (cancelled) return;
        secretRef.current = snap.hmacSecret ?? '';
        setLocked(snap.locked);
        setWarnings({ count: snap.warningCount, limit: snap.warningLimit });
        if (snap.warningCount > 0 && !snap.locked) setWarningOpen(true);
        terminateIfLockedRef.current(snap.locked);
        await api.proctoring.fingerprint({
          attemptId,
          fingerprintHash: deviceFingerprintHash(),
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
        });
        await ingestRef.current.flush();
        applyFullscreen(false);
      } catch {
        if (!cancelled) applyFullscreen(false);
      }
    })();

    const ping = window.setInterval(
      () => void api.proctoring.ping(attemptId).catch(() => undefined),
      15_000,
    );
    let snapshotBusy = false;
    const checkpoint = window.setInterval(() => {
      if (!cameraEnabled || snapshotBusy) return;
      const video = previewRef.current ?? fallbackPreviewRef.current;
      if (!video || video.videoWidth === 0) return;
      snapshotBusy = true;
      void uploadProctoringSnapshot(attemptId, video)
        .then(async (uploaded) => {
          if (!uploaded.ok) return;
          const raw = await api.proctoring.checkpoint({
            attemptId,
            objectKey: uploaded.objectKey,
          });
          const parsed = ProctoringCheckpointResponseSchema.safeParse(raw);
          if (parsed.success) applyCheckpointResult(parsed.data);
        })
        .catch(() => undefined)
        .finally(() => {
          snapshotBusy = false;
        });
    }, PROCTORING_SNAPSHOT_INTERVAL_MS);
    return () => {
      cancelled = true;
      detach();
      unlockAssessmentKeyboard();
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      window.clearInterval(ping);
      window.clearInterval(checkpoint);
    };
  }, [applyCheckpointResult, attemptId, cameraEnabled, enabled, ready, locked]);

  useEffect(() => {
    if (!enabled || !ready || locked || !cameraEnabled) return undefined;
    const monitor = startLiveWebcamMonitor({
      getVideo: () => previewRef.current ?? fallbackPreviewRef.current,
      onViolation: (kind) => ingestRef.current.report(kind),
      onSample: (kind) => {
        setLiveKind(kind);
        setCameraSampled(true);
        if (isFaceAlignmentKind(kind)) setFaceBlackout(true);
      },
    });
    void monitor.tick();
    return () => monitor.stop();
  }, [attemptId, cameraEnabled, enabled, ready, locked]);

  useEffect(() => {
    if (!enabled || !ready || locked) return undefined;
    let flagged = false;
    const tick = () => {
      const extra = hasExtendedDisplay();
      setExtendedDisplay(extra);
      if (extra && !flagged) {
        flagged = true;
        ingestRef.current.report('TECHNICAL_INTERRUPTION');
      }
      if (!extra) flagged = false;
    };
    tick();
    const id = window.setInterval(tick, 1500);
    return () => window.clearInterval(id);
  }, [enabled, ready, locked]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled) notifyReady();
  }, [enabled, notifyReady]);

  const releaseMedia = useCallback(() => {
    releaseProctoringPreview(previewRef.current, mediaRef.current);
    releaseProctoringPreview(fallbackPreviewRef.current, null);
    mediaRef.current = null;
  }, []);

  useEffect(() => {
    if (!locked) return undefined;
    releaseMedia();
    unlockAssessmentKeyboard();
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    setLockSecondsLeft(INTEGRITY_LOCKOUT_SECONDS);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const left = Math.max(
        0,
        INTEGRITY_LOCKOUT_SECONDS - Math.floor((Date.now() - started) / 1000),
      );
      setLockSecondsLeft(left);
      if (left > 0) return;
      window.clearInterval(tick);
      router.replace('/assessment');
    }, 250);
    return () => window.clearInterval(tick);
  }, [locked, releaseMedia, router]);

  useEffect(() => {
    return () => {
      releaseMedia();
    };
  }, [releaseMedia]);

  useEffect(() => {
    if (!cameraEnabled || !ready || !mediaRef.current) return;
    const hosted = previewRef.current;
    const fallback = fallbackPreviewRef.current;
    if (hosted) hosted.srcObject = mediaRef.current;
    else if (fallback) fallback.srcObject = mediaRef.current;
  }, [cameraEnabled, ready, previewHosted]);

  const prepareMicForSpeech = useCallback(() => {
    const stream = mediaRef.current;
    if (!stream) return;
    for (const track of stream.getAudioTracks()) {
      track.stop();
      stream.removeTrack(track);
    }
  }, []);

  if (!enabled) return children;
  if (!mounted) return null;

  const hideExam = hidePlayerForFullscreen(blocked || extendedDisplay);
  const liveValue = {
    cameraEnabled,
    liveKind,
    sampled: cameraSampled,
    warningCount: warnings.count,
    warningLimit: warnings.limit,
    bindPreview,
    prepareMicForSpeech,
  };
  const kiosk = (
    <ProctorLiveProvider value={liveValue}>
      <div
        ref={kioskRef}
        className="fixed inset-0 h-full overflow-hidden bg-black"
        style={{ zIndex: 2147483646, overscrollBehavior: 'none', touchAction: 'manipulation' }}
      >
        {!ready ? (
          <div className="flex h-full min-h-full flex-col">
            <OnboardingGate
              attemptId={attemptId}
              fullscreenRootRef={kioskRef}
              cameraEnabled={cameraEnabled}
              faceLiveCheck={faceLiveCheck}
              kioskTitle={kioskTitle}
              onPassed={(stream) => {
                mediaRef.current = stream;
                if (cameraEnabled && previewRef.current && stream) {
                  previewRef.current.srcObject = stream;
                }
                setReady(true);
                setBlocked(!document.fullscreenElement);
                notifyReady();
              }}
            />
          </div>
        ) : locked ? (
          <IntegrityLockoutPanel limit={warnings.limit} secondsLeft={lockSecondsLeft} />
        ) : (
          <>
            <div
              className={hideExam ? 'hidden' : 'relative flex h-full min-h-full w-full flex-col'}
              aria-hidden={hideExam}
            >
              <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
              {cameraEnabled && !previewHosted ? (
                <video
                  ref={fallbackPreviewRef}
                  className="pointer-events-none absolute right-6 bottom-6 z-40 h-36 w-52 rounded-md border border-white/20 object-cover"
                  muted
                  playsInline
                  autoPlay
                  aria-label="Proctoring camera preview"
                />
              ) : null}
            </div>
            {faceBlackout ? (
              <FaceAlignmentBlackout liveKind={liveKind} onDismiss={dismissFaceBlackout} />
            ) : null}
            {warningOpen && !faceBlackout ? (
              <IntegrityWarningModal
                count={warnings.count}
                limit={warnings.limit}
                onDismiss={dismissWarning}
              />
            ) : null}
            <FullscreenGate
              blocked={blocked && !extendedDisplay}
              onResume={() => {
                void enterAssessmentFullscreen(kioskRef.current).then((ok) => setBlocked(!ok));
              }}
            />
            <DisplayGate blocked={extendedDisplay} />
          </>
        )}
      </div>
    </ProctorLiveProvider>
  );

  return createPortal(kiosk, document.body);
}
