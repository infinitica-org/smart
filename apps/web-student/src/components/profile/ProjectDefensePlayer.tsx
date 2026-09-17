'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PrepareProjectDefenseResponse,
  ProjectDto,
  StartProjectDefenseResponse,
} from '@smart/contracts';
import { Alert } from '@smart/ui';
import { Loader2 } from 'lucide-react';
import { ProctoringShell } from '@/components/proctoring/proctoring-shell';
import { ProjectDefenseInterviewPanel } from '@/components/profile/ProjectDefenseInterviewPanel';
import { api } from '@/lib/api';
import { releaseProctoringSession } from '@/lib/proctoring/fullscreen';
import { projectDefenseRuleItems } from '@/lib/proctoring/project-defense-rules';

export function ProjectDefensePlayer({
  project,
  onClose,
  onComplete,
}: {
  project: ProjectDto;
  onClose: () => void;
  onComplete?: () => void;
}) {
  const [prepared, setPrepared] = useState<PrepareProjectDefenseResponse | null>(null);
  const [started, setStarted] = useState<StartProjectDefenseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const activateStarted = useRef(false);
  const leavingRef = useRef(false);
  const abortInterviewRef = useRef<(() => void) | null>(null);
  const preparedRef = useRef(prepared);
  const startedRef = useRef(started);
  const prepareSeqRef = useRef(0);
  preparedRef.current = prepared;
  startedRef.current = started;

  useEffect(() => {
    const seq = ++prepareSeqRef.current;
    void (async () => {
      try {
        const next = await api.projects.prepareDefense(project.projectId);
        if (seq !== prepareSeqRef.current) return;
        setPrepared(next);
      } catch (err) {
        if (seq !== prepareSeqRef.current) return;
        setError(err instanceof Error ? err.message : 'Could not prepare interview.');
      }
    })();
  }, [project.projectId]);

  const activateInterview = useCallback(async () => {
    if (activateStarted.current || started) return;
    activateStarted.current = true;
    setActivating(true);
    try {
      const next = await api.projects.startDefense(project.projectId);
      setStarted(next);
      setError(null);
    } catch (err) {
      activateStarted.current = false;
      setError(err instanceof Error ? err.message : 'Could not start interview.');
    } finally {
      setActivating(false);
    }
  }, [project.projectId, started]);

  const onLockTerminate = useCallback(async () => {
    if (leavingRef.current) return;
    abortInterviewRef.current?.();
    const sessionId =
      startedRef.current?.session.sessionId ?? preparedRef.current?.sessionId ?? null;
    try {
      if (sessionId) {
        await api.projects.completeDefense(project.projectId, {
          sessionId,
          integrityTerminated: true,
        });
        onComplete?.();
      } else {
        await api.projects.abandonDefense(project.projectId);
      }
    } catch {
      try {
        await api.projects.abandonDefense(project.projectId);
      } catch {
        /* best effort */
      }
    }
    await releaseProctoringSession();
  }, [onComplete, project.projectId]);

  const handleClose = useCallback(async () => {
    leavingRef.current = true;
    abortInterviewRef.current?.();
    try {
      await api.projects.abandonDefense(project.projectId);
    } catch {
      /* best effort — prepare also clears stale sessions on next entry */
    }
    await releaseProctoringSession();
    onClose();
  }, [onClose, project.projectId]);

  if (error && !prepared) {
    return (
      <div className="flex h-full min-h-[100dvh] items-center justify-center bg-[var(--background)] p-6">
        <Alert tone="danger" title="Interview unavailable">
          {error}
        </Alert>
      </div>
    );
  }

  if (!prepared) {
    return (
      <div className="flex h-full min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[var(--background)] px-6 text-[var(--text-primary)]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-700" />
        <p className="text-sm text-[var(--text-muted)]">Preparing secure interview…</p>
      </div>
    );
  }

  return (
    <ProctoringShell
      attemptId={prepared.sessionId}
      kioskTitle={`Project defense — ${project.title}`}
      cameraEnabled
      faceLiveCheck
      onReady={() => {
        void activateInterview();
      }}
      onLockTerminate={onLockTerminate}
    >
      {!started || activating ? (
        <div className="flex h-full min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 text-[var(--text-primary)]">
          {error ? (
            <Alert tone="danger" title="Could not start">
              {error}
            </Alert>
          ) : null}
          <Loader2 className="h-8 w-8 animate-spin text-brand-700" />
          <p className="text-sm text-[var(--text-muted)]">
            {activating ? 'Starting interview clock…' : 'Complete the integrity checks to begin.'}
          </p>
          <ul className="max-w-md list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-[var(--text-muted)]">
            {projectDefenseRuleItems()
              .slice(0, 3)
              .map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
          </ul>
        </div>
      ) : (
        <ProjectDefenseInterviewPanel
          project={project}
          startResponse={started}
          onClose={() => {
            void handleClose();
          }}
          onComplete={() => {
            void releaseProctoringSession();
            onComplete?.();
          }}
          registerAbort={(abort) => {
            abortInterviewRef.current = abort;
          }}
        />
      )}
    </ProctoringShell>
  );
}
