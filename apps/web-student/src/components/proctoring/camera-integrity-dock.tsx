'use client';

import { AlertTriangle, Check } from 'lucide-react';
import { cameraIntegrityCopy } from '../../lib/proctoring/live-webcam';
import { useProctorLive } from './proctor-live-context';

export function CameraIntegrityDock({ compact = false }: { compact?: boolean }) {
  const { cameraEnabled, bindPreview, liveKind, sampled, warningCount, warningLimit } =
    useProctorLive();
  if (!cameraEnabled) return null;

  const status = sampled
    ? cameraIntegrityCopy(liveKind)
    : { ok: false, title: 'Checking camera', detail: 'Hold still while we read the frame.' };

  return (
    <section
      className={
        compact
          ? 'flex shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)]'
          : 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)]'
      }
      aria-label="Live camera integrity"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Live camera
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">
          {String(warningCount)} / {String(warningLimit)} warnings
        </p>
      </div>
      <video
        ref={bindPreview}
        className="aspect-video w-full bg-black object-cover"
        muted
        playsInline
        autoPlay
        aria-label="Proctoring camera preview"
      />
      <div
        className={
          status.ok
            ? 'flex items-start gap-2 border-t border-emerald-500/25 bg-emerald-500/10 px-3 py-3'
            : 'flex items-start gap-2 border-t border-amber-400/30 bg-amber-400/10 px-3 py-3'
        }
        role="status"
        aria-live="polite"
      >
        {status.ok ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">{status.title}</p>
          <p className="text-xs text-[var(--text-muted)]">{status.detail}</p>
        </div>
      </div>
    </section>
  );
}
