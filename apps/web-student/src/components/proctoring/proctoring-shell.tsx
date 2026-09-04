'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { BlobWsPayload, ProctoringViolationKind } from '@smart/contracts';
import { Alert } from '@smart/ui';
import { api } from '../../lib/api';
import {
  deviceFingerprintHash,
  isProctoringEnabled,
  signProctoringEvent,
} from '../../lib/proctoring/crypto';
import { BlobHud } from './blob-hud';
import { FullscreenGate } from './fullscreen-gate';
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
  const [blob, setBlob] = useState<BlobWsPayload | null>(null);
  const [locked, setLocked] = useState(false);
  const secretRef = useRef('');
  const lastRef = useRef<Record<string, number>>({});

  const report = useCallback(
    async (kind: ProctoringViolationKind) => {
      const now = Date.now();
      if (now - (lastRef.current[kind] ?? 0) < 1500) return;
      lastRef.current[kind] = now;
      try {
        const nonce = await api.proctoring.nonce(attemptId);
        const signature = await signProctoringEvent(
          secretRef.current,
          attemptId,
          nonce.nonce,
          kind,
        );
        const snap = await api.proctoring.ingest({
          attemptId,
          kind,
          occurredAt: new Date().toISOString(),
          nonce: nonce.nonce,
          signature,
        });
        setLocked(snap.locked);
      } catch {
        // Player must not die if telemetry fails.
      }
    },
    [attemptId],
  );

  useEffect(() => {
    if (!enabled || !ready) return undefined;
    let cancelled = false;
    void (async () => {
      const snap = await api.proctoring.snapshot(attemptId);
      if (cancelled) return;
      secretRef.current = snap.hmacSecret ?? '';
      setLocked(snap.locked);
      await api.proctoring.fingerprint({
        attemptId,
        fingerprintHash: deviceFingerprintHash(),
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
      });
    })();

    const onFs = () => {
      const fs = Boolean(document.fullscreenElement);
      setBlocked(!fs);
      if (!fs) void report('FULLSCREEN_EXIT');
    };
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
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onCopy);
    document.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      void report('RIGHT_CLICK');
    });
    void document.documentElement.requestFullscreen?.().catch(() => setBlocked(true));
    const ping = window.setInterval(
      () => void api.proctoring.ping(attemptId).catch(() => undefined),
      15_000,
    );
    const blobPoll = window.setInterval(() => {
      void api.proctoring
        .blob(attemptId)
        .then((payload) => setBlob(payload))
        .catch(() => undefined);
    }, 2000);
    const checkpoint = window.setInterval(() => {
      void api.proctoring
        .checkpoint({ attemptId, objectKey: `stub:${attemptId}:${Date.now()}` })
        .catch(() => undefined);
    }, 18_000);
    return () => {
      cancelled = true;
      window.clearInterval(ping);
      window.clearInterval(blobPoll);
      window.clearInterval(checkpoint);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('copy', onCopy);
    };
  }, [attemptId, enabled, ready, report]);

  if (!enabled) return children;
  if (!ready) {
    return <OnboardingGate attemptId={attemptId} onPassed={() => setReady(true)} />;
  }

  return (
    <div className={blocked || locked ? 'invisible' : undefined}>
      {locked ? (
        <Alert tone="danger" title="Session locked" className="mb-4">
          Warning limit reached. Your answers are kept — submit to finish. A reviewer will check
          integrity; this does not automatically void your attempt.
        </Alert>
      ) : null}
      {children}
      <FullscreenGate
        blocked={blocked && !locked}
        onResume={() => void document.documentElement.requestFullscreen?.()}
      />
      <BlobHud payload={blob} />
    </div>
  );
}
