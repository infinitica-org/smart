'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CompleteProjectDefenseResponse,
  ProjectDefenseSttMode,
  ProjectDto,
  StartProjectDefenseResponse,
} from '@smart/contracts';
import { Alert, Badge, Button, Timer } from '@smart/ui';
import { Bot, CheckCircle2, Loader2, Mic, ShieldCheck, Volume2 } from 'lucide-react';
import { CameraIntegrityDock } from '@/components/proctoring/camera-integrity-dock';
import { useProctorLive } from '@/components/proctoring/proctor-live-context';
import { isFaceAlignmentKind } from '@/lib/proctoring/live-webcam';
import { projectDefenseTimerProps } from '@/lib/project-defense-timer';
import { isSmartApiError } from '@smart/api-client';
import { api } from '../../lib/api';
import { uploadDefenseTurnAudio } from '../../lib/project-defense-audio-upload';
import { resolveDefenseReplyAction } from '../../lib/project-defense-reply-action';
import {
  createConversationCapture,
  getBrowserSpeechRecognition,
  supportsMicrophoneCapture,
  playAgentAudioUrl,
  speakAgentPromptAsync,
  stopAgentSpeech,
  waitBeforeListening,
  type ConversationCapture,
} from '../../lib/project-defense-speech';

type Phase = 'idle' | 'agent_speaking' | 'listening' | 'processing' | 'ready' | 'done';

