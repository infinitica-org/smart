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
import { stopProctoringMedia } from '../../lib/proctoring/media';
import {
  enterAssessmentFullscreen,
  hidePlayerForFullscreen,
  lockAssessmentKeyboard,
  unlockAssessmentKeyboard,
} from '../../lib/proctoring/fullscreen';
import { DisplayGate, FullscreenGate } from './fullscreen-gate';
import { hasExtendedDisplay } from '../../lib/proctoring/display';
import { OnboardingGate } from './onboarding-gate';

export function ProctoringShell({
  attemptId,
  children,
}: {
  attemptId: string;
  children: ReactNode;
}) {
  const enabled = isProctoringEnabled();
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
  const lastRef = useRef<Record<string, number>>({});
  const mediaRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const kioskRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const terminateIfLocked = useCallback(
    (isLocked: boolean) => {
      if (!isLocked || terminatedRef.current) return;
      terminatedRef.current = true;
      void api.assessment.complete({ attemptId }).catch(() => {
        terminatedRef.current = false;
      });
    },
    [attemptId],
  );

  const report = useCallback(
    async (kind: ProctoringViolationKind) => {
      const now = Date.now();
      if (now - (lastRef.current[kind] ?? 0) < 1500) return;
      lastRef.current[kind] = now;
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

  useEffect(() => {
    if (!enabled || !ready) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await api.proctoring.snapshot(attemptId);
        if (cancelled) return;
        secretRef.current = snap.hmacSecret ?? '';
        setLocked(snap.locked);
        setWarnings({ count: snap.warningCount, limit: snap.warningLimit });
        terminateIfLocked(snap.locked);
        await api.proctoring.fingerprint({
          attemptId,
          fingerprintHash: deviceFingerprintHash(),
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
        });
        if (!cancelled) setBlocked(!document.fullscreenElement);
      } catch {
        if (!cancelled) setBlocked(!document.fullscreenElement);
      }
    })();
    const onVis = () => {
      if (document.hidden) void report('TAB_BLUR');
    };
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'i')
      ) {
        event.preventDefault();
        void report('DEVTOOLS_OPEN');
      }
      if (event.key === 'PrintScreen') {
        event.preventDefault();
        void report('PRINT_SCREEN');
      }
    };
    const onCopy = (event: Event) => {
      event.preventDefault();
      void report('COPY_ATTEMPT');
    };
    const onContext = (event: Event) => {
      event.preventDefault();
      void report('RIGHT_CLICK');
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onCopy);
    document.addEventListener('contextmenu', onContext);

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
      unlockAssessmentKeyboard();
      window.clearInterval(ping);
      window.clearInterval(checkpoint);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onCopy);
      document.removeEventListener('contextmenu', onContext);
    };
  }, [attemptId, enabled, ready, report, terminateIfLocked]);

  useEffect(() => {
    if (!enabled || !ready) return undefined;
    const syncFullscreen = () => {
      const inFs = Boolean(document.fullscreenElement);
      if (inFs) {
        setBlocked(false);
        void lockAssessmentKeyboard();
        return;
      }
      unlockAssessmentKeyboard();
      setBlocked(true);
      void report('FULLSCREEN_EXIT');
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    };
  }, [enabled, ready, report]);

  useEffect(() => {
    if (!enabled || !ready) return undefined;
    let flagged = false;
    const tick = () => {
      const extra = hasExtendedDisplay();
      setExtendedDisplay(extra);
      if (extra && !flagged) {
        flagged = true;
        void report('TECHNICAL_INTERRUPTION');
      }
      if (!extra) flagged = false;
    };
    tick();
    const id = window.setInterval(tick, 1500);
    return () => window.clearInterval(id);
  }, [enabled, ready, report]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      stopProctoringMedia(mediaRef.current);
      mediaRef.current = null;
    };
  }, []);

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
