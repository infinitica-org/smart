'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PROCTORING_WARNING_LIMIT_DEFAULT, type ProctoringViolationKind } from '@smart/contracts';
import { Alert } from '@smart/ui';
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
import { DisplayGate, FullscreenGate } from './fullscreen-gate';
import { hasExtendedDisplay } from '../../lib/proctoring/display';
import { OnboardingGate } from './onboarding-gate';

export function ProctoringShell({
  attemptId,
  onLockTerminate,
  onReady,
  children,
}: {
  attemptId: string;
  /** Defaults to L1 `assessment.complete`. Skill-verify must pass its own settle. */
  onLockTerminate?: () => Promise<unknown>;
  /** After camera/fullscreen onboarding, or immediately when proctoring is off. */
  onReady?: () => void;
  children: ReactNode;
}) {
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
  const terminatedRef = useRef(false);
  const secretRef = useRef('');
  const mediaRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
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
    const checkpoint = window.setInterval(() => {
      void api.proctoring
        .checkpoint({ attemptId, objectKey: `stub:${attemptId}:${Date.now()}` })
        .catch(() => undefined);
    }, 18_000);
    return () => {
      cancelled = true;
      detach();
      unlockAssessmentKeyboard();
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      window.clearInterval(ping);
      window.clearInterval(checkpoint);
    };
  }, [attemptId, enabled, ready, locked]);

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
    mediaRef.current = null;
  }, []);

  useEffect(() => {
    if (!locked) return undefined;
    releaseMedia();
    unlockAssessmentKeyboard();
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    return undefined;
  }, [locked, releaseMedia]);

  useEffect(() => {
    return () => {
      releaseMedia();
    };
  }, [releaseMedia]);

  useEffect(() => {
    if (!ready || !previewRef.current || !mediaRef.current) return;
    previewRef.current.srcObject = mediaRef.current;
  }, [ready]);

  if (!enabled) return children;
  if (!mounted) return null;

  const hideExam = hidePlayerForFullscreen(blocked || extendedDisplay);
  const kiosk = (
    <div
      ref={kioskRef}
      className="fixed inset-0 overflow-auto bg-black"
      style={{ zIndex: 2147483646, overscrollBehavior: 'none', touchAction: 'manipulation' }}
    >
      {!ready ? (
        <OnboardingGate
          attemptId={attemptId}
          fullscreenRootRef={kioskRef}
          onPassed={(stream) => {
            mediaRef.current = stream;
            if (previewRef.current) {
              previewRef.current.srcObject = stream;
            }
            setReady(true);
            setBlocked(!document.fullscreenElement);
            notifyReady();
          }}
        />
      ) : locked ? (
        <div className="flex h-full items-center justify-center p-6">
          <Alert tone="danger" title="Test terminated" className="max-w-md">
            You reached {String(warnings.limit)} integrity warnings. This attempt is closed and
            flagged for review. Answers already saved are kept.
          </Alert>
        </div>
      ) : (
        <>
          <div className={hideExam ? 'hidden' : undefined} aria-hidden={hideExam}>
            {warnings.count > 0 ? (
              <p className="px-4 pt-3 text-xs text-amber-300">
                Integrity warnings {String(warnings.count)}/{String(warnings.limit)}
              </p>
            ) : null}
            {children}
            <video
              ref={previewRef}
              className="pointer-events-none fixed right-4 bottom-4 z-40 h-24 w-32 rounded-md border border-white/20 object-cover"
              muted
              playsInline
              autoPlay
              aria-label="Proctoring camera preview"
            />
          </div>
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
  );

  return createPortal(kiosk, document.body);
}