function stackTags(stack: string): string[] {
  return stack
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function playAgentMessage(text: string, audioUrl: string | null | undefined): Promise<void> {
  stopAgentSpeech();
  if (audioUrl) {
    try {
      await playAgentAudioUrl(audioUrl);
      return;
    } catch {
      /* fall through to browser TTS */
    }
  }
  await speakAgentPromptAsync(text);
}

export function ProjectDefenseInterviewPanel({
  project,
  startResponse,
  onComplete,
  onClose,
  registerAbort,
}: {
  project: ProjectDto;
  startResponse: StartProjectDefenseResponse;
  onComplete?: (result: CompleteProjectDefenseResponse) => void;
  onClose: () => void;
  registerAbort?: (abort: () => void) => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentQuestion, setAgentQuestion] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [maxDurationSeconds, setMaxDurationSeconds] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompleteProjectDefenseResponse | null>(null);
  const captureRef = useRef<ConversationCapture | null>(null);
  const transcriptRef = useRef('');
  const submittingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const interviewAbortRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const completingRef = useRef(false);
  const intentionalLeaveRef = useRef(false);
  const sttModeRef = useRef<ProjectDefenseSttMode>('browser');
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const { prepareMicForSpeech, warningCount, liveKind } = useProctorLive();
  const prevWarningCountRef = useRef(0);

  const tags = useMemo(() => stackTags(project.stack), [project.stack]);

  const timerSession =
    startedAt && maxDurationSeconds !== null && secondsRemaining !== null
      ? { startedAt, maxDurationSeconds, secondsRemaining }
      : null;

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const cleanupCapture = useCallback(() => {
    captureRef.current?.abort();
    captureRef.current = null;
    stopAgentSpeech();
  }, []);

  const interruptAgentSpeech = useCallback(() => {
    stopAgentSpeech();
    captureRef.current?.abort();
    captureRef.current = null;
    submittingRef.current = false;
    setPhase((current) =>
      current === 'agent_speaking' || current === 'listening' ? 'ready' : current,
    );
  }, []);

  const abortInterview = useCallback(() => {
    intentionalLeaveRef.current = true;
    interviewAbortRef.current = true;
    cleanupCapture();
    setPhase((current) =>
      current === 'agent_speaking' || current === 'listening' ? 'ready' : current,
    );
  }, [cleanupCapture]);

  const completeInterview = useCallback(async () => {
    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId || completingRef.current) return;
    if (intentionalLeaveRef.current || interviewAbortRef.current) return;
    if (!hasSpokenRef.current) return;

    completingRef.current = true;
    cleanupCapture();
    setPhase('processing');

    try {
      const completed = await api.projects.completeDefense(project.projectId, {
        sessionId: activeSessionId,
      });
      setResult(completed);
      setPhase('done');
      onComplete?.(completed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish interview.');
      completingRef.current = false;
      setPhase('ready');
    }
  }, [cleanupCapture, onComplete, project.projectId]);

  const finishListeningRef = useRef<() => Promise<void>>(async () => {});
  const askThenListenRef = useRef<
    (text: string, audioUrl: string | null | undefined) => Promise<void>
  >(async () => {});

  const startListening = useCallback(async () => {
    if (submittingRef.current || completingRef.current) return;
    if (secondsRemaining !== null && secondsRemaining <= 0) return;

    cleanupCapture();
    setError(null);
    setLiveTranscript('');
    transcriptRef.current = '';
    setPhase('listening');

    prepareMicForSpeech();

    const capture = await createConversationCapture({
      sttMode: sttModeRef.current,
      onTranscriptUpdate: (text) => {
        transcriptRef.current = text;
        setLiveTranscript(text);
        if (text.trim()) setError(null);
      },
      onRecognitionError: (message) => {
        setError(message);
      },
      onUtteranceComplete: () => {
        void finishListeningRef.current();
      },
    });

    if (!capture) {
      setError('Microphone access is required. Allow the mic and try again.');
      setPhase('ready');
      return;
    }

    captureRef.current = capture;
  }, [cleanupCapture, prepareMicForSpeech, secondsRemaining]);

  const askThenListen = useCallback(
    async (text: string, audioUrl: string | null | undefined) => {
      if (completingRef.current || interviewAbortRef.current) return;
      setAgentQuestion(text);
      setPhase('agent_speaking');
      await playAgentMessage(text, audioUrl);
      if (completingRef.current || interviewAbortRef.current) return;
      if (secondsRemaining !== null && secondsRemaining <= 0) return;
      await waitBeforeListening();
      if (interviewAbortRef.current) return;
      await startListening();
    },
    [secondsRemaining, startListening],
  );

  /** Closing statement from the examiner — play it, then grade; do not reopen the mic. */
  const playClosingThenComplete = useCallback(
    async (text: string, audioUrl: string | null | undefined) => {
      if (completingRef.current || interviewAbortRef.current) return;
      setAgentQuestion(text);
      setPhase('agent_speaking');
      await playAgentMessage(text, audioUrl);
      if (interviewAbortRef.current) return;
      await completeInterview();
    },
    [completeInterview],
  );

  const submitTurn = useCallback(
    async (transcript: string, blob: Blob) => {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId || completingRef.current) return;

      setPhase('processing');
      setLiveTranscript(transcript);

      try {
        const serverStt = sttModeRef.current === 'server';
        let audioObjectKey: string | undefined;
        if (serverStt && blob.size > 0) {
          const upload = await uploadDefenseTurnAudio(project.projectId, blob);
          if (upload.ok) {
            audioObjectKey = upload.objectKey;
          } else {
            setError(upload.message);
            submittingRef.current = false;
            if (secondsRemaining !== null && secondsRemaining > 0) {
              await startListening();
            }
            return;
          }
        }

        if (!transcript.trim() && !(serverStt && audioObjectKey)) {
          setError(
            serverStt
              ? 'We did not receive your recording. The mic will open again — speak clearly when you are ready.'
              : 'We did not catch any speech. The mic will open again — speak clearly when you are ready.',
          );
          submittingRef.current = false;
          if (secondsRemaining !== null && secondsRemaining > 0) {
            await startListening();
          }
          return;
        }

        hasSpokenRef.current = true;

        const reply = await api.projects.defenseReply(project.projectId, {
          sessionId: activeSessionId,
          audioObjectKey,
          transcript: transcript.trim() || undefined,
        });
        setSecondsRemaining(reply.session.secondsRemaining);
        setError(null);

        const nextStep = resolveDefenseReplyAction({
          isFinalTurn: reply.isFinalTurn,
          questionText: reply.questionText,
          secondsRemaining: reply.session.secondsRemaining,
        });

        submittingRef.current = false;

        if (nextStep.action === 'close_then_grade') {
          if (nextStep.questionText) {
            await playClosingThenComplete(nextStep.questionText, reply.questionAudioUrl);
          } else {
            await completeInterview();
          }
          return;
        }

        if (nextStep.action === 'grade') {
          await completeInterview();
          return;
        }

        await askThenListen(nextStep.questionText, reply.questionAudioUrl);
      } catch (err) {
        const rateLimited = isSmartApiError(err) && err.statusCode === 429;
        const timeUp = isSmartApiError(err) && err.code === 'time_limit';
        setError(
          rateLimited
            ? 'Too many requests — wait a few seconds, then tap Try again below.'
            : timeUp
              ? 'Interview time is up — finishing your session.'
              : err instanceof Error
                ? err.message
                : 'Could not process your answer.',
        );
        submittingRef.current = false;
        if (timeUp && hasSpokenRef.current) {
          await completeInterview();
        } else if (!rateLimited && secondsRemaining !== null && secondsRemaining > 0) {
          await startListening();
        }
      }
    },
    [
      askThenListen,
      completeInterview,
      playClosingThenComplete,
      project.projectId,
      secondsRemaining,
      startListening,
    ],
  );

  const finishListening = useCallback(async () => {
    const capture = captureRef.current;
    if (!capture || submittingRef.current || completingRef.current) return;
    submittingRef.current = true;
    captureRef.current = null;
    const { transcript, blob } = await capture.finish();
    await submitTurn(transcript, blob);
  }, [submitTurn]);

  useEffect(() => {
    finishListeningRef.current = finishListening;
  }, [finishListening]);

  useEffect(() => {
    askThenListenRef.current = askThenListen;
  }, [askThenListen]);

  useEffect(() => {
    registerAbort?.(abortInterview);
  }, [abortInterview, registerAbort]);

  useEffect(() => {
    if (warningCount > prevWarningCountRef.current) {
      interruptAgentSpeech();
    }
    prevWarningCountRef.current = warningCount;
  }, [interruptAgentSpeech, warningCount]);

  useEffect(() => {
    if (isFaceAlignmentKind(liveKind)) {
      interruptAgentSpeech();
    }
  }, [interruptAgentSpeech, liveKind]);

  useEffect(() => {
    intentionalLeaveRef.current = false;
    interviewAbortRef.current = false;

    if (!supportsMicrophoneCapture()) {
      setError('Voice capture needs a browser with microphone support (Chrome, Edge, or Safari).');
      return () => {
        interviewAbortRef.current = true;
        cleanupCapture();
      };
    }

    const res = startResponse;
    sttModeRef.current = res.sttMode;
    if (res.sttMode === 'browser' && !getBrowserSpeechRecognition()) {
      setError(
        'Live transcription needs Chrome or Edge. Ask your admin to enable server speech-to-text.',
      );
      setPhase('idle');
      return () => {
        interviewAbortRef.current = true;
        cleanupCapture();
      };
    }

    setError(null);
    setPhase('processing');
    setSessionId(res.session.sessionId);
    sessionIdRef.current = res.session.sessionId;
    setStartedAt(res.session.startedAt);
    setMaxDurationSeconds(res.session.maxDurationSeconds);
    setSecondsRemaining(res.session.secondsRemaining);
    hasSpokenRef.current = res.session.turns.some((turn) => turn.role === 'CANDIDATE');

    void (async () => {
      if (interviewAbortRef.current) return;
      await askThenListenRef.current(res.openingPromptText, res.openingPromptAudioUrl);
    })();

    return () => {
      interviewAbortRef.current = true;
      cleanupCapture();
    };
  }, [cleanupCapture, startResponse]);

  useEffect(() => {
    if (!startedAt || !maxDurationSeconds) return;

    const tick = () => {
      const remaining = Math.max(
        0,
        maxDurationSeconds - Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
      );
      setSecondsRemaining(remaining);

      if (remaining <= 0 && hasSpokenRef.current && !completingRef.current) {
        if (phase === 'listening' && captureRef.current) {
          void finishListeningRef.current();
        } else if (phase !== 'processing' && phase !== 'agent_speaking') {
          void completeInterview();
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 1_000);
    return () => window.clearInterval(id);
  }, [completeInterview, maxDurationSeconds, phase, startedAt]);

  const replayQuestion = () => {
    if (agentQuestion) void speakAgentPromptAsync(agentQuestion);
  };

  if (phase === 'done' || result) {
    const status = result?.projectStatus ?? project.status;
    const verified = status === 'VERIFIED';
    return (
      <div className="flex h-full min-h-[100dvh] w-full flex-col bg-[var(--background)] text-[var(--text-primary)]">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface)] px-6 py-3">
          <h1 className="truncate pr-3 text-lg font-semibold tracking-tight">
            Project defense — {project.title}
          </h1>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <section className="w-full max-w-lg rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-8 text-center md:p-10">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                verified ? 'bg-brand-500/15 text-brand-700' : 'bg-amber-500/10 text-amber-600'
              }`}
            >
              {verified ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <ShieldCheck className="h-8 w-8" />
              )}
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">
              {verified ? 'Project verified' : 'Under human review'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
              {verified
                ? 'Your ownership interview is complete and your project is verified.'
                : 'Your interview is complete. A reviewer will follow up — you are not auto-rejected.'}
            </p>
            <Button type="button" className="mt-8" variant="primary" onClick={onClose}>
              Back to profile
            </Button>
          </section>
        </div>
      </div>
    );
  }

  const statusLabel =
    phase === 'agent_speaking'
      ? 'Interviewer is speaking…'
      : phase === 'listening'
        ? 'Listening — speak when ready'
        : phase === 'processing'
          ? 'Thinking about your answer…'
          : phase === 'ready'
            ? 'Opening mic…'
            : 'Starting interview…';

  return (
    <div className="flex h-full min-h-[100dvh] w-full flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface)] px-6 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            Project defense — {project.title}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Voice ownership interview</p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-medium text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          disabled={phase === 'processing'}
          onClick={() => setExitConfirmOpen(true)}
        >
          Leave interview
        </button>
      </header>

      {exitConfirmOpen ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="defense-exit-title"
        >
          <div className="w-full max-w-md space-y-4 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-xl">
            <div className="space-y-2">
              <h2
                id="defense-exit-title"
                className="text-lg font-semibold text-[var(--text-primary)]"
              >
                Leave this interview?
              </h2>
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                Leaving discards this attempt. When you come back you will get a fresh interview
                with a new timer and opening question. Tab switches may still count as integrity
                warnings if you leave fullscreen.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="primary" onClick={() => setExitConfirmOpen(false)}>
                Stay in interview
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setExitConfirmOpen(false);
                  intentionalLeaveRef.current = true;
                  interviewAbortRef.current = true;
                  cleanupCapture();
                  onClose();
                }}
              >
                Leave anyway
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-hidden p-6 lg:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge variant="outline">Voice interview</Badge>
            <span className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
              {phase === 'processing' || phase === 'agent_speaking' ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand-700" />
              ) : phase === 'listening' ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-700" />
                </span>
              ) : (
                <Mic className="h-4 w-4 text-brand-700" />
              )}
              {statusLabel}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            {agentQuestion ? (
              <article className="w-full shrink-0 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-5">
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-700">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Interviewer
                      </p>
                      <button
                        type="button"
                        onClick={replayQuestion}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        Replay
                      </button>
                    </div>
                    <p className="mt-3 text-base leading-relaxed lg:text-lg">{agentQuestion}</p>
                  </div>
                </div>
              </article>
            ) : null}

            {phase === 'listening' ? (
              <div className="flex min-h-[12rem] w-full flex-1 flex-col rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-5">
                <p className="shrink-0 text-sm font-medium text-[var(--text-primary)]">
                  Your response
                </p>
                <p
                  className={
                    liveTranscript
                      ? 'mt-3 flex-1 overflow-y-auto text-base leading-relaxed text-[var(--text-primary)]'
                      : 'mt-3 flex-1 text-base leading-relaxed text-[var(--text-muted)]'
                  }
                >
                  {liveTranscript ||
                    (startResponse.sttMode === 'server'
                      ? "Recording — speak clearly, then tap “I'm done speaking”."
                      : 'Speak clearly — your words appear here as you talk.')}
                </p>
              </div>
            ) : null}

            {phase === 'processing' ? (
              <div className="flex flex-1 items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--surface-border)] bg-[var(--surface-muted)] px-6 py-10">
                <Loader2 className="h-6 w-6 shrink-0 animate-spin text-brand-700" />
                <p className="text-sm text-[var(--text-muted)]">Processing your answer…</p>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--surface-border)] pt-4">
            {phase === 'listening' ? (
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => void finishListening()}
              >
                I&apos;m done speaking
              </Button>
            ) : null}

            {error && phase !== 'processing' && phase !== 'listening' ? (
              <div className="space-y-3">
                <Alert tone="danger" title="Could not continue">
                  {error}
                </Alert>
                <Button type="button" variant="secondary" onClick={() => void startListening()}>
                  Try again
                </Button>
              </div>
            ) : null}
          </div>
        </main>

        <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto lg:w-[22rem]">
          <CameraIntegrityDock compact />

          {timerSession ? (
            <div className="shrink-0 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Time remaining
              </p>
              <Timer {...projectDefenseTimerProps(timerSession)} />
            </div>
          ) : null}

          {tags.length > 0 ? (
            <div className="shrink-0 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Skills to defend
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-[11px] text-[var(--text-primary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="shrink-0 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Tips
            </p>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--text-muted)]">
              <li>Answer in your own words with concrete examples from the project.</li>
              <li>Stay in fullscreen — tab switches count as warnings.</li>
              <li>Tap “I&apos;m done speaking” when you finish each answer.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
